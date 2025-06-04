import React from 'react';

export interface StatusMessageProps {
    message?: string;
    type?: 'success' | 'error' | 'info' | 'warning';
}

const StatusMessage = ({ message, type }: StatusMessageProps) => {
    if (!message) return null;
    
    const alertClass = `alert ${
        type === 'success' ? 'alert-success' :
        type === 'error' ? 'alert-error' :
        type === 'warning' ? 'alert-warning' :
        'alert-info'
    }`;
    
    return (
        <div className={alertClass} role="alert">
            {message}
        </div>
    );
};

export default StatusMessage; 