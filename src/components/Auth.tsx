import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

interface AuthMessage {
  type: 'error' | 'success';
  text: string;
}

export function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<AuthMessage | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'An error occurred during sign in'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    
    try {
      setLoading(true);
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;
      
      setMessage({
        type: 'success',
        text: 'Success! Check your email for the confirmation link.'
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'An error occurred during sign up'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Welcome to Chess Training</h2>
      <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
          />
        </div>
        {message && (
          <div className={`text-sm p-2 rounded ${
            message.type === 'error' 
              ? 'text-red-600 bg-red-50' 
              : 'text-green-600 bg-green-50'
          }`}>
            {message.text}
          </div>
        )}
        <div className="flex gap-4">
          <button
            type="button"
            onClick={handleSignUp}
            disabled={loading}
            className="flex-1 bg-white border border-blue-600 text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Sign Up'}
          </button>
          <button
            type="button"
            onClick={handleLogin}
            disabled={loading}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Sign In'}
          </button>
        </div>
      </form>
    </div>
  );
} 