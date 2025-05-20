import React, { ReactNode } from 'react';

export interface FormFieldProps {
    id: string;
    label: string;
    children: ReactNode;
    className?: string;
}

const FormField = ({ id, label, children, className = "" }: FormFieldProps) => (
    <div className={`upload-form__field ${className}`}>
        <label htmlFor={id}>{label}</label>
        {children}
    </div>
);

export default FormField; 