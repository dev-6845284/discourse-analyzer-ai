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
    <div className="flex items-center gap-3">
      {available.map(r => (
        <label key={r} className="flex items-center gap-2 text-xs md:text-sm">
          <input
            type="radio"
            name="dev-role"
            value={r}
            checked={selected === r}
            disabled={loading}
            onChange={() => {
              setSelected(r);
              apply(r);
            }}
            className="w-3 h-3"
          />
          <span className="capitalize">{r}</span>
        </label>
      ))}
    </div>
  );
};

export default DevRoleSelector;