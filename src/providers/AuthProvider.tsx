import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../utils/supabase';
import { setUser, setLoading } from '../store/slices/authSlice';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch();

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      dispatch(setUser(session?.user ?? null));
      dispatch(setLoading(false));
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      dispatch(setUser(session?.user ?? null));
    });

    return () => subscription.unsubscribe();
  }, [dispatch]);

  return <>{children}</>;
} 