# FRIDAY® — AI-Powered Travel Operating System for Pakistan

> *"Friday doesn't just tell you where to go — it plans the trip, researches live routes & authentic photography, organizes your group, and connects you with trusted local tour organizers."*

---

## 🌟 Key Highlights & Capabilities

* **🧭 Guided Multi-Step AI Trip Planner**:
  * Step-by-step interactive questionnaire (Departure City, Destination, Group Size 1–10, Duration, Budget, Accommodation, Travel Styles, and Traveler Verification).
  * **Smart Budget-Aware Accommodation Locks**: Automatically locks Comfortable/Premium lodging if budget is below PKR 20k/30k thresholds.
  * **🌐 Live Tavily Web Research & Real Photography**: Live search queries Tavily API for authentic, high-resolution photography and terrain advisories for *any* destination (e.g. Hunza, Skardu, Pine Valley, Ratti Gali, Kumrat).
  * **Structured Day-by-Day Photo Timelines**: Exact time-blocked schedules with categories, costs, and real photo banners.
* **🏔️ Verified Marketplace & Expeditions**:
  * Explore curated tour packages across Northern Pakistan.
  * Real-time seat availability calculation and dynamic capacity tracking.
* **💳 Booking & Payment Verification Lifecycle**:
  * Seamless booking creation, payment receipt/screenshot uploads, and organizer review & verification.
* **💬 Trip Groups & Realtime Community Chat**:
  * Auto-provisioned group chat rooms for every trip package with announcement feeds and IDOR security protection.
* **📲 Instant Multichannel Dispatches**:
  * **WhatsApp Bot (Baileys)**: Dispatches instant formatted briefings and interactive trip links to Lead Travelers and Companions.
  * **Email Service (Resend)**: Sends luxury HTML itineraries to all registered travelers.
* **🔒 7-Day Auto-Login & Pure Google OAuth**:
  * Instant Google authentication with 7-day session persistence (`localStorage`).

---

## 🏛️ System Architecture

```
                                  ┌────────────────────────────────────────┐
                                  │      React 19 + Vite Frontend (5173)   │
                                  └───────────────────┬────────────────────┘
                                                      │ HTTP / REST APIs
                                  ┌───────────────────▼────────────────────┐
                                  │      FastAPI Backend (Port 8000)       │
                                  └───────────────────┬────────────────────┘
                                                      │
                         ┌────────────────────────────┼────────────────────────────┐
                         │                            │                            │
             ┌───────────▼───────────┐   ┌────────────▼────────────┐   ┌───────────▼───────────┐
             │  LangGraph AI Engine  │   │ SQLAlchemy 2.0 (Async)  │   │ External Tool Calling │
             └───────────┬───────────┘   └────────────┬────────────┘   └───────────┬───────────┘
                         │                            │                            │
      ┌──────────────────┴──────────────────┐     ┌───▼────────────┐   ┌───────────┴───────────┐
      │                                     │     │ SQLite Database│   │ • Tavily Web Search   │
┌─────▼───────────────┐ ┌───────────────────▼───┐ │  (friday.db)   │   │ • Open-Meteo Weather  │
│ Google Gemini 2.5   │ │ Groq Llama 3.3 70B    │ └────────────────┘   │ • Nominatim Places    │
│ (Reasoning & Intel) │ │ (Fast Slots/Fallback) │                      │ • Baileys WhatsApp    │
└─────────────────────┘ └───────────────────────┘                      │ • Resend Email Engine │
                                                                       └───────────────────────┘
```

---

## 🛠️ Technology Stack

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend** | React 19, Vite 8, Tailwind CSS, Lucide Icons, React Router v6, React Hot Toast |
| **Backend** | Python 3.12, FastAPI, Pydantic v2, Async SQLAlchemy 2.0, aiosqlite |
| **AI & Orchestration** | LangGraph, LangChain, Google Gemini 2.5 Flash, Groq Llama 3.3 70B Versatile |
| **Research & Tools** | Tavily Web Search API, Open-Meteo API, OpenStreetMap Nominatim, Google Maps |
| **Communications** | Baileys WhatsApp WebSocket microservice, Resend Transactional Email API |
| **Database** | SQLite (`backend/data/friday.db`) with automatic idempotent migrations & seeds |

---

## 🚀 Quickstart & Setup Guide

### 1. Prerequisites
* **Node.js**: v18+ & npm
* **Python**: 3.11 or 3.12
* **Git**

### 2. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Create & activate virtual environment (optional but recommended)
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Start FastAPI backend server (port 8000)
py -3.12 -m uvicorn app.main:app --reload --port 8000
```
*Backend runs on: `http://localhost:8000` (API Docs: `http://localhost:8000/docs`)*

### 3. Frontend Setup
```bash
# Navigate to frontend directory
cd frontend

# Install Node dependencies
npm install

# Start Vite dev server (port 5173)
npm run dev
```
*Frontend runs on: `http://localhost:5173`*

### 4. WhatsApp Service (Optional for Local Bot)
```bash
cd backend/whatsapp_service
npm install
npm start
```
*Runs on port 3001 and connects via Baileys.*

---

## ⚙️ Environment Configuration (`backend/.env`)

```env
# Application
APP_NAME=Friday
APP_VERSION=0.1.0
DEBUG=True
HOST=0.0.0.0
PORT=8000

# SQLite Database (Anchored to backend/data/friday.db)
DATABASE_URL=sqlite+aiosqlite:///data/friday.db

# LLM Providers
GOOGLE_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile

# Live Web Search & Photography
TAVILY_API_KEY=your_tavily_api_key_here

# Weather & Maps
OPENWEATHER_API_KEY=your_openweather_key_here
GOOGLE_MAPS_API_KEY=your_maps_key_here

# Transactional Email (Resend)
RESEND_API_KEY=your_resend_api_key_here
EMAIL_FROM=onboarding@resend.dev
ADMIN_EMAIL=your_admin_email_here

# WhatsApp Bot
WHATSAPP_BOT_URL=http://localhost:3001
```

---

## 🧪 Testing & Verification Suite

Run the full automated test suite (100 integration and agent unit tests):

```bash
# Run pytest from root directory
py -3.12 -m pytest -v
```

---

## 📄 License & Ownership
Created for the **Alibaba Cloud AI Hackathon** — Friday® Travel Operating System.
All Rights Reserved.
