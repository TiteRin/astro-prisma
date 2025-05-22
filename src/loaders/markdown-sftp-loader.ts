import type { Loader } from 'astro/loaders';
import Client from 'ssh2-sftp-client';
import path from 'path';
import matter from 'gray-matter';
import { kebabCase } from '../utils/functions';

import { createMarkdownProcessor, parseFrontmatter } from "@astrojs/markdown-remark";

/**
 * Options pour le loader Markdown SFTP
 */
export interface MarkdownSftpLoaderOptions {
  /** Configuration de connexion au serveur SFTP */
  connection: {
    host: string;
    port: number;
    username: string;
    password?: string;
    privateKey?: string | Buffer;
  };
  /** Chemin distant sur le serveur SFTP */
  remotePath: string;
  /** Fonction pour générer un ID à partir du chemin de fichier */
  generateId?: (filePath: string) => string;
}

/**
 * Crée un loader qui récupère des fichiers Markdown depuis un serveur SFTP
 * et les traite pour extraire le frontmatter et le contenu
 */
export function markdownSftpLoader(options: MarkdownSftpLoaderOptions): Loader {
  const { 
    connection, 
    remotePath, 
    generateId = defaultGenerateId 
  } = options;

  const validExtensions = ['.md', '.mdx'];

  return {
    name: 'markdown-sftp-loader',
    load: async ({ config, store, logger, parseData, generateDigest }) => {
      logger.info(`Loading Markdown from SFTP: ${connection.host}:${connection.port}${remotePath}`);
      
      const sftp = new Client();
      const processor = await createMarkdownProcessor(config.markdown);
      
      try {
        // Connexion au serveur SFTP
        await sftp.connect(connection);
        logger.info('Connected to SFTP server');
        
        // Liste les fichiers
        const files = await sftp.list(remotePath);
        
        // Filtrer les fichiers Markdown
        const markdownFiles = files.filter(file => 
          file.type === '-' && 
          validExtensions.includes(path.extname(file.name).toLowerCase())
        );
        
        logger.info(`Found ${markdownFiles.length} Markdown files`);

        // Vider le store pour éviter les fichiers obsolètes
        store.clear();
        
        // Traiter chaque fichier Markdown
        for (const file of markdownFiles) {
          const remoteFilePath = path.posix.join(remotePath, file.name);
          
          try {
            // Récupérer le contenu du fichier
            const content = await sftp.get(remoteFilePath);
            const markdownContent = content.toString();

            const parsedFrontmatter = parseFrontmatter(markdownContent);
            const frontmatter = parsedFrontmatter.frontmatter;
            const rendered = await processor.render(parsedFrontmatter.content ?? "");

                        
            // Déterminer l'ID du fichier à partir du titre du livre si disponible
            const id = generateId(frontmatter.bookTitle ?? file.name);
            
            // Analyser les données
            const data = await parseData({
              id,
              data: frontmatter as Record<string, unknown>,
            });
            
            // Générer un digest pour la détection des changements
            const digest = generateDigest(markdownContent);

            // Stocker l'entrée
            store.set({
              id,
              data,
              filePath: `src/content/remoteSummaries/${file.name}`,
              digest,
              rendered: {
                html: rendered.code,
                metadata: {
                  headings: rendered.metadata.headings,
                  frontmatter: frontmatter as Record<string, unknown>,
                },
              },
            });
            
            logger.info(`Successfully loaded Markdown: ${remoteFilePath}`);
          } catch (error) {
            logger.error(`Error processing Markdown ${remoteFilePath}: ${error}`);
          }
        }
      } catch (error) {
        logger.error(`SFTP connection error: ${error}`);
      } finally {
        // Fermer la connexion SFTP
        await sftp.end();
        logger.info('SFTP connection closed');
      }
    },
  };
}

/**
 * Génère un slug à partir du nom du fichier
 */
function defaultGenerateId(name: string): string {
  return kebabCase(name);
} 