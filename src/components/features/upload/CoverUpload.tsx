import React, { ChangeEvent } from 'react';
import FormField from './FormField';

/* To do : refactor
Hi! 

I’m redoing a bit the upload form, and rereading this component, I don’t think the cover preview should come from the parent. 

This component should have its own validations rules and some may be added via props. And it should provide callbacks, like onChange, onError also, maybe. 

The best, it should be a controlled component, if that makes sense?

Can you help me refactor it?
*/

export interface CoverUploadProps {
    coverPreview: string | null;
    isValid: boolean;
    validationMessage?: string;
    onChange: (e: ChangeEvent<HTMLInputElement>) => void;
    disabled: boolean;
}

const CoverUpload = ({ coverPreview, isValid, validationMessage, onChange, disabled }: CoverUploadProps) => (
    <div className="relative w-full h-full min-h-[300px] bg-base-200">
        <label 
            htmlFor="cover" 
            className={`w-full h-full flex items-center justify-center cursor-pointer hover:bg-base-300 transition-colors ${
                !isValid ? 'bg-error/10' : ''
            }`}
        >
            <img 
                src={coverPreview || "https://placehold.co/200x300"} 
                alt="Ajouter une couverture" 
                className="w-full h-full object-cover"
            />
            {!isValid && (
                <div className="alert alert-error absolute bottom-4 left-4 right-4" role="alert">
                    {validationMessage}
                </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-base-300/50 opacity-0 hover:opacity-100 transition-opacity">
                <span className="text-base-content font-medium">Cliquez pour changer l'image</span>
            </div>
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
    </div>
);

export default CoverUpload; 