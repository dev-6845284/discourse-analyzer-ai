/**
 * AdminSettings Component
 *
 * Purpose:
 * - A modal-style configuration panel for global system feature toggles.
 * - Allows admins to enable/disable features like Search, Text Extraction, YouTube Transcript, etc.
 *
 * Behavior:
 * - Accepts current settings and an onUpdate callback prop.
 * - Toggles local state immediately for UI responsiveness.
 * - calls `onUpdate` to persist changes to the server when saved.
 *
 * Location: src/components/admin/AdminSettings.tsx
 */
import React, { useState } from 'react';

interface AdminSettingsProps {
    settings: {
        search: boolean;
        text_extract: boolean;
        youtube_transcript: boolean;
        import_transcript: boolean;
        import_analysis: boolean;
    };
    onUpdate: (newSettings: any) => Promise<void>;
    onClose: () => void;
}

export const AdminSettings: React.FC<AdminSettingsProps> = ({ settings, onUpdate, onClose }) => {
    const [features, setFeatures] = useState(settings);
    const [isSaving, setIsSaving] = useState(false);

    const handleToggle = (key: keyof typeof features) => {
        setFeatures(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onUpdate(features);
            alert('Settings updated successfully');
            onClose();
        } catch (error) {
            console.error('Failed to update settings', error);
            alert('Failed to update settings');
        } finally {
            setIsSaving(false);
        }
    };

    const featureLabels: Record<string, string> = {
        search: 'Quote Search',
        text_extract: 'Text Extraction',
        youtube_transcript: 'YouTube Transcript',
        import_transcript: 'Import Transcript',
        import_analysis: 'Import Analysis'
    };

    return (
        <div className="bg-gray-800 p-6 rounded-lg shadow-xl max-w-2xl w-full mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">System Features</h2>
                <button onClick={onClose} className="text-gray-400 hover:text-white">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <div className="space-y-4">
                {Object.keys(features).map((key) => (
                    <div key={key} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                        <div>
                            <h3 className="text-lg font-medium text-white">{featureLabels[key] || key}</h3>
                            <p className="text-sm text-gray-400">
                                {features[key as keyof typeof features] ? 'Enabled for Editors' : 'Disabled (Admin only)'}
                            </p>
                        </div>
                        <button
                            onClick={() => handleToggle(key as keyof typeof features)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${features[key as keyof typeof features] ? 'bg-cyan-600' : 'bg-gray-600'
                                }`}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${features[key as keyof typeof features] ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                            />
                        </button>
                    </div>
                ))}
            </div>

            <div className="mt-8 flex justify-end space-x-3">
                <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
                >
                    Cancel
                </button>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-4 py-2 text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 rounded-md shadow-sm disabled:opacity-50 transition-colors"
                >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>
        </div>
    );
};
