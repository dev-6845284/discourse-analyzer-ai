import React from 'react';

interface LinkData {
  url: string;
  title?: string;
  type: 'quote' | 'context';
}

interface QuoteLinksDisplayProps {
  links: LinkData[];
}

const QuoteLinksDisplay: React.FC<QuoteLinksDisplayProps> = ({ links }) => {
  if (!links || links.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {links.map((link, i) => (
        <a
          key={i}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center gap-1 px-2 py-1 rounded border transition-colors ${
            link.type === 'quote'
              ? 'border-blue-900/50 bg-blue-900/20 text-blue-400 hover:bg-blue-900/30'
              : 'border-purple-900/50 bg-purple-900/20 text-purple-400 hover:bg-purple-900/30'
          }`}
          title={link.url}
        >
          <span className="uppercase text-[10px] font-bold opacity-70">
            {link.type === 'quote' ? 'Source' : 'Ref'}
          </span>
          <span className="max-w-[150px] truncate">
            {link.title || new URL(link.url).hostname}
          </span>
          <svg className="w-3 h-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      ))}
    </div>
  );
};

export default QuoteLinksDisplay;
