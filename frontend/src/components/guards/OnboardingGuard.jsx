import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function OnboardingGuard({ children }) {
  const { isOrganizer, isOnboarded, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin dark:border-white dark:border-t-transparent" />
      </div>
    );
  }

  // If user is an organizer and hasn't completed onboarding, and is not already on onboarding page
  if (isOrganizer && !isOnboarded && location.pathname !== '/organizer/onboarding') {
    return <Navigate to="/organizer/onboarding" replace />;
  }

  return children;
}
