import { SUPPORTED_LANGUAGES } from '../../../constants';
import { TimePeriod } from '../types';

export interface WebSearchPlanParams {
  languages: string[];
  context: string[];
  timePeriod: TimePeriod;
}

/**
 * Generates the web search plan section for multilingual quote searches.
 */
export function getWebSearchPlanSection(params: WebSearchPlanParams): string {
  const { languages, context, timePeriod } = params;

  const languageNames = languages
    .map(code => SUPPORTED_LANGUAGES.find(l => l.code === code)?.name)
    .filter(Boolean);

  const languageInstruction = languageNames.length > 0
    ? `Your search must cover sources in the following languages: ${languageNames.join(', ')}.`
    : 'Your search should primarily cover English sources, but identify and return the language for any non-English quotes you find.';

  let exclusionInstruction = '';
  if (context && context.length > 0) {
    const quotesToExclude = context.map(q => `- "${q.slice(0, 150)}..."`).join('\n');
    exclusionInstruction = `
You MUST find new quotes that are NOT in the following list. Do not repeat any of the quotes below.
Here are the quotes that have already been found:
${quotesToExclude}
`;
  }

  return `### ⚙️ WEB SEARCH PLAN (Multilingual)
${languageInstruction}
${exclusionInstruction}
**Time Period:** Focus your search on quotes from ${timePeriod.description}. Only include quotes that were published or made during this time period.
For this time period, perform targeted multilingual searches using all relevant spellings of the individual's name, including both **Latin** and **Cyrillic** forms where appropriate.
**Keywords:**
- English: "interview", "quote", "speech", "statement", "article", "publication", "op-ed", "press conference"
- Russian: "интервью", "цитата", "речь", "заявление", "статья", "публикация", "пресс-конференция"
- Lithuanian: "interviu", "citata", "kalba", "pareiškimas", "straipsnis", "publikacija", "spaudos konferencija"
**Sources:** [Delfi](https://www.delfi.lt), [15min](https://www.15min.lt), [TV3](https://www.tv3.lt), [Lrytas](https://www.lrytas.lt), [LRT](https://www.lrt.lt), [Alfa](https://www.alfa.lt), [VE.lt](https://www.ve.lt), [Diena.lt](https://www.diena.lt), [Respublika](https://www.respublika.lt), [Verslo žinios](https://www.vz.lt),[](https://jp.lt/), government records, think tanks, transcript repositories, and official sites.
Extract only **direct quotes or verbatim authored text**, no summaries.`;
}
