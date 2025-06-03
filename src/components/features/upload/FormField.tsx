import React, { ReactNode } from 'react';

export interface FormFieldProps {
    id: string;
    label: string;
    children: ReactNode;
    className?: string;
    required?: boolean;
}

const FormField = ({ id, label, children, className = "", required = false }: FormFieldProps) => (
    <label className={`input ${className}`} htmlFor={id}>
        <span className={`label`}>
            {label}
            {required && <span className="required-indicator">*</span>}
        </span>
        {children}
    </label>
    
);

export default FormField; 