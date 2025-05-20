import React from 'react';

export interface StatusMessageProps {
    message?: string;
    type?: 'success' | 'error' | 'info' | 'warning';
}

const StatusMessage = ({ message, type }: StatusMessageProps) => {
    if (!message) return null;
    
    return (
        <div className={`upload-form__status upload-form__status--${type}`} role="alert">
            {message}
        </div>
    );
};

export default StatusMessage; 