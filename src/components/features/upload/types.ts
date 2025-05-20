// Types partagés entre les composants d'upload
export interface UploadStatus {
    isUploading: boolean;
    message?: string;
    type?: 'success' | 'error' | 'info' | 'warning';
} 