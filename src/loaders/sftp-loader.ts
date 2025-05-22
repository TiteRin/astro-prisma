import type { Loader } from 'astro/loaders';
import Client from 'ssh2-sftp-client';
import path from 'path';

/**
 * Options pour le loader SFTP
 */
export interface SftpLoaderOptions {
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
  /** Modèle glob pour filtrer les fichiers (par défaut: '*') */
  pattern?: string;
  /** Liste des extensions de fichiers à traiter (par défaut: toutes) */
  extensions?: string[];
  /** Fonction pour générer un ID à partir du chemin de fichier */
  generateId?: (filePath: string) => string;
}

/**
 * Crée un loader qui récupère des fichiers depuis un serveur SFTP
 * 
 * @example
 * ```ts
 * const docs = defineCollection({
 *   loader: sftpLoader({
 *     connection: {
 *       host: 'example.com',
 *       port: 22,
 *       username: 'user',
 *       password: 'password'
 *     },
 *     remotePath: '/path/to/files',
 *     pattern: '**\/*.{md,json,yaml,yml}',
 *     extensions: ['.md', '.json', '.yaml', '.yml']
 *   }),
 *   schema: /* ... *\/
 * });
 * ```
 */
export function sftpLoader(options: SftpLoaderOptions): Loader {
  const { 
    connection, 
    remotePath, 
    pattern = '*',
    extensions = [], 
    generateId = defaultGenerateId 
  } = options;

  return {
    name: 'sftp-loader',
    load: async ({ store, logger, parseData, generateDigest }) => {
      logger.info(`Loading data from SFTP: ${connection.host}:${connection.port}${remotePath}`);
      
      const sftp = new Client();
      
      try {
        // Connexion au serveur SFTP
        await sftp.connect(connection);
        logger.info('Connected to SFTP server');
        
        // Liste les fichiers correspondant au modèle
        const files = await sftp.list(remotePath);
        
        // Filtrer les fichiers selon le pattern et les extensions
        const filteredFiles = files.filter(file => 
          filterFile(file, pattern, extensions)
        );
        
        logger.info(`Found ${filteredFiles.length} files matching pattern`);

        // Vider le store pour éviter les fichiers obsolètes
        store.clear();
        
        // Traiter chaque fichier
        for (const file of filteredFiles) {
          const remoteFilePath = path.posix.join(remotePath, file.name);
          
          try {
            // Récupérer le contenu du fichier
            const content = await sftp.get(remoteFilePath);
            
            // Déterminer l'ID du fichier
            const id = generateId(file.name);
            
            // Construire l'objet de données à stocker
            const rawData = content.toString();
            
            // Convertir la chaîne en objet pour le parseData
            let dataObject: Record<string, unknown>;
            
            // Essayer de parser en JSON si c'est du JSON
            try {
              dataObject = JSON.parse(rawData);
            } catch {
              // Sinon, utiliser comme contenu brut
              dataObject = { content: rawData };
            }
            
            const data = await parseData({
              id,
              data: dataObject,
            });
            
            // Générer un digest pour la détection des changements
            const digest = generateDigest(data);
            
            // Stocker l'entrée
            store.set({
              id,
              data,
              body: rawData,
              filePath: remoteFilePath,
              digest,
            });
            
            logger.info(`Successfully loaded file: ${remoteFilePath}`);
          } catch (error) {
            logger.error(`Error processing file ${remoteFilePath}: ${error}`);
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
 * Génère un ID à partir du chemin de fichier en supprimant l'extension
 */
function defaultGenerateId(filePath: string): string {
  return path.basename(filePath, path.extname(filePath));
}

/**
 * Filtre les fichiers en fonction du modèle et des extensions
 */
function filterFile(item: any, pattern: string, extensions: string[]): boolean {
  // Si c'est un dossier, l'inclure uniquement si le motif comprend des sous-dossiers
  if (item.type === 'd') {
    return pattern.includes('**');
  }
  
  // Si c'est un fichier, vérifier l'extension
  if (item.type === '-') {
    if (extensions.length === 0) return true;
    const ext = path.extname(item.name).toLowerCase();
    return extensions.includes(ext);
  }
  
  return false;
} 