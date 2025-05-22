import type { APIRoute } from "astro";
import { randomUUID } from 'crypto';
import path from 'path';
import fs from 'fs/promises';
import matter from 'gray-matter';
import { readingNoteValidationSchema } from "../../content.config";
import { z } from "zod";
import { extractImageUrls, validateMarkdownImageAlt, validateImageUrls } from "../../utils/imageValidation";
import { sftpClient } from "../../utils/sftpClient";
import { triggerNetlifyBuild } from "../../utils/netlifyTrigger";
import { isAuthenticatedRequest, createUnauthorizedResponse } from "../../utils/apiAuth";

export const prerender = false;

// Schéma de validation intermédiaire pour le frontmatter (plus permissif que le schéma final)
const uploadFrontmatterSchema = readingNoteValidationSchema.partial()
  .extend({
    // Champs obligatoires même lors de l'upload
    bookTitle: z.string().min(1, "Le titre du livre est requis"),
    summary: z.string().min(10, "Le résumé doit contenir au moins 10 caractères"),
  });

// Répertoire temporaire pour stocker les fichiers téléchargés avant l'envoi SFTP
const TEMP_DIR = path.join(process.cwd(), 'temp-uploads');

// Réponse standardisée
interface UploadResponse {
  success: boolean;
  id?: string;
  path?: string;
  frontmatter?: Record<string, any>;
  errors?: string[];
  frontmatterErrors?: string[];
  imageErrors?: string[];
  buildTriggered?: boolean;
  buildMessage?: string;
}

/**
 * Crée le répertoire temporaire s'il n'existe pas
 */
async function ensureTempDir() {
  try {
    await fs.mkdir(TEMP_DIR, { recursive: true });
  } catch (error) {
    console.error('Erreur lors de la création du répertoire temporaire:', error);
  }
}

/**
 * Écrit un fichier dans le répertoire temporaire
 */
async function writeToTempFile(content: string, fileName: string): Promise<string> {
  await ensureTempDir();
  const filePath = path.join(TEMP_DIR, fileName);
  await fs.writeFile(filePath, content, 'utf-8');
  return filePath;
}

/**
 * Nettoie le fichier temporaire
 */
async function cleanupTempFile(filePath: string) {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    console.error('Erreur lors de la suppression du fichier temporaire:', error);
  }
}

/**
 * Route POST pour télécharger un fichier sur le serveur SFTP
 */
export const POST: APIRoute = async ({ request }) => {
  // Vérifier l'authentification
  if (!isAuthenticatedRequest(request)) {
    return createUnauthorizedResponse();
  }

  try {
    // Récupérer le fichier de la requête
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const directory = formData.get('directory') as string || '';
    const triggerBuild = formData.get('triggerBuild') === 'true';

    if (!file) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          errors: ["Aucun fichier n'a été fourni"] 
        } as UploadResponse),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Vérifier l'extension du fichier
    const validExtensions = ['.md', '.mdx'];
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    
    if (!validExtensions.includes(fileExtension)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          errors: ["Le fichier doit être au format Markdown (.md ou .mdx)"] 
        } as UploadResponse),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Générer un ID unique pour ce téléchargement
    const fileId = randomUUID();
    const fileName = `${fileId}${fileExtension}`;

    // Lire le contenu du fichier
    const fileContent = await file.text();
    
    // Analyser le frontmatter
    const { data: frontmatter, content } = matter(fileContent);
    
    // Résultat final de la validation
    const response: UploadResponse = {
      success: true,
      id: fileId,
      frontmatter,
      frontmatterErrors: [],
      imageErrors: []
    };

    // Valider le frontmatter avec le schéma intermédiaire
    try {
      uploadFrontmatterSchema.parse(frontmatter);
    } catch (err) {
      if (err instanceof z.ZodError) {
        response.frontmatterErrors = err.errors.map(e => `${e.path.join('.')}: ${e.message}`);
        response.success = false;
      }
    }
    
    // Extraire et valider les URLs d'images dans le contenu markdown
    const imageUrls = extractImageUrls(content);
    
    // Validation du texte alternatif des images
    const altValidation = await validateMarkdownImageAlt(content);
    if (!altValidation.valid) {
      response.imageErrors = [...(response.imageErrors || []), ...altValidation.errors];
      response.success = false;
    }
    
    // Validation des URLs d'images (domaines et accessibilité)
    if (imageUrls.length > 0) {
      const urlValidation = await validateImageUrls(imageUrls);
      if (!urlValidation.valid) {
        response.imageErrors = [...(response.imageErrors || []), ...urlValidation.errors];
        response.success = false;
      }
    }

    // Si la validation a échoué, retourner les erreurs
    if (!response.success) {
      // Regrouper toutes les erreurs
      const allErrors: string[] = [];
      if (response.frontmatterErrors && response.frontmatterErrors.length > 0) {
        allErrors.push("Problèmes dans les métadonnées:");
        allErrors.push(...response.frontmatterErrors);
      }
      
      if (response.imageErrors && response.imageErrors.length > 0) {
        allErrors.push("Problèmes avec les images:");
        allErrors.push(...response.imageErrors);
      }
      
      response.errors = allErrors;
      
      return new Response(
        JSON.stringify(response),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Écrire le fichier temporaire
    const tempFilePath = await writeToTempFile(fileContent, fileName);

    try {
      // Connecter au serveur SFTP
      await sftpClient.connect();
      
      // Téléverser le fichier
      const uploadResult = await sftpClient.uploadFile(tempFilePath, fileName, directory);
      
      if (!uploadResult.success) {
        throw new Error(uploadResult.error || "Échec de l'upload SFTP");
      }
      
      response.path = uploadResult.path;
      
      // Déclencher un build Netlify si demandé
      if (triggerBuild) {
        const buildResult = await triggerNetlifyBuild();
        response.buildTriggered = buildResult.success;
        response.buildMessage = buildResult.message;
      }
      
    } catch (error) {
      console.error("Erreur SFTP:", error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          errors: [`Erreur lors de l'upload SFTP: ${error}`] 
        } as UploadResponse),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    } finally {
      // Fermer la connexion SFTP
      await sftpClient.disconnect();
      
      // Nettoyer le fichier temporaire
      await cleanupTempFile(tempFilePath);
    }

    // Retourner la réponse de succès
    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Erreur lors du traitement du fichier:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        errors: ["Erreur lors du traitement du fichier", error] 
      } as UploadResponse),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Route GET pour vérifier l'état du service SFTP
 */
export const GET: APIRoute = async ({ request }) => {
  // Vérifier l'authentification
  if (!isAuthenticatedRequest(request)) {
    return createUnauthorizedResponse();
  }

  try {
    // Tenter de se connecter au serveur SFTP
    try {
      await sftpClient.connect();
      await sftpClient.disconnect();
      
      return new Response(
        JSON.stringify({
          success: true,
          message: "Connexion SFTP établie avec succès",
          environment: sftpClient.getEnvironment(),
          basePath: sftpClient.getBasePath()
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({
          success: false,
          message: `Impossible de se connecter au serveur SFTP: ${error}`,
          environment: sftpClient.getEnvironment(),
          basePath: sftpClient.getBasePath()
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error("Erreur lors de la vérification du service SFTP:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: `Erreur lors de la vérification du service SFTP: ${error}`
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
} 