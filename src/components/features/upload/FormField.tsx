import React, { ReactNode } from 'react';

export interface FormFieldProps {
    id: string;
    label: string;
    children: ReactNode;
    className?: string;
    required?: boolean;
}

const FormField = ({ id, label, children, className = "", required = false }: FormFieldProps) => (
    <div className={`form-control w-full ${className}`}>
        <label className="label" htmlFor={id}>
            <span className="label-text">
                {label}
                {required && <span className="text-error ml-1">*</span>}
            </span>
        </label>
        {children}
    </div>
);

export default FormField; 