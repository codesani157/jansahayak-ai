import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { GridItem } from '../components/SelectionGrid';
import * as authService from '../services/authService';
import * as userService from '../services/userService';

interface AppContextValue {
    // ── Existing ──
    language: string | null;
    setLanguage: (id: string) => void;
    persona: GridItem | null;
    setPersona: (p: GridItem) => void;

    // ── Auth ──
    userId: string | null;
    isInitializing: boolean;
    isAuthenticated: boolean;

    // ── Preferences sync ──
    isSyncingPrefs: boolean;
    syncPreferences: (lang: string, role: string) => Promise<void>;

    // ── App lifecycle ──
    initializeApp: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [language, setLanguageState] = useState<string | null>(null);
    const [persona, setPersonaState] = useState<GridItem | null>(null);

    // ── Auth state ──
    const [userId, setUserId] = useState<string | null>(null);
    const [isInitializing, setIsInitializing] = useState(true);

    // ── Preferences sync ──
    const [isSyncingPrefs, setIsSyncingPrefs] = useState(false);

    const setLanguage = useCallback((id: string) => setLanguageState(id), []);
    const setPersona = useCallback((p: GridItem) => setPersonaState(p), []);

    /**
     * Called once on app mount — restores persisted JWT or creates
     * a new anonymous session.
     */
    const initializeApp = useCallback(async () => {
        setIsInitializing(true);
        try {
            const hasToken = await authService.loadPersistedToken();
            if (!hasToken) {
                const id = await authService.initSession();
                setUserId(id);
            } else {
                // Token restored; userId is embedded in the JWT but
                // we treat the token as opaque on the client.
                setUserId('restored');
            }
        } catch {
            // Offline or backend unreachable — continue in anonymous mode.
            // Features requiring auth will fail gracefully at call-time.
            setUserId(null);
        } finally {
            setIsInitializing(false);
        }
    }, []);

    /**
     * Sync language + persona to the backend so the RAG pipeline
     * knows the user's role for filtering schemes.
     */
    const syncPreferences = useCallback(async (lang: string, role: string) => {
        setIsSyncingPrefs(true);
        try {
            await userService.updatePreferences({
                preferred_language: lang,
                role_name: role,
            });
        } catch {
            // Swallow error — preferences are also kept client-side,
            // and the chat query always sends context anyway.
        } finally {
            setIsSyncingPrefs(false);
        }
    }, []);

    // Auto-initialize on mount
    useEffect(() => {
        initializeApp();
    }, [initializeApp]);

    return (
        <AppContext.Provider
            value={{
                language,
                setLanguage,
                persona,
                setPersona,
                userId,
                isInitializing,
                isAuthenticated: userId !== null,
                isSyncingPrefs,
                syncPreferences,
                initializeApp,
            }}
        >
            {children}
        </AppContext.Provider>
    );
};

export const useAppContext = (): AppContextValue => {
    const ctx = useContext(AppContext);
    if (!ctx) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return ctx;
};
