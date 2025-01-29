import { useSelector } from 'react-redux';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { RootState } from './store/store';
import { AuthProvider } from './providers/AuthProvider';
import { Auth } from './components/Auth';
import Header from './components/Header';
import GameSection from './components/GameSection';
import AuthCallback from './components/AuthCallback';

function MainContent() {
  const { user, loading } = useSelector((state: RootState) => state.auth);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      {user ? <GameSection /> : <Auth />}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="*" element={<MainContent />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}