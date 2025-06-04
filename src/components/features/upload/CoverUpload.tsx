import { ChangeEvent, useState, useCallback, useEffect } from 'react';

export interface CoverUploadProps {
    value?: File | null;
    onChange?: (file: File | null) => void;
    onError?: (error: string) => void;
    disabled?: boolean;
    maxSizeMB?: number;
    allowedTypes?: string[];
    className?: string;
}

const CoverUpload = ({ 
    value,
    onChange,
    onError,
    disabled = false,
    maxSizeMB = 5,
    allowedTypes = ['image/jpeg', 'image/png', 'image/webp'],
    className = ''
}: CoverUploadProps) => {
    const [preview, setPreview] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Update preview when value changes
    useEffect(() => {
        if (value) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result as string);
            };
            reader.readAsDataURL(value);
        } else {
            setPreview(null);
        }
    }, [value]);

    const validateFile = useCallback((file: File): boolean => {
        // Check file type
        if (!allowedTypes.includes(file.type)) {
            const errorMsg = `Format non supporté. Formats acceptés: ${allowedTypes.map(type => type.split('/')[1]).join(', ')}`;
            setError(errorMsg);
            onError?.(errorMsg);
            return false;
        }

        // Check file size
        if (file.size > maxSizeMB * 1024 * 1024) {
            const errorMsg = `L'image ne doit pas dépasser ${maxSizeMB}MB`;
            setError(errorMsg);
            onError?.(errorMsg);
            return false;
        }

        setError(null);
        return true;
    }, [allowedTypes, maxSizeMB, onError]);

    const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        
        if (file) {
            if (validateFile(file)) {
                onChange?.(file);
            }
        } else {
            onChange?.(null);
        }
    }, [onChange, validateFile]);

    return (
        <div className={`relative w-full h-full min-h-[300px] bg-base-200 ${className}`}>
            <label 
                htmlFor="cover" 
                className={`w-full h-full flex items-center justify-center cursor-pointer hover:bg-base-300 transition-colors ${
                    error ? 'bg-error/10' : ''
                }`}
            >
                <img 
                    src={preview || "https://placehold.co/200x300"} 
                    alt="Ajouter une couverture" 
                    className="w-full h-full object-cover"
                />
                {error && (
                    <div className="alert alert-error absolute bottom-4 left-4 right-4" role="alert">
                        {error}
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
                accept={allowedTypes.join(',')}
                onChange={handleChange}
                disabled={disabled}
                aria-describedby="cover-desc"
            />
            <span id="cover-desc" className="sr-only">Sélectionnez une image de couverture pour votre fiche de lecture</span>
        </div>
    );
};

export default CoverUpload; 