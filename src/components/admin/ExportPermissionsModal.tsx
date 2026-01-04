import React, { useMemo, useState, useRef, useEffect } from 'react';
import { AccessItem, exportPermissionsToFile, groupPermissionsByPath } from '../../utils/permissionsExport';

interface ExportPermissionsModalProps {
  permissions: AccessItem[];
  onClose: () => void;
}

const ExportPermissionsModal: React.FC<ExportPermissionsModalProps> = ({ permissions, onClose }) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(permissions.map((p) => p._id || `${p.method}-${p.path}`))
  );
  const checkboxRefs = useRef<Record<string, HTMLInputElement>>({});

  const groups = useMemo(() => {
    const grouped = groupPermissionsByPath(permissions);
    return Object.entries(grouped)
      .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
      .map(([key, items]) => ({ key, items }));
  }, [permissions]);

  const getPermKey = (perm: AccessItem) => perm._id || `${perm.method}-${perm.path}`;

  const togglePermission = (permKey: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(permKey)) {
      newSet.delete(permKey);
    } else {
      newSet.add(permKey);
    }
    setSelectedIds(newSet);
  };

  const toggleGroup = (groupKey: string) => {
    const group = groups.find((g) => g.key === groupKey);
    if (!group) return;

    const groupKeys = new Set(group.items.map(getPermKey));
    const allSelected = group.items.every((p) => selectedIds.has(getPermKey(p)));

    const newSet = new Set(selectedIds);
    if (allSelected) {
      // uncheck all in group
      groupKeys.forEach((k) => newSet.delete(k));
    } else {
      // check all in group
      groupKeys.forEach((k) => newSet.add(k));
    }
    setSelectedIds(newSet);
  };

  const selectAll = () => {
    setSelectedIds(new Set(permissions.map(getPermKey)));
  };

  const selectNone = () => {
    setSelectedIds(new Set());
  };

  const handleExport = () => {
    const selected = permissions.filter((p) => selectedIds.has(getPermKey(p)));
    const success = exportPermissionsToFile(selected, (message) => {
      console.error('Export failed:', message);
      // You can add UI error handling here if needed
    });
    if (success) {
      onClose();
    }
  };

  // Update indeterminate state on checkboxes after render
  useEffect(() => {
    groups.forEach((group) => {
      const checkbox = checkboxRefs.current[`group-${group.key}`];
      if (checkbox) {
        const groupCount = group.items.length;
        const selectedCount = group.items.filter((p) => selectedIds.has(getPermKey(p))).length;
        checkbox.indeterminate = selectedCount > 0 && selectedCount < groupCount;
      }
    });
  }, [selectedIds, groups]);

  const selectedCount = selectedIds.size;
  const totalCount = permissions.length;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/50" onClick={onClose} />
      <div className="w-full md:w-3/5 lg:w-2/5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-xl p-6 overflow-auto max-h-screen flex flex-col">
        <div className="flex-shrink-0">
          <h2 className="text-lg font-semibold mb-4">Export API Permissions</h2>

          <div className="flex items-center gap-2 mb-4 pb-4 border-b">
            <button
              onClick={selectAll}
              className="px-3 py-1 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
            >
              Select All
            </button>
            <button
              onClick={selectNone}
              className="px-3 py-1 text-sm rounded bg-gray-400 text-white hover:bg-gray-500"
            >
              Clear All
            </button>
            <span className="text-sm text-gray-500 ml-auto">
              {selectedCount} / {totalCount} selected
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto mb-4 space-y-3">
          {groups.map((group) => {
            const groupSelected = group.items.filter((p) => selectedIds.has(getPermKey(p))).length;
            const allGroupSelected = groupSelected === group.items.length;

            return (
              <div key={group.key}>
                {/* Group Header */}
                <div className="flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-900 rounded">
                  <input
                    ref={(el) => {
                      if (el) checkboxRefs.current[`group-${group.key}`] = el;
                    }}
                    type="checkbox"
                    checked={allGroupSelected}
                    onChange={() => toggleGroup(group.key)}
                    className="w-4 h-4 cursor-pointer"
                  />
                  <label className="font-semibold text-sm flex-1 cursor-pointer" onClick={() => toggleGroup(group.key)}>
                    {group.key}
                  </label>
                  <span className="text-xs text-gray-500">{groupSelected > 0 ? `${groupSelected}/${group.items.length}` : group.items.length}</span>
                </div>

                {/* Group Items */}
                <div className="ml-4 space-y-2 mt-2">
                  {group.items.map((perm) => {
                    const permKey = getPermKey(perm);
                    const isSelected = selectedIds.has(permKey);
                    return (
                      <div key={permKey} className="flex items-center gap-2 p-2 border rounded bg-gray-50 dark:bg-gray-700">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => togglePermission(permKey)}
                          className="w-4 h-4 cursor-pointer"
                        />
                        <label className="flex-1 cursor-pointer text-sm">
                          <div className="font-mono text-xs">
                            <span className="font-bold">{perm.method}</span> {perm.path}
                          </div>
                          <div className="text-xs text-gray-500">Role: {perm.requiredRole || 'public'}</div>
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex-shrink-0 flex items-center gap-2 pt-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={selectedCount === 0}
            className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Export ({selectedCount})
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportPermissionsModal;
