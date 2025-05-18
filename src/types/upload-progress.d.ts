export interface UploadProgress {
    start: (fileName: string) => void;
    update: (message: string, type: 'success' | 'error' | 'info') => void;
}

declare global {
    var uploadProgress: UploadProgress | undefined;
} 