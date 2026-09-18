import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../components/ui/toast.tsx';
import ModernSignIn from '../components/ui/modern-sign-in.tsx';
import { BackgroundPaths } from '../components/ui/background-paths.tsx';

export default function Login() {
  const { login } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (username: string, password: string) => {
    setError('');
    setLoading(true);

    try {
      await login(username, password);
      addToast('success', 'Login successful! Welcome back.');
      setTimeout(() => navigate('/project'), 500);
    } catch (err) {
      const message = (err as Error).message;
      setError(message);
      addToast('error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen">
      <BackgroundPaths />
      <div className="absolute inset-0 flex items-center justify-center">
        <ModernSignIn onLogin={handleLogin} error={error} loading={loading} />
      </div>
    </div>
  );
}
