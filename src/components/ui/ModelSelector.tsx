import React from 'react';
import { ChevronDown, Cpu } from 'lucide-react';

interface ModelOption {
    value: string;
    label: string;
    provider: 'google' | 'openai' | 'xai'; // for icons/styling if needed
    description?: string;
    isExperimental?: boolean;
}

export const AI_MODELS: ModelOption[] = [
    {
        value: 'gemini-2.5-flash',
        label: 'Gemini 2.5 Flash ($0.30 / $2.50)',
        provider: 'google',
        description: 'Efficiency: Best price-to-performance ratio for general multimodal tasks.'
    },
    {
        value: 'gemini-2.5-flash-lite',
        label: 'Gemini 2.5 Flash-Lite ($0.10 / $0.40)',
        provider: 'google',
        description: 'Economy: Optimized for high-volume, low-cost text processing.'
    },
    {
        value: 'gemini-2.0-flash',
        label: 'Gemini 2.0 Flash ($0.10 / $0.40)',
        provider: 'google',
        description: 'Legacy/Stable: Established production model; excellent for basic logic.'
    },
    {
        value: 'gpt-4.1-mini',
        label: 'GPT-4.1-mini (~$0.40 / ~$1.60)',
        provider: 'openai',
        description: 'Balanced cost and quality for text tasks.'
    },
    {
        value: 'gpt-5-mini',
        label: 'GPT-5-mini (~$0.25 / ~$2.00)',
        provider: 'openai',
        description: 'Cost-efficient text generation/analysis.'
    },
    {
        value: 'o4-mini',
        label: 'o4-mini (~$1.10 / ~$4.40)',
        provider: 'openai',
        description: 'Cost-efficient reasoning text model.'
    },
    {
        value: 'grok-4-1-fast-reasoning',
        label: 'Grok 4.1 Fast Reasoning ($0.20 / $0.50)',
        provider: 'xai',
        description: 'Next-gen agentic/tool-calling, great for structured text tasks'
    },
    {
        value: 'grok-4-fast-non-reasoning',
        label: 'Grok 4 Fast (Non-reasoning) ($0.20 / $0.50)',
        provider: 'xai',
        description: 'Fast non-reasoning mode, suitable for lighter text processing'
    }
];

interface ModelSelectorProps {
    value: string;
    onChange: (value: string) => void;
    className?: string;
    label?: string;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({
    value,
    onChange,
    className = '',
    label
}) => {
    const selectedModel = AI_MODELS.find(m => m.value === value) || AI_MODELS[0];

    return (
        <div className={`relative ${className}`}>
            {label && (
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 ml-1">
                    {label}
                </label>
            )}
            <div className="relative group">
                <select
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="appearance-none w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 rounded-lg py-2 pl-9 pr-8 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all cursor-pointer shadow-sm"
                >
                    {AI_MODELS.map((model) => (
                        <option key={model.value} value={model.value}>
                            {model.label} {model.description ? `- ${model.description}` : ''}
                        </option>
                    ))}
                </select>

                {/* Left Icon */}
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 dark:text-gray-500 group-hover:text-purple-500 transition-colors">
                    <Cpu size={16} />
                </div>

                {/* Right Arrow */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 dark:text-gray-500">
                    <ChevronDown size={14} />
                </div>
            </div>
        </div>
    );
};

export default ModelSelector;
