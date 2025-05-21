import Client from 'ssh2-sftp-client';
import fs from 'fs';
import path from 'path';

export interface SFTPConfig {
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKeyPath?: string;
}

export interface SFTPUploadResult {
  success: boolean;
  path?: string;
  error?: string;
}

/**
 * Connexion et gestion des transferts vers le serveur SFTP
 */
class SFTPClient {
  private client: Client;
  private config: SFTPConfig;
  private environment: string;
  private basePath: string;

  constructor() {
    this.client = new Client();
    
    // Configuration par défaut
    this.config = {
      host: import.meta.env.SFTP_HOST || '',
      port: parseInt(import.meta.env.SFTP_PORT || '22', 10),
      username: import.meta.env.SFTP_USERNAME || '',
      password: import.meta.env.SFTP_PASSWORD,
      privateKeyPath: import.meta.env.SFTP_PRIVATE_KEY_PATH,
    };
    
    // Environnement (production, staging, development)
    this.environment = import.meta.env.ENVIRONMENT || 'development';
    this.basePath = import.meta.env.SFTP_BASE_PATH || '/prisma';
  }
  
  /**
   * Établit une connexion au serveur SFTP
   */
  async connect(): Promise<void> {
    try {
      const connectConfig: any = {
        host: this.config.host,
        port: this.config.port,
        username: this.config.username,
      };
      
      // Utiliser la clé privée si elle est fournie, sinon utiliser le mot de passe
      if (this.config.privateKeyPath) {
        connectConfig.privateKey = fs.readFileSync(this.config.privateKeyPath);
      } else if (this.config.password) {
        connectConfig.password = this.config.password;
      } else {
        throw new Error("Aucune méthode d'authentification n'a été configurée");
      }
      
      await this.client.connect(connectConfig);
    } catch (error) {
      console.error('Erreur de connexion SFTP:', error);
      throw new Error(`Impossible de se connecter au serveur SFTP: ${error}`);
    }
  }
  
  /**
   * Ferme la connexion SFTP
   */
  async disconnect(): Promise<void> {
    try {
      await this.client.end();
    } catch (error) {
      console.error('Erreur lors de la déconnexion SFTP:', error);
    }
  }
  
  /**
   * Vérifie et crée si nécessaire le répertoire cible sur le serveur
   */
  async ensureDirectory(remotePath: string): Promise<boolean> {
    try {
      // Vérifier si le chemin existe
      const exists = await this.client.exists(remotePath);
      
      // Si le chemin n'existe pas, le créer récursivement
      if (!exists) {
        await this.client.mkdir(remotePath, true);
        console.log(`Répertoire créé: ${remotePath}`);
      }
      
      return true;
    } catch (error) {
      console.error(`Erreur lors de la création du répertoire ${remotePath}:`, error);
      return false;
    }
  }
  
  /**
   * Téléverse un fichier sur le serveur SFTP
   * @param localFilePath Chemin local vers le fichier à téléverser
   * @param fileName Nom du fichier sur le serveur
   * @param directory Sous-dossier optionnel (à partir du chemin de l'environnement)
   */
  async uploadFile(
    localFilePath: string, 
    fileName: string, 
    directory: string = ''
  ): Promise<SFTPUploadResult> {
    try {
      // Construire le chemin complet sur le serveur
      const envPath = path.posix.join(this.basePath, this.environment);
      const remotePath = directory 
        ? path.posix.join(envPath, directory) 
        : envPath;
      
      // S'assurer que le répertoire cible existe
      const dirExists = await this.ensureDirectory(remotePath);
      if (!dirExists) {
        throw new Error(`Impossible de créer le répertoire ${remotePath}`);
      }
      
      // Chemin complet vers le fichier
      const remoteFilePath = path.posix.join(remotePath, fileName);
      
      // Téléverser le fichier
      await this.client.put(localFilePath, remoteFilePath);
      
      return {
        success: true,
        path: remoteFilePath,
      };
    } catch (error) {
      console.error('Erreur lors de l\'upload du fichier:', error);
      return {
        success: false,
        error: `Erreur lors de l'upload du fichier: ${error}`,
      };
    }
  }
  
  /**
   * Téléverse un fichier depuis un buffer (contenu mémoire)
   * @param buffer Contenu du fichier en mémoire
   * @param fileName Nom du fichier sur le serveur
   * @param directory Sous-dossier optionnel (à partir du chemin de l'environnement)
   */
  async uploadBuffer(
    buffer: Buffer, 
    fileName: string, 
    directory: string = ''
  ): Promise<SFTPUploadResult> {
    try {
      // Construire le chemin complet sur le serveur
      const envPath = path.posix.join(this.basePath, this.environment);
      const remotePath = directory 
        ? path.posix.join(envPath, directory) 
        : envPath;
      
      // S'assurer que le répertoire cible existe
      const dirExists = await this.ensureDirectory(remotePath);
      if (!dirExists) {
        throw new Error(`Impossible de créer le répertoire ${remotePath}`);
      }
      
      // Chemin complet vers le fichier
      const remoteFilePath = path.posix.join(remotePath, fileName);
      
      // Téléverser le contenu du buffer
      await this.client.put(buffer, remoteFilePath);
      
      return {
        success: true,
        path: remoteFilePath,
      };
    } catch (error) {
      console.error('Erreur lors de l\'upload du buffer:', error);
      return {
        success: false,
        error: `Erreur lors de l'upload du buffer: ${error}`,
      };
    }
  }
  
  /**
   * Vérifie si un fichier existe sur le serveur
   * @param remotePath Chemin du fichier sur le serveur
   */
  async fileExists(remotePath: string): Promise<boolean> {
    try {
      const exists = await this.client.exists(remotePath);
      return exists === '-' || exists === 'd'; // '-' pour un fichier, 'd' pour un dossier
    } catch (error) {
      console.error('Erreur lors de la vérification du fichier:', error);
      return false;
    }
  }
  
  /**
   * Récupère l'environnement actuel
   */
  getEnvironment(): string {
    return this.environment;
  }
  
  /**
   * Récupère le chemin de base
   */
  getBasePath(): string {
    return this.basePath;
  }
}

// Export d'une instance singleton pour la réutilisation
export const sftpClient = new SFTPClient();

// Export de la classe pour les tests ou usages spécifiques
export default SFTPClient; 