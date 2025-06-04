import React from 'react';
import FormField, { FormFieldProps } from './FormField';

export interface ContributorFieldProps {
    value: string;
    onChange: (value: string) => void;
}

const ContributorField = ({ value, onChange, className }: ContributorFieldProps & Partial<FormFieldProps>) => (
    <FormField id="contributor" label="Votre nom" required={true} className={className}>
        <input 
            type="text" 
            id="contributor" 
            name="contributor" 
            required 
            placeholder="Entrez votre nom" 
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-describedby="contributor-desc"
        />
        <span id="contributor-desc" className="sr-only">Entrez votre nom pour identifier votre contribution</span>
    </FormField>
);

export default ContributorField; 