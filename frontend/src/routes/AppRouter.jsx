import { createBrowserRouter, Navigate } from 'react-router-dom';

// Layouts
import MainLayout from '../layouts/MainLayout';
import TravelerLayout from '../layouts/TravelerLayout';
import OrganizerLayout from '../layouts/OrganizerLayout';

// Route Guards
import ProtectedRoute from '../components/guards/ProtectedRoute';
import RoleRoute from '../components/guards/RoleRoute';
import OnboardingGuard from '../components/guards/OnboardingGuard';

// Public Pages
import LandingPage from '../pages/Public/LandingPage';
import AboutPage from '../pages/Public/AboutPage';
import PricingPage from '../pages/Public/PricingPage';
import RegisterPage from '../pages/auth/RegisterPage';

// Traveler Pages
import ExplorePage from '../pages/traveler/ExplorePage';
import PackageDetailPage from '../pages/traveler/PackageDetailPage';
import PlanTripPage from '../pages/traveler/PlanTripPage';
import MyTripsPage from '../pages/traveler/MyTripsPage';
import TravelerGroupsPage from '../pages/traveler/TravelerGroupsPage';
import SavedPage from '../pages/traveler/SavedPage';
import TravelerProfilePage from '../pages/traveler/TravelerProfilePage';
import TripDetailPage from '../pages/traveler/TripDetailPage';
import BookingDetailPage from '../pages/traveler/BookingDetailPage';
import TripGroupPage from '../pages/traveler/TripGroupPage';

// Organizer Pages
import OnboardingPage from '../pages/organizer/OnboardingPage';
import DashboardPage from '../pages/organizer/DashboardPage';
import OrganizerTripsPage from '../pages/organizer/OrganizerTripsPage';
import PackageFormPage from '../pages/organizer/PackageFormPage';
import OrganizerBookingsPage from '../pages/organizer/OrganizerBookingsPage';
import OrganizerProfilePage from '../pages/organizer/OrganizerProfilePage';
import OrganizerGroupsPage from '../pages/organizer/OrganizerGroupsPage';
import OrganizerGroupPage from '../pages/organizer/OrganizerGroupPage';

const router = createBrowserRouter([
  // Standalone Auth Page (Single unified entry point)
  { path: '/login', element: <Navigate to="/register" replace /> },
  { path: '/register', element: <RegisterPage /> },

  // Public Landing, About & Pricing Pages (With Navbar & Footer)
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { path: '', element: <LandingPage /> },
      { path: 'about', element: <AboutPage /> },
      { path: 'pricing', element: <PricingPage /> },
      {
        path: 'organizer/onboarding',
        element: (
          <ProtectedRoute>
            <RoleRoute allowedRole="ORGANIZER">
              <OnboardingPage />
            </RoleRoute>
          </ProtectedRoute>
        ),
      },
    ],
  },

  // Traveler Routes (Protected 3-Column Shell with Left Sidebar)
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <TravelerLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: 'explore', element: <ExplorePage /> },
      { path: 'explore/:packageId', element: <PackageDetailPage /> },
      {
        path: 'plan-trip',
        element: (
          <RoleRoute allowedRole="TRAVELER">
            <PlanTripPage />
          </RoleRoute>
        ),
      },
      {
        path: 'my-trips',
        element: (
          <RoleRoute allowedRole="TRAVELER">
            <MyTripsPage />
          </RoleRoute>
        ),
      },
      {
        path: 'groups',
        element: (
          <RoleRoute allowedRole="TRAVELER">
            <TravelerGroupsPage />
          </RoleRoute>
        ),
      },
      {
        path: 'saved',
        element: (
          <RoleRoute allowedRole="TRAVELER">
            <SavedPage />
          </RoleRoute>
        ),
      },
      {
        path: 'profile',
        element: (
          <RoleRoute allowedRole="TRAVELER">
            <TravelerProfilePage />
          </RoleRoute>
        ),
      },
      {
        path: 'trips/:tripId',
        element: <TripDetailPage />,
      },
      {
        path: 'trips/:tripId/group',
        element: <TripGroupPage />,
      },
      {
        path: 'trips/:tripId/groups',
        element: <TripGroupPage />,
      },
      {
        path: 'groups/:groupId',
        element: <TripGroupPage />,
      },
      {
        path: 'bookings/:bookingId',
        element: (
          <RoleRoute allowedRole="TRAVELER">
            <BookingDetailPage />
          </RoleRoute>
        ),
      },
    ],
  },

  // Organizer Routes (Protected Organizer Sidebar & Topbar)
  {
    path: '/organizer',
    element: (
      <ProtectedRoute>
        <RoleRoute allowedRole="ORGANIZER">
          <OnboardingGuard>
            <OrganizerLayout />
          </OnboardingGuard>
        </RoleRoute>
      </ProtectedRoute>
    ),
    children: [
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'trips', element: <OrganizerTripsPage /> },
      { path: 'trips/new', element: <PackageFormPage /> },
      { path: 'trips/:packageId/edit', element: <Navigate to="/organizer/trips" replace /> },
      { path: 'bookings', element: <OrganizerBookingsPage /> },
      { path: 'profile', element: <OrganizerProfilePage /> },
      { path: 'groups', element: <OrganizerGroupsPage /> },
      { path: 'groups/:groupId', element: <OrganizerGroupPage /> },
      { path: 'trips/:packageId/group', element: <OrganizerGroupPage /> },
    ],
  },

  // Fallback Redirect
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);

export default router;
