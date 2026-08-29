import { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signOut as fbSignOut } from 'firebase/auth';
import { auth } from '../services/firebase';
import { authService } from '../services/auth';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [backendUser, setBackendUser] = useState(null);
  const [organizerProfile, setOrganizerProfile] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // Global Auth Modal State
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [defaultModalRole, setDefaultModalRole] = useState('TRAVELER');

  const openAuthModal = (intendedRole = 'TRAVELER') => {
    setDefaultModalRole(intendedRole);
    setAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setAuthModalOpen(false);
  };

  // Initialize from 7-day cached session synchronously to prevent login screen flicker
  useEffect(() => {
    try {
      const cached = localStorage.getItem('friday_session');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.expiresAt && parsed.expiresAt > Date.now() && parsed.user) {
          setBackendUser(parsed.user);
          setRole(parsed.role || parsed.user.role);
          if (parsed.organizerProfile) {
            setOrganizerProfile(parsed.organizerProfile);
          }
          setLoading(false);
        } else {
          localStorage.removeItem('friday_session');
        }
      }
    } catch (err) {
      console.warn('Failed to parse cached session:', err);
    }
  }, []);

  const fetchBackendUser = async () => {
    try {
      const data = await authService.getCurrentUserProfile();
      if (data) {
        setBackendUser(data);
        setRole(data.role);
        if (data.organizer_profile) {
          setOrganizerProfile(data.organizer_profile);
        }
        // Update 7-day session cache
        const sessionData = {
          user: data,
          role: data.role,
          organizerProfile: data.organizer_profile,
          expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
        };
        localStorage.setItem('friday_session', JSON.stringify(sessionData));
        return data;
      }
    } catch (err) {
      console.warn('Failed to fetch backend profile:', err);
    }
    return null;
  };

  // Sync Firebase Auth State with safety fallback timeout
  useEffect(() => {
    let isMounted = true;

    // Safety timeout: Never allow loading screen to hang for more than 2 seconds
    const safetyTimer = setTimeout(() => {
      if (isMounted) {
        setLoading(false);
      }
    }, 2000);

    const unsubscribe = onAuthStateChanged(
      auth,
      async (user) => {
        if (!isMounted) return;
        setFirebaseUser(user);
        if (user) {
          try {
            await fetchBackendUser();
          } catch (err) {
            console.warn('Failed to load user profile on auth change:', err);
          }
        }
        if (isMounted) {
          setLoading(false);
        }
      },
      (error) => {
        console.warn('Firebase onAuthStateChanged error:', error);
        if (isMounted) {
          setLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
      clearTimeout(safetyTimer);
      unsubscribe();
    };
  }, []);

  // One-click Google Sign-In / Registration
  const signIn = async (intendedRole = 'TRAVELER') => {
    setLoading(true);
    try {
      const result = await authService.signInWithGoogle();
      const idToken = await result.user.getIdToken();
      const email = result.user.email;
      const name = result.user.displayName || email.split('@')[0];
      const profilePic = result.user.photoURL;

      let authRes;
      try {
        // Try logging in first with Google photo sync
        authRes = await authService.loginWithBackend(email, intendedRole, idToken, name, profilePic);
      } catch (loginErr) {
        // If account not found (404), auto-register
        if (loginErr.status === 404) {
          authRes = await authService.registerWithBackend({
            email,
            name,
            role: intendedRole,
            profile_picture: profilePic,
            organizer_name: intendedRole === 'ORGANIZER' ? `${name}'s Expeditions` : undefined,
          });
        } else if (loginErr.status === 403) {
          const detailMsg = loginErr.data?.detail || loginErr.message || 'Aapka pehle se Traveler account bana hua hai. Please Traveler select kar ke login karein.';
          try {
            await fbSignOut(auth);
          } catch (_) {}
          setFirebaseUser(null);
          setBackendUser(null);
          localStorage.removeItem('friday_session');
          toast.error(detailMsg, { duration: 7000 });
          throw new Error(detailMsg);
        } else {
          throw loginErr;
        }
      }

      // Persist 7-Day Session State
      const sessionData = {
        user: authRes.user,
        role: authRes.user.role,
        organizerProfile: authRes.organizer_profile,
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 Days
      };
      localStorage.setItem('friday_session', JSON.stringify(sessionData));
      if (authRes.access_token) {
        localStorage.setItem('friday_auth_token', authRes.access_token);
        localStorage.setItem('token', authRes.access_token);
      }

      setBackendUser(authRes.user);
      setRole(authRes.user.role);
      if (authRes.organizer_profile) {
        setOrganizerProfile(authRes.organizer_profile);
      }

      toast.success(`Welcome, ${authRes.user.name || 'Traveler'}!`);
      return { user: authRes.user, role: authRes.user.role, organizerProfile: authRes.organizer_profile };
    } catch (error) {
      console.error('Sign-in error:', error);
      if (error.message && !error.message.includes('Aapka pehle se')) {
        toast.error(error.message || 'Authentication failed. Please try again.');
      }
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Direct Email / Fast-Track Login (Bypasses Google popup COOP issues)
  const loginWithEmail = async (email, name = '', intendedRole = 'TRAVELER') => {
    setLoading(true);
    try {
      const cleanEmail = (email || '').trim().toLowerCase();
      const cleanName = (name || '').trim() || cleanEmail.split('@')[0] || 'Traveler';

      let authRes;
      try {
        authRes = await authService.loginWithBackend(cleanEmail, intendedRole, 'direct-auth');
      } catch (loginErr) {
        if (loginErr.status === 404 || loginErr.message?.includes('not found')) {
          authRes = await authService.registerWithBackend({
            email: cleanEmail,
            name: cleanName,
            role: intendedRole,
            organizer_name: intendedRole === 'ORGANIZER' ? `${cleanName}'s Expeditions` : undefined,
          });
        } else {
          throw loginErr;
        }
      }

      if (authRes.access_token) {
        localStorage.setItem('friday_auth_token', authRes.access_token);
        localStorage.setItem('token', authRes.access_token);
      }
      setBackendUser(authRes.user);
      setRole(authRes.user.role);
      if (authRes.organizer_profile) {
        setOrganizerProfile(authRes.organizer_profile);
      }

      toast.success(`Welcome, ${authRes.user.name || 'Traveler'}!`);
      return { user: authRes.user, role: authRes.user.role, organizerProfile: authRes.organizer_profile };
    } catch (error) {
      console.error('Email sign-in error:', error);
      toast.error(error.message || 'Sign in failed. Please try again.');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Switch an existing Traveler to an Organizer
  const upgradeToOrganizer = async () => {
    setLoading(true);
    try {
      const res = await authService.upgradeToOrganizer();
      setBackendUser(res.user);
      setRole('ORGANIZER');
      if (res.organizer_profile) {
        setOrganizerProfile(res.organizer_profile);
      }
      toast.success('Successfully upgraded to Organizer account!');
      return res;
    } catch (err) {
      console.error('Upgrade error:', err);
      toast.error(err.message || 'Failed to upgrade to Organizer.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      try {
        await fbSignOut(auth);
      } catch (fbErr) {
        console.warn('Firebase signout warning:', fbErr);
      }
      setFirebaseUser(null);
      setBackendUser(null);
      setOrganizerProfile(null);
      setRole(null);
      localStorage.removeItem('friday_session');
      localStorage.removeItem('friday_auth_token');
      localStorage.removeItem('token');
      localStorage.removeItem('auth_user');
      toast.success('Signed out successfully.');
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error('Failed to sign out.');
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = async () => {
    return await fetchBackendUser();
  };

  const value = {
    firebaseUser,
    backendUser,
    organizerProfile,
    role,
    loading,
    isAuthenticated: !!backendUser,
    isTraveler: role === 'TRAVELER',
    isOrganizer: role === 'ORGANIZER',
    isOnboarded: role === 'ORGANIZER' ? !!organizerProfile?.onboarding_completed : true,
    authModalOpen,
    defaultModalRole,
    openAuthModal,
    closeAuthModal,
    signIn,
    loginWithEmail,
    signOut,
    upgradeToOrganizer,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
