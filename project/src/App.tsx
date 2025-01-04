import React from 'react';
import { Provider } from 'react-redux';
import { store } from './store/store';
import Header from './components/Header';
import GameSection from './components/GameSection';

function App() {
  return (
    <Provider store={store}>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <GameSection />
        </main>
      </div>
    </Provider>
  );
}

export default App;