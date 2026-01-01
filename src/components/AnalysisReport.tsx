
import React from 'react';
import { useI18n } from '../i18n';
import { useCategories } from '../hooks/useCategories';
import {
  AnalysisResult,
  AnalysisCategory,
  AnalysisDetail,
  AuditResult,
  AuditCategory,
  AuditDetail,
  SeverityLevel
} from '../types';
import {
  CATEGORY_COLORS,
  RATING_COLORS,
  RATING_HEX,
  AUDIT_CATEGORY_COLORS,
  SEVERITY_COLORS,
  SEVERITY_HEX,
  VERDICT_COLORS,
  severityToDisplay
} from '../constants';
import StrengthBar from './StrengthBar';

interface LegacyAnalysisReportProps {
  analysis: AnalysisResult;
  selectable?: boolean;
  selectedCategories?: AnalysisCategory[];
  onToggleCategory?: (category: AnalysisCategory) => void;
}

interface AuditReportProps {
  audit: AuditResult;
  selectable?: boolean;
  selectedCategories?: AuditCategory[];
  onToggleCategory?: (category: AuditCategory) => void;
}

type AnalysisReportProps = LegacyAnalysisReportProps | AuditReportProps;

// Type guard to check if this is an audit result
const isAuditResult = (props: AnalysisReportProps): props is AuditReportProps => {
  return 'audit' in props && props.audit !== undefined;
};


const AnalysisReport: React.FC<AnalysisReportProps> = (props) => {
  const { t, language } = useI18n();
  const { getCategory } = useCategories();

  if (isAuditResult(props)) {
    const { audit, selectable = false, selectedCategories = [], onToggleCategory } = props;
    return (
      <div className="mt-4 pt-4 border-t border-gray-700/50 space-y-4">
        {'classification' in audit ? (
          <>
            {/* Flaws Classification */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-cyan-300">{t('flawsReport') || 'Rhetorical Analysis'}</h3>
              <span className="px-3 py-1 text-sm font-bold rounded-full ring-1 ring-inset bg-purple-600/20 text-purple-300 ring-purple-500/30 text-right">
                {t(`verdict_${audit.classification}`) || audit.classification}
              </span>
            </div>
            {/* Final Assessment */}
            <div className="p-3 bg-gray-800/70 rounded-lg border-l-4 border-purple-500">
              <p className="text-gray-200 text-sm italic">{audit.finalAssessment}</p>
            </div>
          </>
        ) : (
          <>
            {/* Verdict Badge */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-cyan-300">{t('auditReport')}</h3>
              <span className={`px-3 py-1 text-sm font-bold rounded-full ring-1 ring-inset ${VERDICT_COLORS[audit.verdict]}`}>
                {t(`verdict_${audit.verdict}`) || audit.verdict}
              </span>
            </div>
            {/* Rationale */}
            <div className="p-3 bg-gray-800/70 rounded-lg border-l-4 border-cyan-500">
              <p className="text-gray-200 text-sm italic">{audit.rationale}</p>
            </div>
          </>
        )}
        {/* Categories */}
        {(Object.entries(audit.categories) as [AuditCategory, AuditDetail][]).map(([category, detail]) => {
          const cat = getCategory ? getCategory(category) : undefined;
          let displayTitle = category;

          // 1. Try Dynamic Translation (DB)
          const dynamicTitle = cat?.translations?.[language]?.title;

          if (dynamicTitle) {
            displayTitle = dynamicTitle;
          } else {
            // 2. Try Static Translation (i18n file)
            // Construct key from the category string (likely English Title "Verifiable Falsehood")
            const i18nKey = `category_${category.replace(/ |&|\//g, '')}`;
            const translated = t(i18nKey);

            if (translated !== i18nKey) {
              displayTitle = translated;
            } else {
              // 3. Fallback to Base English Title from DB, or the key itself
              displayTitle = cat?.title || category;
            }
          }

          return (
            <div
              key={category}
              className={`p-3 bg-gray-800/50 rounded-lg flex gap-3 ${selectable && !selectedCategories.includes(category) ? 'opacity-50' : ''}`}
            >
              {selectable && onToggleCategory && (
                <div className="pt-1">
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(category as AuditCategory)}
                    onChange={() => onToggleCategory(category as AuditCategory)}
                    className="w-4 h-4 rounded border-gray-600 text-cyan-600 focus:ring-cyan-500 bg-gray-700"
                  />
                </div>
              )}
              <div className="flex-1">
                <div className="flex justify-between items-center">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ring-1 ring-inset ${AUDIT_CATEGORY_COLORS[category]}`}>
                    {displayTitle}
                  </span>
                  <StrengthBar
                    level={['NONE', 'LOW', 'MEDIUM', 'HIGH', 'SEVERE'].indexOf(detail.severity)}
                    max={5}
                    color={SEVERITY_HEX[detail.severity]}
                    tooltip={t(`severity_${detail.severity}`) || severityToDisplay(detail.severity)}
                    height={12}
                    width={60}
                  />
                </div>
                <p className="mt-2 text-gray-300 text-sm">{detail.evidence}</p>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Legacy analysis
  const { analysis, selectable = false, selectedCategories = [], onToggleCategory } = props as LegacyAnalysisReportProps;
  return (
    <div className="mt-4 pt-4 border-t border-gray-700/50 space-y-4">
      <h3 className="text-lg font-semibold text-cyan-300">{t('analysisReportLegacy')}</h3>
      {(Object.entries(analysis) as [AnalysisCategory, AnalysisDetail][]).map(([category, detail]) => (
        <div key={category} className={`p-3 bg-gray-800/50 rounded-lg flex gap-3 ${selectable && !selectedCategories.includes(category) ? 'opacity-50' : ''}`}>
          {selectable && onToggleCategory && (
            <div className="pt-1">
              <input
                type="checkbox"
                checked={selectedCategories.includes(category as AnalysisCategory)}
                onChange={() => onToggleCategory(category as AnalysisCategory)}
                className="w-4 h-4 rounded border-gray-600 text-cyan-600 focus:ring-cyan-500 bg-gray-700"
              />
            </div>
          )}
          <div className="flex-1">
            <div className="flex justify-between items-center">
              <span className={`px-2 py-1 text-xs font-medium rounded-full ring-1 ring-inset ${CATEGORY_COLORS[category]}`}>
                {t(`category_${category.replace(/ |&|\//g, '')}`) || category}
              </span>
              <StrengthBar
                level={['None', 'Low', 'Medium', 'High', 'Severe'].indexOf(detail.rating)}
                max={5}
                color={RATING_HEX[detail.rating]}
                tooltip={t(`rating_${detail.rating}`) || detail.rating}
                height={12}
                width={60}
              />
            </div>
            <p className="mt-2 text-gray-300 text-sm">{detail.justification}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AnalysisReport;
