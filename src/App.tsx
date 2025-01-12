import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from './store/store';
import { loadPersistedState } from './store/slices/puzzleSlice';
import { supabase } from './lib/supabaseClient';
import Header from './components/Header';
import GameSection from './components/GameSection';
import { Auth } from './components/Auth';

export default function App() {
  const dispatch = useDispatch<AppDispatch>();
  const [session, setSession] = React.useState<null | any>(null);
  const [loading, setLoading] = React.useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      if (session) {
        dispatch(loadPersistedState());
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        dispatch(loadPersistedState());
      }
    });

    return () => subscription.unsubscribe();
  }, [dispatch]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8">
        {session ? <GameSection /> : <Auth />}
      </main>
    </div>
  );
}