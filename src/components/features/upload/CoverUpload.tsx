import React, { ChangeEvent } from 'react';
import FormField from './FormField';

export interface CoverUploadProps {
    coverPreview: string | null;
    isValid: boolean;
    validationMessage?: string;
    onChange: (e: ChangeEvent<HTMLInputElement>) => void;
    disabled: boolean;
}

const CoverUpload = ({ coverPreview, isValid, validationMessage, onChange, disabled }: CoverUploadProps) => (
    <FormField id="cover" label="Couverture" className="upload-form__cover-upload" required={true} >
        <label htmlFor="cover" className={isValid ? '' : 'invalid'}>
            <img 
                src={coverPreview || "https://placehold.co/200x300"} 
                alt="Ajouter une couverture" 
            />
            {!isValid && (
                <div className="upload-form__validation-error" aria-live="polite">
                    {validationMessage}
                </div>
            )}
        </label>
        <input 
            type="file" 
            id="cover" 
            name="cover-image" 
            required 
            className="hidden"
            accept="image/*"
            onChange={onChange}
            disabled={disabled}
            aria-describedby="cover-desc"
        />
        <span id="cover-desc" className="sr-only">Sélectionnez une image de couverture pour votre fiche de lecture</span>
    </FormField>
);

export default CoverUpload; 