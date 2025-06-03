import React, { ChangeEvent } from 'react';
import clsx from 'clsx';
import FormField, { FormFieldProps } from './FormField';
import { FilePreview } from '../../../utils/uploadService';

export interface FileUploadProps {
    fileMetadata: FilePreview | null;
    fileId: string | null;
    isValid: boolean;
    validationMessage?: string;
    onChange: (e: ChangeEvent<HTMLInputElement>) => void;
    onReset: () => void;
    disabled: boolean;
}


const FilePreviewDisplay = ({ fileMetadata }: Pick<FileUploadProps, 'fileMetadata'>) => { 
    return (
        <div className="upload-form__file-preview whitespace-normal">
            <ul>
                <li><strong>Titre:</strong> {fileMetadata?.title || '-'}</li>
                <li><strong>Auteurs:</strong> {fileMetadata?.authors?.join(', ') || '-'}</li>
                <li><strong>Tags:</strong> {fileMetadata?.tags?.join(', ') || '-'}</li>
                <li><strong>Description:</strong> {fileMetadata?.description || '-'}</li>
            </ul>
            <button 
                type="button" 
                className="btn-action" 
                //onClick={onReset}
                aria-label="Changer de fichier"
            >
                Changer de fichier
            </button>
        </div>
    )
};


const FileUpload = ({ 
    fileMetadata, 
    fileId, 
    isValid, 
    validationMessage, 
    onChange, 
    onReset,
    disabled,
    className
}: FileUploadProps & Partial<FormFieldProps>) => {

    return (
        <div className='relative'>
            <label htmlFor="file">
                <FilePreviewDisplay fileMetadata={fileMetadata} />
            </label>
            <input 
                type="file" 
                id="file" 
                name="new-note" 
                required
                accept=".md,.mdx"
                onChange={onChange}
                disabled={disabled}
                className="hidden"
                aria-describedby="file-desc"
            />
        </div>
    )
};

/**
    <FormField id="file" label="Fichier" className={className} required={true}>
        <input 
            type="file" 
            id="file" 
            name="new-note" 
            required
            accept=".md,.mdx"
            onChange={onChange}
            disabled={disabled}
            className={clsx({'hidden': !!fileId})}
            aria-describedby="file-desc"
        />
        <span id="file-desc" className="sr-only">Sélectionnez un fichier Markdown pour votre fiche de lecture</span>
        
        {!isValid && (
            <div className="upload-form__validation-error" aria-live="polite">
                {validationMessage}
            </div>
        )}

        <input type="hidden" name="file-id" value={fileId || ''} />   
    </FormField>
);
 */
export default FileUpload; 