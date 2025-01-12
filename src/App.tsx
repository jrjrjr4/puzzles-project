import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { loadPersistedState } from './store/slices/puzzleSlice';
import Header from './components/Header';
import GameSection from './components/GameSection';

export default function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(loadPersistedState());
  }, [dispatch]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <GameSection />
      </main>
    </div>
  );
}