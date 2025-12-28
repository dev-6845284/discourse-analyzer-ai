import React from 'react';
import { useAuth as useAuthHook } from '../hooks/useAuth';
import { setDevRole, getDevRoles } from '../utils/api';

const ROLES = ['admin', 'editor', 'moderator', 'viewer'] as const;
export type Role = typeof ROLES[number];

export const DevRoleSelector: React.FC = () => {
  const { user, updateUser } = useAuthHook();
  const [available, setAvailable] = React.useState<Role[]>(Array.from(ROLES));
  const [selected, setSelected] = React.useState<Role | null>((user?.role as Role) || null);
  const [loading, setLoading] = React.useState(false);
  const isDev = process.env.NODE_ENV === 'development';

  React.useEffect(() => {
    if (!isDev) return;
    setSelected((user?.role as Role) || null);
    // try to fetch role list from server if available
    getDevRoles().then(res => {
      if (res?.data?.roles && Array.isArray(res.data.roles)) {
        // Narrow the roles reported by the server to our known union (filter unknown values)
        const rolesFromServer = (res.data.roles as string[]).filter((r): r is Role => (ROLES as readonly string[]).includes(r));
        if (rolesFromServer.length > 0) setAvailable(rolesFromServer);
      }
    }).catch(() => {});
  }, [user, isDev]);

  const apply = async (role: Role) => {
    if (!isDev) return;
    setLoading(true);
    try {
      const res = await setDevRole(role);
      if (res?.data?.user) {
        updateUser({ role: res.data.user.role });
        setSelected(res.data.user.role as Role);
      } else {
        updateUser({ role });
        setSelected(role);
      }
    } catch (e: any) {
      console.error('Failed to set dev role:', e);
      alert('Failed to set role');
    } finally {
      setLoading(false);
    }
  };

  if (!isDev) return null;

  return (
    <div className="flex items-center gap-2">
      <select
        value={selected ?? ''}
        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
          const v = e.target.value;
          if (!v) { setSelected(null); return; }
          if ((ROLES as readonly string[]).includes(v)) {
            setSelected(v as Role);
          } else {
            // Unknown value from server or unexpected input - ignore and warn
            // This keeps typings safe and prevents runtime surprise
            // eslint-disable-next-line no-console
            console.warn('Unknown role selected:', v);
          }
        }}
        className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg p-2 text-sm"
      >
        <option value="">Select role</option>
        {available.map(r => (
          <option key={r} value={r}>{r}</option>
        ))}
      </select>
      <button
        onClick={() => selected && apply(selected)}
        disabled={!selected || loading}
        className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-xs md:text-base"
      >
        {loading ? 'Applying...' : 'Set role'}
      </button>
    </div>
  );
};

export default DevRoleSelector;