import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { supabase } from '@/api/supabase';

type SessionData = {
  userId: string | null;
  email: string | undefined;
  // true until we know whether someone is signed in (avoids flashing the login screen)
  loading: boolean;
  // true while a user is resetting a forgotten password. Entering the emailed code
  // signs them in, so the app uses this flag to keep showing the reset screen
  // until the new password is saved.
  recovering: boolean;
};

type SessionState = SessionData & {
  setRecovering: (value: boolean) => void;
};

const SessionContext = createContext<SessionState>({
  userId: null,
  email: undefined,
  loading: true,
  recovering: false,
  setRecovering: () => {},
});

export function useSession() {
  return useContext(SessionContext);
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionData>({
    userId: null,
    email: undefined,
    loading: true,
    recovering: false,
  });

  useEffect(() => {
    let active = true;

    // initial check, using the session restored from secure storage
    supabase.auth.getClaims().then(({ data }) => {
      if (!active) return;
      const claims = data?.claims;
      setSession((prev) => ({
        ...prev,
        userId: claims?.sub ?? null,
        email: claims?.email as string | undefined,
        loading: false,
      }));
    });

    // fires on sign in, sign out, and token refresh. We read the session handed to
    // the callback instead of calling more supabase functions inside it, because
    // awaiting supabase calls in this callback can deadlock the client.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession((prev) => ({
        ...prev,
        userId: nextSession?.user.id ?? null,
        email: nextSession?.user.email,
        loading: false,
        // keep the flag through sign-in / user-updated events; signing out ends the reset
        recovering: event === 'SIGNED_OUT' ? false : prev.recovering,
      }));
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<SessionState>(
    () => ({
      ...session,
      setRecovering: (recovering: boolean) =>
        setSession((prev) => ({ ...prev, recovering })),
    }),
    [session]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
