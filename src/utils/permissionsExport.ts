/**
 * Utilities for exporting and importing API permissions
 */

export interface AccessItem {
  _id?: string;
  method: string;
  path: string;
  requiredRole?: string;
}

export interface PermissionsExportData {
  permissions: AccessItem[];
  exportedAt: string;
}

/**
 * Export selected permissions to a JSON file
 */
export const exportPermissionsToFile = (selectedPermissions: AccessItem[]) => {
  if (selectedPermissions.length === 0) {
    alert('No permissions selected for export.');
    return;
  }

  const dataToExport: PermissionsExportData = {
    permissions: selectedPermissions.map(({ _id, method, path, requiredRole }) => ({
      _id,
      method,
      path,
      requiredRole,
    })),
    exportedAt: new Date().toISOString(),
  };

  const jsonString = JSON.stringify(dataToExport, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  const date = new Date().toISOString().split('T')[0];
  link.download = `api-permissions-export-${date}.json`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
};

/**
 * Import permissions from a JSON file
 */
export const importPermissionsFromFile = (
  file: File,
  onSuccess: (data: PermissionsExportData) => void,
  onError: (message: string) => void
) => {
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const result = event.target?.result;
      if (typeof result !== 'string') {
        throw new Error('File could not be read.');
      }
      const data: PermissionsExportData = JSON.parse(result);

      // Validation: check structure
      if (!Array.isArray(data.permissions)) {
        throw new Error('Invalid file format: missing permissions array.');
      }

      // Validate each permission
      data.permissions.forEach((perm, idx) => {
        if (!perm.method || !perm.path) {
          throw new Error(`Permission at index ${idx} missing required fields (method, path).`);
        }
        if (typeof perm.method !== 'string' || typeof perm.path !== 'string') {
          throw new Error(`Permission at index ${idx} has invalid field types.`);
        }
      });

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

/**
 * Group permissions by path segment for UI display
 */
export const groupPermissionsByPath = (permissions: AccessItem[]): Record<string, AccessItem[]> => {
  const groups: Record<string, AccessItem[]> = {};
  permissions.forEach((perm) => {
    const parts = perm.path.split('/').filter(Boolean);
    const key = parts[1] ?? parts[0] ?? '/';
    if (!groups[key]) groups[key] = [];
    groups[key].push(perm);
  });
  return groups;
};
