/**
 * Toast Component
 *
 * Purpose:
 * - A transient notification message.
 *
 * Behavior:
 * - Automatically calls `onClose` after `duration` (default 3s).
 * - Fixed positioning at bottom-right.
 *
 * Location: src/components/ui/Toast.tsx
 */
import React, { useEffect } from 'react';
import { Check, X } from 'lucide-react';

interface ToastProps {
    message: string;
    onClose: () => void;
    duration?: number;
}

export const Toast: React.FC<ToastProps> = ({ message, onClose, duration = 3000 }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    return (
        <div className="fixed bottom-4 right-4 z-50 animate-fade-in-up">
            <div className="bg-gray-800 dark:bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-lg shadow-xl flex items-center gap-3">
                <div className="bg-green-500/20 text-green-400 p-1 rounded-full">
                    <Check className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium">{message}</span>
                <button
                    onClick={onClose}
                    className="ml-2 text-gray-400 hover:text-white transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};
