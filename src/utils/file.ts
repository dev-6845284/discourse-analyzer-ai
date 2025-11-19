import { Quote, ExportData } from '../types';

export const exportQuotesToFile = (personName: string, quotes: Quote[]) => {
  if (!personName || quotes.length === 0) {
    alert('There is no data to export.');
    return;
  }

  const dataToExport: ExportData = {
    personName,
    quotes,
  };

  const jsonString = JSON.stringify(dataToExport, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  const sanitizedName = personName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  link.download = `discourse_analyzer_quotes_${sanitizedName}_${new Date().toISOString().split('T')[0]}.json`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
};

export const importQuotesFromFile = (
  file: File,
  onSuccess: (data: ExportData) => void,
  onError: (message: string) => void
) => {
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const result = event.target?.result;
      if (typeof result !== 'string') {
        throw new Error('File could not be read.');
      }
      const data: ExportData = JSON.parse(result);

      // Basic validation
      if (!data.personName || !Array.isArray(data.quotes)) {
        throw new Error('Invalid file format.');
      }

      onSuccess(data);
    } catch (error: any) {
      onError(`Error parsing file: ${error.message}`);
    }
  };
  reader.onerror = () => {
    onError('Error reading file.');
  };
  reader.readAsText(file);
};
