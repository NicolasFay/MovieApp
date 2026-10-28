import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { supabase } from '@/api/supabase';

type SessionState = {
  userId: string | null;
  email: string | undefined;
  // true until we know whether someone is signed in (avoids flashing the login screen)
  loading: boolean;
};

const SessionContext = createContext<SessionState>({
  userId: null,
  email: undefined,
  loading: true,
});

export function useSession() {
  return useContext(SessionContext);
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({
    userId: null,
    email: undefined,
    loading: true,
  });

  useEffect(() => {
    let active = true;

    // initial check, using the session restored from secure storage
    supabase.auth.getClaims().then(({ data }) => {
      if (!active) return;
      const claims = data?.claims;
      setState({
        userId: claims?.sub ?? null,
        email: claims?.email as string | undefined,
        loading: false,
      });
    });

    // fires on sign in, sign out, and token refresh. We read the session handed to
    // the callback instead of calling more supabase functions inside it, because
    // awaiting supabase calls in this callback can deadlock the client.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({
        userId: session?.user.id ?? null,
        email: session?.user.email,
        loading: false,
      });
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return <SessionContext.Provider value={state}>{children}</SessionContext.Provider>;
}