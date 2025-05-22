import type { APIRoute } from "astro";
import matter from 'gray-matter';
import { randomUUID } from 'crypto';
import { readingNoteValidationSchema } from "../../content.config";
import { z } from "zod";
import { extractImageUrls, validateMarkdownImageAlt, validateImageUrls } from "../../utils/imageValidation";

export const prerender = false;

// Type pour la réponse du téléchargement
interface UploadResponse {
  success: boolean;
  id?: string;
  frontmatter?: Record<string, any>;
  errors?: string[];
  frontmatterErrors?: string[];
  imageErrors?: string[];
}

// Schéma de validation intermédiaire pour le frontmatter (plus permissif que le schéma final)
const uploadFrontmatterSchema = readingNoteValidationSchema.partial()
  .extend({
    // Champs obligatoires même lors de l'upload
    bookTitle: z.string().min(1, "Le titre du livre est requis"),
    summary: z.string().min(10, "Le résumé doit contenir au moins 10 caractères"),
  });

// Store for temporary files in memory
const tempFiles = new Map<string, string>();

export const POST: APIRoute = async ({ request }) => {
  try {
    // Récupérer le fichier de la requête
    const formData = await request.formData();
    const file = formData.get('file') as File;

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

    // Store the file content in memory
    tempFiles.set(fileId, fileContent);

    // If validation failed, indicate errors
    if (!response.success) {
      // Regroup all errors
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
    }

    // Return the response
    return new Response(
      JSON.stringify(response),
      { 
        status: response.success ? 200 : 400, 
        headers: { 'Content-Type': 'application/json' } 
      }
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

// Route GET pour récupérer les informations d'un fichier temporaire par son ID
export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const fileId = url.searchParams.get('id');
    
    if (!fileId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          errors: ["ID du fichier manquant"] 
        } as UploadResponse),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get the file content from memory
    const fileContent = tempFiles.get(fileId);
    
    if (!fileContent) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          errors: ["Fichier temporaire non trouvé"] 
        } as UploadResponse),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Extract the frontmatter
    const { data: frontmatter } = matter(fileContent);
    
    return new Response(
      JSON.stringify({
        success: true,
        id: fileId,
        frontmatter
      } as UploadResponse),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error("Erreur lors de la récupération du fichier:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        errors: ["Erreur lors de la récupération du fichier"] 
      } as UploadResponse),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
} 