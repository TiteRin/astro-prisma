import React, { ReactNode } from 'react';

export interface FormFieldProps {
    id: string;
    label: string;
    children: ReactNode;
    className?: string;
    required?: boolean;
}

const FormField = ({ id, label, children, className = "", required = false }: FormFieldProps) => (
    <div className={`upload-form__field ${className}`}>
        <label htmlFor={id}>{label} {required && <span className="required-indicator">*</span>}</label>
        {children}
    </div>
);

export default FormField; 