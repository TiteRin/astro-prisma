import type { APIRoute } from "astro";
import matter from 'gray-matter';
import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { summaryValidationSchema } from "../../content.config.js";
import { z } from "zod";

export const prerender = false;

// Type pour la réponse du téléchargement
interface UploadResponse {
  success: boolean;
  id?: string;
  frontmatter?: Record<string, any>;
  errors?: string[];
}

// Créer le dossier temporaire s'il n'existe pas
async function ensureTempDir(tempDir: string): Promise<void> {
  try {
    await fs.mkdir(tempDir, { recursive: true });
  } catch (error) {
    console.error("Erreur lors de la création du dossier temporaire:", error);
    throw error;
  }
}

// Schéma de validation basique pour le frontmatter
const frontmatterSchema = z.object({
  bookTitle: z.string().optional(),
  bookAuthors: z.array(z.string()).optional(),
  publishedYear: z.number().optional(),
  tags: z.array(z.string()).optional(),
  summary: z.string().optional()
}).partial();

export const POST: APIRoute = async ({ request }) => {
  try {
    // Configurer le dossier temporaire
    const tempDir = path.join(process.cwd(), 'temp-uploads');
    await ensureTempDir(tempDir);

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
    const fileExtension = path.extname(file.name).toLowerCase();
    
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
    const tempFilePath = path.join(tempDir, `${fileId}${fileExtension}`);

    // Lire le contenu du fichier
    const fileContent = await file.text();
    
    // Analyser le frontmatter
    const { data: frontmatter, content } = matter(fileContent);
    
    // Valider le frontmatter de base (validation légère)
    try {
      frontmatterSchema.parse(frontmatter);
    } catch (err) {
      if (err instanceof z.ZodError) {
        const errors = err.errors.map(e => `${e.path.join('.')}: ${e.message}`);
        return new Response(
          JSON.stringify({ 
            success: false, 
            errors: ["Frontmatter invalide", ...errors] 
          } as UploadResponse),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Sauvegarder le fichier dans le dossier temporaire
    await fs.writeFile(tempFilePath, fileContent);

    // Renvoyer une réponse avec l'ID et les métadonnées du frontmatter
    return new Response(
      JSON.stringify({
        success: true,
        id: fileId,
        frontmatter
      } as UploadResponse),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Erreur lors du traitement du fichier:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        errors: ["Erreur lors du traitement du fichier"] 
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

    const tempDir = path.join(process.cwd(), 'temp-uploads');
    
    // Chercher le fichier avec cet ID (peut être .md ou .mdx)
    const files = await fs.readdir(tempDir);
    const targetFile = files.find(f => f.startsWith(fileId));
    
    if (!targetFile) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          errors: ["Fichier temporaire non trouvé"] 
        } as UploadResponse),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Lire le contenu du fichier
    const filePath = path.join(tempDir, targetFile);
    const fileContent = await fs.readFile(filePath, 'utf-8');
    
    // Extraire le frontmatter
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