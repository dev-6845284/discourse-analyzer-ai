import React from 'react';
import { Quote } from '../../types';
import { useI18n } from '../../i18n';

interface AuditMetadataProps {
  quote: Quote;
}

const AuditMetadata: React.FC<AuditMetadataProps> = ({ quote }) => {
  const { t } = useI18n();

  if (!quote.analyzedByName && !quote.analyzedByProvider && !quote.savedByName) {
    return null;
  }

  return (
    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-gray-400 dark:text-gray-500">
      {quote.savedByName && quote.savedAt && (
        <span className="flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
          </svg>
          {t('savedBy', { name: quote.savedByName })} • {new Date(quote.savedAt).toLocaleDateString()}
        </span>
      )}
      {quote.analyzedByName && quote.analyzedAt && (
        <span className="flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2" />
          </svg>
          {t('analyzedBy', { name: quote.analyzedByName })}
          {quote.analyzedByProvider && <span className="text-cyan-600 dark:text-cyan-500 uppercase"> {t('analyzedVia', { provider: quote.analyzedByProvider })}</span>}
          {' '}{t('analyzedAt', { date: new Date(quote.analyzedAt).toLocaleDateString() })}
        </span>
      )}
      {!quote.analyzedByName && quote.analyzedByProvider && quote.analyzedAt && (
        <span className="flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2" />
          </svg>
          Analyzed <span className="text-cyan-600 dark:text-cyan-500 uppercase">via {quote.analyzedByProvider}</span>
          {' '}• {new Date(quote.analyzedAt).toLocaleDateString()}
        </span>
      )}
      {quote.improvedByName && quote.improvedAt && (
        <span className="flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          Improved by {quote.improvedByName}
          {quote.improvedByProvider && <span className="text-purple-600 dark:text-purple-400 uppercase"> via {quote.improvedByProvider}</span>}
          {' '}• {new Date(quote.improvedAt).toLocaleDateString()}
        </span>
      )}
    </div>
  );
};

export default AuditMetadata;
