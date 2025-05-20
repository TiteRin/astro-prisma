// Types partagés entre les composants d'upload
import { FilePreview } from "../../../utils/uploadService";

export interface UploadStatus {
    isUploading: boolean;
    message?: string;
    type?: 'success' | 'error' | 'info' | 'warning';
}

export interface ValidationState {
    isValid: boolean;
    message?: string;
}

export interface FileState {
    file: File | null;
    preview: string | null;
    metadata?: FilePreview | null;
    id?: string | null;
    validation: ValidationState;
}

export interface FormState {
    contributor: string;
    cover: FileState;
    document: FileState;
    status: UploadStatus;
} 