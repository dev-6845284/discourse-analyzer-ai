import React, { useState } from 'react';
import { AccessItem, PermissionsExportData, importPermissionsFromFile } from '../../utils/permissionsExport';

interface ImportPermissionsModalProps {
  onClose: () => void;
  onImport: (permissions: AccessItem[]) => Promise<void>;
}

const ImportPermissionsModal: React.FC<ImportPermissionsModalProps> = ({ onClose, onImport }) => {
  const [importedData, setImportedData] = useState<PermissionsExportData | null>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setImportedData(null);
    setLoading(true);

    importPermissionsFromFile(
      file,
      (data) => {
        setImportedData(data);
        setLoading(false);
      },
      (msg) => {
        setError(msg);
        setLoading(false);
      }
    );
  };

  const handleImport = async () => {
    if (!importedData || importedData.permissions.length === 0) {
      setError('No permissions to import.');
      return;
    }

    setImporting(true);
    setError('');
    try {
      await onImport(importedData.permissions);
      setImportedData(null);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to import permissions.');
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/50" onClick={onClose} />
      <div className="w-full md:w-3/5 lg:w-2/5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-xl p-6 overflow-auto max-h-screen flex flex-col">
        <div className="flex-shrink-0">
          <h2 className="text-lg font-semibold mb-4">Import API Permissions</h2>

          {!importedData && (
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Select JSON file to import:</label>
              <input
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                disabled={loading}
                className="block w-full text-sm border rounded px-3 py-2 bg-gray-50 dark:bg-gray-700"
              />
              {loading && <div className="text-sm text-gray-500 mt-2">Loading file...</div>}
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded text-sm">
            {error}
          </div>
        )}

        {importedData && (
          <div className="flex-1 overflow-y-auto mb-4">
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900 text-blue-900 dark:text-blue-100 rounded text-sm">
              <div className="font-semibold mb-2">Import Preview</div>
              <div>Found {importedData.permissions.length} permission(s) to import</div>
              <div className="text-xs text-blue-700 dark:text-blue-300 mt-1">Exported: {new Date(importedData.exportedAt).toLocaleString()}</div>
            </div>

            <div className="space-y-2">
              {importedData.permissions.map((perm, idx) => (
                <div key={idx} className="p-2 border rounded bg-gray-50 dark:bg-gray-700 text-sm">
                  <div className="font-mono text-xs mb-1">
                    <span className="font-bold">{perm.method}</span> {perm.path}
                  </div>
                  <div className="text-xs text-gray-500">Role: {perm.requiredRole || 'public'}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex-shrink-0 flex items-center gap-2 pt-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          {importedData && (
            <button
              onClick={handleImport}
              disabled={importing}
              className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {importing ? 'Importing...' : `Import (${importedData.permissions.length})`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportPermissionsModal;
