// Who is logged in. Loaded once from /api/me; pages call refresh() after logging in or out.
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from './api.js';
import { useI18n } from './i18n.jsx';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const { setLang } = useI18n();
    // undefined = still loading, null = logged out
    const [user, setUser] = useState(undefined);

    const refresh = useCallback(async () => {
        try {
            const { user } = await api('me');
            setUser(user);
            setLang(user.lang);
        } catch {
            setUser(null);
        }
    }, [setLang]);

    useEffect(() => { refresh(); }, [refresh]);

    return <AuthContext.Provider value={{ user, setUser, refresh }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
