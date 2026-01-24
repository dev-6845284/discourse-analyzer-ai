/**
 * ShareModal Component
 *
 * Purpose:
 * - A modal dialog for sharing content (e.g. quote URLs).
 * - Provides options to copy the link to clipboard or navigate to it.
 *
 * Behavior:
 * - Displays the full URL in a readonly text box.
 * - Handles navigation interception if `onNavigate` is provided (for SPA routing).
 *
 * Location: src/components/ui/ShareModal.tsx
 */
import React from 'react';
import { ExternalLink, Copy } from 'lucide-react';
import { useI18n } from '../../i18n';
import ModalWrapper from './ModalWrapper';

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    url: string;
    onCopy: () => void;
    onNavigate?: (path: string) => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, url, onCopy, onNavigate }) => {
    const { t } = useI18n();

    if (!isOpen) return null;

    return (
        <ModalWrapper title={t('shareQuoteTitle') || 'Share Quote'} onClose={onClose}>
            <div className="flex flex-col gap-4">
                <p className="text-gray-600 dark:text-gray-300 text-sm mb-2 break-all bg-gray-50 dark:bg-gray-900/50 p-3 rounded border border-gray-200 dark:border-gray-700">
                    {url}
                </p>
                <div className="flex gap-3 justify-end">
                    <button
                        onClick={onCopy}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200 rounded-lg transition-colors font-medium"
                    >
                        <Copy className="w-4 h-4" />
                        {t('copyLink') || 'Copy Link'}
                    </button>
                    <a
                        href={url}
                        onClick={(e) => {
                            e.preventDefault();
                            onClose();
                            if (onNavigate) {
                                // Extract path from full URL
                                try {
                                    const path = new URL(url).pathname;
                                    onNavigate(path);
                                } catch (err) {
                                    window.location.href = url;
                                }
                            } else {
                                window.location.href = url;
                            }
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors font-medium cursor-pointer shadow-sm"
                    >
                        <ExternalLink className="w-4 h-4" />
                        {t('goToLink') || 'Go to Link'}
                    </a>
                </div>
            </div>
        </ModalWrapper>
    );
};
