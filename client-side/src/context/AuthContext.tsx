import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import {
  login as apiLogin,
  logout as apiLogout,
  onAuthChange,
  register as apiRegister,
  restoreSession,
} from '../api';
import type { UserRecord } from '../types';

interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

interface AuthContextValue {
  /** Currently signed-in user, or null when signed out. */
  user: UserRecord | null;
  /**
   * True until the initial authStore restore (and token refresh) settles.
   * Keep gating your app on this so we don't flash the login screen at
   * users with a valid saved session.
   */
  isRestoring: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserRecord | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);

  // Restore a saved session. The API layer rehydrates token + record from
  // localStorage, validates them against the server, and clears a revoked
  // session — so a null result just means "signed out".
  useEffect(() => {
    let cancelled = false;

    const restore = async () => {
      try {
        const record = await restoreSession();
        if (!cancelled) setUser(record);
      } finally {
        if (!cancelled) setIsRestoring(false);
      }
    };

    void restore();
    return () => {
      cancelled = true;
    };
  }, []);

  // Stay in sync with every authStore change (login, logout, or another
  // tab signing out — LocalAuthStore listens to cross-tab storage events).
  useEffect(() => onAuthChange(setUser), []);

  const login = useCallback(async (email: string, password: string) => {
    setUser(await apiLogin(email, password));
  }, []);

  const register = useCallback(
    async ({ name, email, password }: RegisterInput) => {
      // Registration creates the account and signs in with it in one call.
      setUser(await apiRegister({ name, email, password }));
    },
    []
  );

  const logout = useCallback(() => {
    // Clearing the store fires onAuthChange, which sets user to null.
    apiLogout();
  }, []);

  const value = useMemo(
    () => ({ user, isRestoring, login, register, logout }),
    [user, isRestoring, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an <AuthProvider>');
  }
  return context;
}
