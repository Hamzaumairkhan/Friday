import { signInWithPopup, signOut as fbSignOut } from 'firebase/auth';
import { auth, googleProvider } from './firebase';
import { api } from './api';

export const authService = {
  // Trigger Firebase Google Popup
  async signInWithGoogle() {
    const result = await signInWithPopup(auth, googleProvider);
    const idToken = await result.user.getIdToken();
    return { user: result.user, idToken };
  },

  // Log in with FastAPI backend
  async loginWithBackend(email, intendedRole, idToken, name, profilePicture) {
    return await api.post('/auth/login', {
      email,
      intended_role: intendedRole,
      firebase_id_token: idToken,
      name,
      profile_picture: profilePicture,
    });
  },

  // Register with FastAPI backend (initial registration or traveler/organizer)
  async registerWithBackend(payload) {
    return await api.post('/auth/register', payload);
  },

  // Get current user profile + organizer profile if applicable
  async getCurrentUserProfile() {
    return await api.get('/auth/me');
  },

  // Switch / Upgrade an existing Traveler to an Organizer account
  async upgradeToOrganizer() {
    return await api.post('/auth/upgrade-to-organizer');
  },

  // Switch an existing Organizer account view to Traveler
  async switchToTraveler() {
    return await api.post('/auth/switch-to-traveler');
  },

  // Unified role switcher
  async switchRole(targetRole) {
    return await api.post('/auth/switch-role', { target_role: targetRole });
  },

  // Sign out from Firebase
  async signOut() {
    await fbSignOut(auth);
  },
};

export default authService;
