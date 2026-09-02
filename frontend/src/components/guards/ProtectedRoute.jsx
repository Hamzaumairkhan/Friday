import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAF6]">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-4 border-[#00261D] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-[#717975] uppercase tracking-widest font-semibold" style={{ fontFamily: 'Inter, sans-serif' }}>
            Verifying Friday Access...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    const redirectTarget = location.pathname + location.search;
    return (
      <Navigate
        to={`/register?redirect=${encodeURIComponent(redirectTarget)}`}
        state={{ from: location }}
        replace
      />
    );
  }

  return children;
}
