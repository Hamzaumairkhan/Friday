# FRIDAY® — AI Travel Operating System & Verified Marketplace for Pakistan 🏔️

### Alibaba Cloud AI Hackathon Pakistan 2026
*Organized by Alkhidmat Foundation Pakistan & Bano Qabil Platform — AI for Pakistan's Future*

> **"Friday doesn't just tell you where to go — it plans the trip, researches live routes & authentic photography, organizes your group, and connects you with trusted local tour organizers in one unified travel workspace."**

---

## 🎯 The Problem

Planning group travel in Pakistan is currently broken and scattered:
* **Fragmented Discovery:** Travelers search for hidden gems across Instagram reels and TikTok — platforms designed for content entertainment, not trip planning or logistics.
* **"WhatsApp Group Hell" for Organizers:** University trip leads and local adventure operators manage 40–100 travelers manually by creating separate WhatsApp groups, chasing bank transfer screenshots, juggling Excel spreadsheets, and repeating the same itinerary FAQs dozens of times.
* **Lack of Trust & Accountability:** Travelers worry about unverified bank transfers and scam tour operators; organizers struggle to verify payment receipts and manage seat capacities.

---

## 💡 The Friday Solution

Friday brings travel discovery, multi-agent AI trip planning, trusted organizer workspaces, and booking management into one cohesive platform:
1. **Interactive AI Trip Planner:** Conversational & structured questionnaire in Roman Urdu and English producing day-by-day itineraries, deterministic budget splits, and real photo timelines.
2. **Centralized Explore Feed & 1-Click Itinerary Cloning ("Copy Trip"):** Travelers can copy any public community expedition into their workspace. Organizers can 1-click duplicate existing tour packages into their workshop to launch new batches in seconds.
3. **Organizer Expedition Workspace:** Complete dashboard for managing tour packages, live seat tracking (`max_travelers`, `seats_booked`), bank receipt audits (`PENDING_VERIFICATION` → `CONFIRMED`), and shareable public tour links.
4. **Universal Reviews & Ratings:** Transparent 5-star rating system with verified badges (`Host Organizer`, `Verified Organizer`, `Community Traveler`).
5. **Multi-Channel Instant Dispatch:** Automated dispatch of itineraries and confirmation alerts directly via **Email (SMTP 587 STARTTLS)** and **WhatsApp**.

---

## 🏛️ System Architecture

```
                                      ┌──────────────────────────────────────────────┐
                                      │      React 19 + Vite Frontend (Port 5173)    │
                                      └──────────────────────┬───────────────────────┘
                                                             │ HTTP / REST APIs
                                      ┌──────────────────────▼───────────────────────┐
                                      │         FastAPI Backend (Port 8000)          │
                                      └──────────────────────┬───────────────────────┘
                                                             │
                  ┌──────────────────────────────────────────┼──────────────────────────────────────────┐
                  │                                          │                                          │
      ┌───────────▼───────────┐                  ┌───────────▼───────────┐                  ┌───────────▼───────────┐
      │   Multi-Agent Engine  │                  │  SQLAlchemy 2.0 Async │                  │ External Tool Calling │
      └───────────┬───────────┘                  └───────────┬───────────┘                  └───────────┬───────────┘
                  │                                          │                                          │
  ┌───────────────┴───────────────┐                  ┌───────▼───────────────┐              ┌───────────┴───────────┐
  │ • Orchestrator Agent          │                  │  MySQL Database       │              │ • OpenWeather API     │
  │ • Planner Agent (Qwen/Gemini) │                  │  (friday_db / Cloud)  │              │ • Tavily Web Search   │
  │ • Research Agent (Live APIs)  │                  └───────────────────────┘              │ • Google Maps API URLs│
  │ • Budget Agent (Deterministic)│                                                         │ • SMTP Email (Port 587│
  │ • Booking Agent (Receipts)    │                  ┌───────────────────────┐              │   STARTTLS)           │
  │ • Marketplace Agent           │                  │  ChromaDB VectorStore │              │ • WhatsApp Service    │
  │ • Replanner & Conv. Agents    │                  │  (Semantic RAG Memory)│              └───────────────────────┘
  └───────────────────────────────┘                  └───────────────────────┘
```

---

## 🛠️ Technology Stack

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend** | React 19, Vite, Tailwind CSS, Lucide React, React Router v7, React Hot Toast |
| **Backend** | Python 3.12, FastAPI (Async Architecture), Pydantic v2, SQLAlchemy 2.0 ORM |
| **Primary AI / LLM** | **Qwen (`qwen/qwen3.8-27b` via Groq Cloud / Alibaba Cloud)** |
| **Reasoning & Planning LLM** | **Google Gemini 2.5 Flash** |
| **Vector Store / RAG** | **ChromaDB** with `text-embedding-004` embeddings for destination knowledge |
| **Database** | MySQL (Production relational database) / SQLite (Local dev fallback) |
| **External Integrations** | OpenWeather API, Tavily Search, Google Maps, SMTP (STARTTLS 587), Baileys WhatsApp |
| **Authentication** | Firebase Authentication (Google OAuth) + JWT Session Security |

---

## 🔒 Security & Environment Configuration

> **IMPORTANT**: No API keys, tokens, or credentials are committed to this repository. All sensitive parameters are managed exclusively via environment variables.

Both the backend and frontend include template configuration files with placeholder values:

### 1. Backend Environment Setup (`backend/.env`)
Copy the example file in the `backend/` directory:
```bash
cp backend/.env.example backend/.env
```
Key variables to configure in `backend/.env`:
* `GROQ_API_KEY`: API key for Qwen LLM routing.
* `GOOGLE_API_KEY`: API key for Gemini 2.5 Flash reasoning.
* `DATABASE_URL`: MySQL connection URL (e.g. `mysql+asyncmy://user:pass@localhost:3306/friday_db`).
* `OPENWEATHER_API_KEY`: Real-time weather forecasting.
* `TAVILY_API_KEY`: Live web research for attractions & routes.
* `SMTP_USER` & `SMTP_PASSWORD`: SMTP credentials for automated dispatch.

### 2. Frontend Environment Setup (`frontend/.env`)
Copy the example file in the `frontend/` directory:
```bash
cp frontend/.env.example frontend/.env
```
Key variables to configure in `frontend/.env`:
* `VITE_API_URL`: Backend API URL (`http://localhost:8000`).
* `VITE_FIREBASE_*`: Firebase Client authentication keys.
* `VITE_CLOUDINARY_*`: Cloudinary upload configuration for payment receipts and photos.

---

## 🚀 Quickstart & Local Setup

### 1. Prerequisites
* **Node.js**: v18+ & npm
* **Python**: 3.11 or 3.12
* **Git**
* **MySQL** (or default local SQLite fallback)

### 2. Backend Installation & Run
```bash
# Navigate to backend directory
cd backend

# Create & activate virtual environment
python -m venv .venv
# Windows:
.\.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Start FastAPI backend server
py -3.12 -m uvicorn app.main:app --reload --port 8000
```
*Backend is live at: `http://localhost:8000` (Swagger Docs: `http://localhost:8000/docs`)*

### 3. Frontend Installation & Run
```bash
# Navigate to frontend directory
cd frontend

# Install Node dependencies
npm install

# Start Vite development server
npm run dev
```
*Frontend is live at: `http://localhost:5173`*

---

## 👥 The Team

* **Hamza Umair Khan**: Team Lead — Full Stack Architecture, Multi-Agent AI Orchestration, FastAPI Backend & Cloud Database.
* **Haris**: Co-Founder / Frontend Lead — UI/UX Engineering, Traveler & Organizer Workspaces, Interactive Experiences.

---

## 📄 License & Attribution
Created for the **Alibaba Cloud AI Hackathon Pakistan 2026**.
All Rights Reserved.
