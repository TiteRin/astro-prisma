export interface UploadProgress {
    start: () => void;
    reset: () => void;
}

declare global {
    interface Window {
        uploadProgress: UploadProgress;
    }
} 