# Friday — Traveler & Organizer Web Application 🏔️

The modern, responsive web application for **Friday® — AI-Powered Travel Operating System & Verified Marketplace for Pakistan**.

Built for the **Alibaba Cloud AI Hackathon Pakistan 2026**.

---

## 🌟 Key Features

- **🧭 Multi-Step AI Trip Planner**: Guided wizard capturing destination, departure city, group size (1–10), dates, accommodation preferences, and deterministic budgets.
- **✨ Centralized Explore Feed**: Unified chronological feed featuring both verified organizer tour expeditions and public community trips.
- **📋 1-Click Itinerary Cloning ("Copy Trip")**:
  - Travelers can copy any public community itinerary directly into their private planning workspace.
  - Organizers can 1-click duplicate existing organizer tour packages into their workspace.
- **⭐ Universal Reviews & 5-Star Ratings**: Authentic ratings and community feedback for both tour packages and traveler itineraries with host verification badges.
- **💼 Organizer Tour Workspace**: Complete expedition management, live seat counter (`max_travelers`, `seats_booked`), IBFT/bank payment receipt verification, and automated confirmation dispatches.
- **🔄 Feed Scroll Position Restoration**: Preserves the exact feed position in `sessionStorage` when navigating between cards and detail pages.

---

## 🛠️ Technology Stack

- **Framework**: React 19
- **Build Tool**: Vite
- **Styling**: Tailwind CSS & Glassmorphic Custom Styles
- **Icons**: Lucide React
- **Notifications**: React Hot Toast
- **Routing**: React Router v7
- **Authentication**: Firebase Authentication (Google OAuth) + JWT Backend Session Management
- **Image Uploads**: Cloudinary unsigned upload preset

---

## ⚙️ Environment Setup

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Fill in your environment variables in `.env`:
```env
# Backend API URL (Use production URL or local dev)
VITE_API_URL=http://localhost:8000

# Firebase Client Config (For Google OAuth & Authentication)
VITE_FIREBASE_API_KEY=your_firebase_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_firebase_app_id

# Cloudinary Config (For Receipt & Travel Photo Uploads)
VITE_CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_cloudinary_unsigned_preset
```

> **Security Note**: Never commit your actual `.env` file to version control. `.env` and `.env.*` are strictly ignored by `.gitignore`.

---

## 🚀 Running Locally

```bash
# 1. Install dependencies
npm install

# 2. Start the Vite development server
npm run dev

# 3. Build for production
npm run build
```

Local dev server runs at: `http://localhost:5173`
