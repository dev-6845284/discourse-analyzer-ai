/**
 * DevRoleSelector Component
 *
 * Purpose:
 * - A development-only tool to switch the current user's role for testing purposes.
 * - Allows developers to impersonate different roles (admin, editor, moderator, viewer) to verify permissions and UI behavior.
 *
 * Behavior:
 * - Strictly limited to local development environments (localhost, 127.0.0.1, or specific dev flags).
 * - Fetches available roles from the server if possible.
 * - Updates the user state globally upon role change.
 * - Returns `null` (renders nothing) if the environment is not a valid development environment.
 *
 * Location: src/components/admin/DevRoleSelector.tsx
 */
import React from 'react';
import { useAuth as useAuthHook } from '../../hooks/useAuth';
import { setDevRole, getDevRoles } from '../../utils/api';

const ROLES = ['admin', 'editor', 'moderator', 'viewer'] as const;
export type Role = typeof ROLES[number];

export const DevRoleSelector: React.FC = () => {
    const { user, updateUser } = useAuthHook();
    const [available, setAvailable] = React.useState<Role[]>(Array.from(ROLES));
    const [selected, setSelected] = React.useState<Role | null>((user?.role as Role) || null);
    const [loading, setLoading] = React.useState(false);


    // Robust dev check for both Node-like and Vite-like environments
    const isDev = (() => {
        try {
            // Strictly allow only local environment
            if (typeof window !== 'undefined') {
                if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') return true;
            }

            // Allow if explicit 'local' environment (custom setup)
            if (typeof process !== 'undefined' && process.env.NODE_ENV === 'local') return true;

            // Allow Vite dev server (usually implies local development)
            if (typeof import.meta !== 'undefined' && (import.meta as any).env?.DEV) {
                // Double check we are not in a deployed environment if possible, 
                // but import.meta.env.DEV is usually reliable for local dev server.
                // However, if we build with mode=development, it might be true. 
                // Safe to keep if we trust the user knows 'dev' means local dev server or unminified build.
                // Given the user request "expect local", relying on hostname is safest, but we need to support development on valid setups.
                // Let's rely on the hostname check primarily if we are in a browser.
                if (typeof window !== 'undefined') {
                    // If we are in browser, we already returned true for localhost. 
                    // If we are here, hostname is NOT localhost.
                    // If we are on a deployed dev site (e.g. dev.example.com) with DEV=true, we should probably return FALSE.
                    return false;
                }
                return true; // Non-browser env (unlikely here)
            }
        } catch (e) { }
        return false;
    })();

    React.useEffect(() => {
        if (!isDev) return;
        setSelected((user?.role as Role) || null);
        // try to fetch role list from server if available
        getDevRoles().then(res => {
            if (res?.data?.roles && Array.isArray(res.data.roles)) {
                const rolesFromServer = (res.data.roles as string[]).filter((r): r is Role => (ROLES as readonly string[]).includes(r));
                if (rolesFromServer.length > 0) setAvailable(rolesFromServer);
            }
        }).catch(() => { });
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
        } finally {
            setLoading(false);
        }
    };

    if (!isDev) return null;

    return (
        <div className="flex flex-col gap-2 p-1">
            <div className="grid grid-cols-2 gap-2">
                {available.map(r => (
                    <button
                        key={r}
                        onClick={() => {
                            setSelected(r);
                            apply(r);
                        }}
                        disabled={loading}
                        className={`
              flex items-center justify-center px-2 py-1.5 rounded-md text-xs font-semibold capitalize transition-all
              ${selected === r
                                ? 'bg-cyan-600 text-white shadow-sm ring-1 ring-cyan-500'
                                : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'}
              ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
                    >
                        {r}
                    </button>
                ))}
            </div>
            {loading && (
                <div className="text-[10px] text-cyan-600 dark:text-cyan-400 animate-pulse text-center">
                    Switching role...
                </div>
            )}
        </div>
    );
};

export default DevRoleSelector;
