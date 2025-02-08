import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Use memory storage instead of localStorage for better performance
const memoryStorage = new Map<string, string>();

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: {
      getItem: (key) => {
        return Promise.resolve(memoryStorage.get(key) || null);
      },
      setItem: (key, value) => {
        memoryStorage.set(key, value);
        return Promise.resolve();
      },
      removeItem: (key) => {
        memoryStorage.delete(key);
        return Promise.resolve();
      }
    },
    persistSession: true, // Enable session persistence in memory
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'implicit' // Use implicit flow for faster auth
  },
  realtime: {
    timeout: 5000 // Reduce timeout for faster connections
  }
}); 