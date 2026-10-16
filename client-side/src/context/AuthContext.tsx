import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { pb, asUserRecord } from '../lib/pocketbase';
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

  // Restore a saved session. The SDK's LocalAuthStore already rehydrated
  // token + record from localStorage when `pb` was constructed, so we only
  // need to validate the token against the server and adopt the record.
  useEffect(() => {
    let cancelled = false;

    const restore = async () => {
      try {
        if (pb.authStore.isValid && pb.authStore.record) {
          // authRefresh verifies the stored token is still good and writes
          // the fresh record back to the authStore.
          const { record } = await pb.collection('users').authRefresh();
          if (!cancelled) setUser(asUserRecord(record));
        }
      } catch {
        // Token revoked or user deleted — drop the stale session.
        pb.authStore.clear();
        if (!cancelled) setUser(null);
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
  useEffect(() => {
    return pb.authStore.onChange((_token, record) => {
      setUser(asUserRecord(record));
    });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { record } = await pb
      .collection('users')
      .authWithPassword(email, password);
    setUser(asUserRecord(record));
  }, []);

  const register = useCallback(async ({ name, email, password }: RegisterInput) => {
    // users.createRule is "" in the migration, so registration is open.
    await pb.collection('users').create({
      name,
      email,
      password,
      passwordConfirm: password,
    });
    // Creating a record doesn't sign you in — do it right after so the new
    // account lands in the app with a valid token.
    await login(email, password);
  }, [login]);

  const logout = useCallback(() => {
    // Clearing the store fires onChange, which sets user to null.
    pb.authStore.clear();
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
