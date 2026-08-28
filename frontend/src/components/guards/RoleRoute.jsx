import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function RoleRoute({ children, allowedRole }) {
  const { role, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin dark:border-white dark:border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/register" replace />;
  }

  if (role !== allowedRole) {
    // If traveler tries to access organizer route -> redirect to explore
    if (role === 'TRAVELER') {
      return <Navigate to="/explore" replace />;
    }
    // If organizer tries to access traveler route -> redirect to dashboard
    if (role === 'ORGANIZER') {
      return <Navigate to="/organizer/dashboard" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return children;
}
