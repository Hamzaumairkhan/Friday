# FRIDAY® — AI Travel Operating System & Verified Marketplace for Pakistan 🏔️

> **Plan it. Discover it. Book it. Run it. — All in one place.**

Friday is an AI-powered collaborative travel platform built for Pakistan that combines AI trip planning, travel discovery, community itineraries, verified tour organizers, booking management, and group-trip operations into one unified workspace.

Instead of jumping between Instagram, TikTok, Google Maps, WhatsApp groups, spreadsheets, bank transfers, and scattered itinerary messages, Friday brings the complete journey into one platform.

*Built for the **Alibaba Cloud AI Hackathon Pakistan 2026** under the theme **AI for Pakistan's Future**.*

---

## 🚀 What is Friday?

Travel planning in Pakistan is rarely a single workflow.

A traveler might discover a destination through an Instagram Reel, search for places on Google, ask friends on WhatsApp, manually build an itinerary, calculate a budget, find a tour organizer, transfer money through a bank account, send a payment screenshot, and then join another WhatsApp group just to receive trip updates.

For organizers, the process is even more fragmented. Managing a 40, 60, or 100-person trip can mean:
- Creating and managing multiple WhatsApp groups
- Collecting payments manually
- Checking payment screenshots
- Maintaining spreadsheets
- Tracking available seats
- Repeatedly sending itineraries
- Answering the same participant questions
- Sharing documents and updates across different channels

Friday turns this fragmented process into one travel operating system:

```
DISCOVER  →  PLAN WITH AI  →  EXPLORE COMMUNITY TRIPS  →  CUSTOMIZE / COPY  →  FIND A VERIFIED ORGANIZER  →  BOOK  →  VERIFY PAYMENT  →  MANAGE THE TRIP
```

---

## 🎯 The Problem

### For Travelers
Travel discovery platforms are optimized for content consumption, not complete trip planning. Travelers often:
- Discover destinations through Instagram and TikTok
- Don't know which places are actually worth visiting
- Struggle to turn inspiration into a realistic itinerary
- Manually calculate budgets
- Depend on friends or scattered WhatsApp conversations
- Have difficulty finding trustworthy local organizers
- Receive trip information across multiple disconnected channels

A beautiful travel Reel can inspire someone to visit Hunza, but it doesn't answer:
- *Where should I stay?*
- *What should I visit first?*
- *How much will the trip cost?*
- *What route makes sense?*
- *Is the weather suitable?*
- *Is there a trusted organizer?*
- *How do I book it?*

### For Trip Organizers
Organizing a group trip is essentially a small operations problem. Imagine a university society organizing a trip for 40–100 participants. The organizer may need to juggle:

```
WhatsApp (Communication) → Excel (Participant Tracking) → Bank Account (Payments) → Screenshots (Payment Proof) → Google Maps (Routes) → PDF/Images (Itinerary) → WhatsApp Again (Updates & FAQs)
```

The result is fragmented information, repetitive work, and a higher chance of mistakes. Friday replaces this scattered workflow with a dedicated organizer workspace.

---

## 💡 The Friday Solution

Friday combines five major layers into one platform:

### 1. 🤖 AI Travel Copilot
Users can describe their trip naturally in Roman Urdu or English.  
*Example:* `"Mujhe 3 din ka Hunza trip plan karna hai, budget 50 hazar hai."`  
Friday transforms that request into a structured travel plan containing:
- Destination research & advisories
- Curated activities & points of interest
- Day-by-day structured itinerary
- Time planning & durations
- Estimated costs & category allocations
- Verified interactive Google Maps
- Real-time weather forecasting
- Practical travel recommendations

### 2. 🌍 Explore & Community Expeditions
Travelers can discover public trips created by the community and tour operators:
```
Explore  →  Open a Trip  →  Copy Trip  →  Customize  →  Use
```
A traveler can take an existing itinerary and modify dates, budget, stops, activities, and preferences — turning travel planning into a collaborative experience rather than a blank page.

### 3. 🏢 Verified Organizer Marketplace
Friday connects travelers with tour organizers through a dedicated marketplace. Organizers publish structured packages containing:
- Destination, dates, duration
- Transparent per-person pricing
- Max capacity & remaining seats
- Inclusions & exclusions
- Complete day-by-day itinerary
- Verified direct photography
- Verified host badges & ratings

### 4. 🧑‍💼 Organizer Expedition Workspace
Instead of spreadsheets and manual chats, organizers manage group expeditions directly:
- Build & publish rich tour packages
- 1-click duplicate existing packages for new tour batches
- Real-time capacity & seat tracking (`max_travelers` vs `seats_booked`)
- Complete booking pipeline (`PENDING` → `PROOF_UPLOADED` → `VERIFIED`)
- Traveler contact lists and companion manifests
- Bank receipt inspection and audit
- Shareable standalone tour links (`/packages/:id`)

### 5. 🔐 Trust & Verification
Trust is critical when money and group expeditions are involved:
- Multi-tier verification badges (`Host Organizer`, `Verified Organizer`, `Community Traveler`)
- Bank payment screenshot inspection and verification
- Real-time booking status tracking
- Community 5-star traveler reviews and ratings
- Organizer expedition history and public host profiles
- Live capacity visibility

---

## ✨ Core Features

### 🤖 AI Trip Planning & Multi-Agent Architecture

Friday uses a multi-agent AI architecture to transform natural language travel requests into structured plans:

```
User: "Plan a 3-day Hunza trip for 4 people under PKR 50,000."
                            │
                            ▼
                    ┌───────────────┐
                    │ Orchestrator  │
                    └───────┬───────┘
            ┌───────────────┼───────────────┐
            ▼               ▼               ▼
    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
    │   Research   │ │   Planner    │ │    Budget    │
    │  (Live APIs) │ │ (Itinerary)  │ │ (Cost Split) │
    └──────────────┘ └──────────────┘ └──────────────┘
            └───────────────┬───────────────┘
                            ▼
                     Final Trip Plan
```

- **Orchestrator Agent:** Understands user intent and coordinates agent execution.
- **Conversation Agent:** Maintains conversational travel context in English and Roman Urdu.
- **Research Agent:** Collects live weather, route times, and point-of-interest data.
- **Planner Agent:** Crafts realistic, day-by-day scheduled itineraries.
- **Budget Agent:** Deterministically calculates transportation, accommodation, food, and activities.
- **Marketplace Agent:** Connects trip requirements with available organizer packages.
- **Booking Agent:** Manages seat reservations and payment verification lifecycle.
- **Replanner Agent:** Adapts existing trips when dates, budgets, or group sizes change.

### 🔎 Travel Research & External Integrations
- **OpenWeather API:** Real-time destination temperatures, conditions, and multi-day travel forecasts.
- **Tavily Web Search:** Deep web intelligence for Pakistani tourist spots, routes, and road conditions.
- **Google Maps:** Dynamic pin-point navigation coordinates and route links.
- **SMTP Email (STARTTLS 587 / SSL 465):** Automated transactional dispatch of receipts and itineraries.
- **WhatsApp (Baileys Service):** Instant mobile alerts for bookings, itineraries, and payment approvals.
- **ChromaDB Semantic RAG:** Localized Pakistan destination memory and attraction data.

### 💰 Intelligent Budget Planning
Friday's budget engine breaks trips down into realistic categories:
```
Total Budget: PKR 50,000
 ├── Transportation (28%)
 ├── Accommodation (35%)
 ├── Food & Dining (20%)
 ├── Sightseeing & Tickets (10%)
 └── Emergency Reserve (7%)
```

### 🗺️ Explore Feed & Copy Trip
- Discover public community expeditions and organizer tour packages.
- Single-click **"Copy Trip"** allows travelers to fork public itineraries into their private workspaces.
- Organizers can 1-click duplicate existing packages into new tour batches with updated dates.

### 📊 Live Capacity Tracking & Booking Management
Bookings move through strict state machines:
```
PENDING_PAYMENT  →  PROOF_UPLOADED / PENDING_VERIFICATION  →  CONFIRMED (or REJECTED)
```

### 💳 Payment Proof Verification Workflow
1. Traveler starts a booking and receives host bank account details.
2. Traveler makes the bank transfer and uploads receipt screenshot.
3. Organizer reviews receipt in their Expedition Workspace.
4. Upon verification, seats decrement, booking updates to `CONFIRMED`, and confirmation is dispatched via Email & WhatsApp.

### 📩 Multi-Channel Instant Notifications
- Booking confirmations and payment receipts sent to travelers.
- New reservation and receipt upload alerts sent to organizers.
- Full itinerary schedules and packing checklists delivered via Email & WhatsApp.

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    React 19 + Vite Frontend                 │
│                     Friday Web Application                  │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP / REST
┌──────────────────────────────▼──────────────────────────────┐
│                    FastAPI Backend API Layer                │
└───────────────┬──────────────────────────────┬──────────────┘
                │                              │
        ┌───────▼──────┐               ┌───────▼──────────────┐
        │  Multi-Agent │               │ SQLAlchemy 2.0 Async │
        │   AI Engine  │               │      MySQL ORM       │
        └───────┬──────┘               └───────┬──────────────┘
                │                              │
    ┌───────────┴───────────┐          ┌───────▼──────────────┐
    │ • Orchestrator Agent  │          │   MySQL Database     │
    │ • Conversation Agent  │          │  (Production friday) │
    │ • Research Agent      │          └──────────────────────┘
    │ • Planner Agent       │
    │ • Budget Agent        │          ┌──────────────────────┐
    │ • Marketplace Agent   │          │  ChromaDB Vector DB  │
    │ • Booking Agent       │          │ (Semantic RAG Store) │
    │ • Replanner Agent     │          └──────────────────────┘
    └───────────┬───────────┘
                │
┌───────────────▼─────────────────────────────────────────────┐
│               External Travel & Communication Tools         │
│  • OpenWeather API       • Google Maps Navigation           │
│  • Tavily Web Search     • SMTP (STARTTLS / Dual Port)      │
│  • Baileys WhatsApp Bot  • Firebase Auth (Google OAuth)     │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Technology Stack

| Layer | Technology | Details |
| :--- | :--- | :--- |
| **Frontend** | React 19, Vite, Tailwind CSS | High-performance SPA with modern glassmorphism aesthetic |
| **UI Components** | Lucide React, React Hot Toast | Responsive icons, toast notifications, interactive modals |
| **Routing** | React Router v7 | Dynamic client-side routing with role-based access control |
| **Backend** | Python 3.12, FastAPI | Fully asynchronous REST API architecture |
| **Data Validation** | Pydantic v2 | Strict request/response schema modeling |
| **ORM & Database** | SQLAlchemy 2.0 Async, MySQL | Production relational database (SQLite local dev fallback) |
| **Primary AI / LLM** | Qwen via Groq Cloud / Alibaba Cloud | High-speed LLM for conversational travel planning |
| **Reasoning LLM** | Google Gemini 2.5 Flash | Deep itinerary reasoning and dynamic schedule structuring |
| **Vector Store** | ChromaDB (`text-embedding-004`) | Destination semantic RAG memory |
| **Weather** | OpenWeather API | Real-time weather and forecasting |
| **Web Research** | Tavily Search API | Live tourist attraction and route discovery |
| **Maps** | Google Maps Universal URLs | Verified destination and activity route coordinates |
| **Email** | Direct SMTP (Port 587 STARTTLS / Port 465 SSL) | Luxury HTML branded transactional emails |
| **WhatsApp** | Baileys Microservice | Direct WhatsApp bot for booking alerts & receipts |
| **Authentication** | Firebase Authentication + JWT Sessions | Google OAuth, session cookies, and role-based ACL |

---

## 🧩 Application Structure

### Traveler Experience
- **Explore Feed:** Discover community trips and organizer tour packages.
- **AI Trip Planner:** Conversational & structured questionnaire in English & Roman Urdu.
- **My Trips:** Manage upcoming, planned, and completed expeditions.
- **Trip Detail & Itinerary:** Interactive day-by-day itinerary, budget split, and maps.
- **Saved Expeditions:** Bookmark tour packages and public itineraries.
- **Traveler Profile:** Manage personal info, reviews, and bookings.

### Organizer Workspace
- **Expeditions & Packages:** Create, publish, edit, and duplicate tour packages.
- **Live Seat Tracking:** Monitor capacity, remaining seats, and booked participants.
- **Booking Management:** Audit payment proofs and confirm or reject traveler seats.
- **Public Tour Listings:** Clean shareable tour page link (`/packages/:id`).
- **Organizer Profile:** Verified badges, credentials, ratings, and social proof.

---

## 🔑 Environment Configuration

> **IMPORTANT**: No API keys, tokens, or credentials are committed to this repository. All sensitive parameters must be supplied via environment variables.

### Backend Setup (`backend/.env`)
Create `backend/.env` from `backend/.env.example`:
```ini
GROQ_API_KEY=your_groq_api_key_here
GOOGLE_API_KEY=your_google_api_key_here
DATABASE_URL=mysql+asyncmy://user:password@localhost:3306/friday_db
OPENWEATHER_API_KEY=your_openweather_key_here
TAVILY_API_KEY=your_tavily_key_here
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password_here
EMAIL_FROM=your_email@gmail.com
ADMIN_EMAIL=your_admin_email@gmail.com
WHATSAPP_SERVICE_URL=https://your-whatsapp-bot-instance.railway.app
FRONTEND_URL=http://localhost:5173
```

### Frontend Setup (`frontend/.env`)
Create `frontend/.env` from `frontend/.env.example`:
```ini
VITE_API_URL=http://localhost:8000/api/v1
VITE_FIREBASE_API_KEY=your_firebase_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_unsigned_preset
```

---

## 🚀 Local Development

### Prerequisites
- Node.js 18+ & npm
- Python 3.11+
- MySQL (or SQLite local fallback)
- Git

### 1. Clone the Repository
```bash
git clone https://github.com/Hamzaumairkhan/Friday.git
cd Friday
```

### 2. Backend Setup
```bash
cd backend

# Create & activate virtual environment
python -m venv .venv
# Windows:
.\.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env

# Run FastAPI server
py -3.12 -m uvicorn app.main:app --reload --port 8000
```
- API live at: `http://localhost:8000`
- Interactive Swagger API Docs: `http://localhost:8000/docs`

### 3. Frontend Setup
```bash
cd ../frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env

# Start development server
npm run dev
```
- Frontend live at: `http://localhost:5173`

---

## 📁 Project Structure

```
Friday/
├── backend/
│   ├── app/
│   │   ├── agents/          # Multi-agent orchestrators & planners
│   │   ├── api/             # FastAPI REST endpoints (trips, packages, bookings, reviews)
│   │   ├── core/            # Config, logging, security, database session
│   │   ├── database/        # Async SQLAlchemy connection & auto-migrations
│   │   ├── models/          # Relational entities (Trip, Package, Booking, User, Review)
│   │   ├── repositories/    # Clean DB query abstractions
│   │   ├── schemas/         # Pydantic request & response models
│   │   ├── services/        # Business logic, email templates, research, geo
│   │   ├── tools/           # OpenWeather, Tavily, Maps, WhatsApp, SMTP
│   │   └── main.py          # FastAPI application entrypoint
│   ├── .env.example
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/      # UI components, modals, navbar, cards
│   │   ├── context/         # AuthContext (Firebase + session sync)
│   │   ├── hooks/           # Custom React hooks
│   │   ├── pages/           # Traveler and Organizer pages
│   │   ├── services/        # Axios API clients
│   │   └── App.jsx          # Route declarations
│   ├── .env.example
│   ├── package.json
│   └── vite.config.js
├── .gitignore
└── README.md
```

---

## 🧪 Example User Journey

**User Prompt:**
> *"Mujhe 3 din ka Hunza trip plan karna hai. Budget 50,000 hai."*

1. **Natural Language Understanding:** Friday extracts destination (Hunza), duration (3 days), origin (Islamabad/default), and budget (PKR 50,000).
2. **Geographic Verification:** Pakistan Geo service validates Pakistani destination and suggests optimal transit routes.
3. **Live Research:** Fetches live weather conditions, seasonal tips, and authentic photo assets.
4. **Deterministic Budget Breakdown:** Allocates transport, hotel, food, and sightseeing expenses within the PKR 50,000 limit.
5. **Day-by-Day Generation:** Creates morning, afternoon, and evening schedule with Google Maps route pins.
6. **Multi-Channel Dispatch:** Dispatches itinerary and packing list directly to traveler's Email & WhatsApp.
7. **Marketplace Matching:** Recommends verified tour packages for Hunza if user prefers a guided expedition.

---

## 🧑‍💼 Example Organizer Journey

**Scenario:** University society lead organizing a 50-person Hunza expedition.

| Traditional Workflow | Friday Workflow |
| :--- | :--- |
| Create WhatsApp group | Create Expedition in Workspace |
| Collect details in Excel | Set dates, pricing, capacity (50 seats) |
| Chase bank receipts manually | Share 1 clean Friday package link |
| Compare screenshots with bank apps | Travelers book & upload transfer screenshot |
| Repeat itinerary FAQs 100 times | 1-click verify receipt → auto Email/WhatsApp confirmation |
| Manual seat tally | Live capacity bar tracks remaining seats automatically |

---

## 🌟 Why Friday?

Most travel platforms stop at *"here are some places you might like."*  
Friday connects the complete travel lifecycle:

```
DISCOVER  →  DECIDE  →  PLAN  →  BOOK  →  ORGANIZE  →  TRAVEL
```

### 🇵🇰 Built for Pakistan
- Understands Roman Urdu and local colloquialisms (`"hazar"`, `"chai stop"`, `"jeep track"`).
- Designed for local payment infrastructure (Bank Transfer / EasyPaisa / JazzCash receipt audit).
- Integrates WhatsApp and Email — the primary channels Pakistanis use for group travel coordination.
- Accurate Pakistani destination knowledge and road transit advisories.

---

## 🏆 Alibaba Cloud AI Hackathon Pakistan 2026

- **Event:** Alibaba Cloud AI Hackathon Pakistan 2026
- **Organized By:** Alkhidmat Foundation Pakistan & Bano Qabil Platform
- **Theme:** AI for Pakistan's Future
- **Category:** AI-Powered Tourism & Digital Infrastructure

---

## 🔮 Future Roadmap

- **AI Enhancements:** Personalized travel memory, real-time weather disruption auto-replanning, and multi-language voice input.
- **Marketplace Growth:** Tour operator analytics dashboards, automated seat hold timers, and regional guide verification.
- **Group Operations:** Live GPS companion location tracking, emergency SOS alerts, and group expense splitters.

---

## 👥 Team

- **Hamza Umair Khan** — Team Lead
  - Full-Stack Architecture, Multi-Agent AI Orchestration, FastAPI Backend, Database Architecture, Cloud Deployment, Product Engineering.
- **Haris** — Co-Founder / Frontend Lead
  - Product Design, UI/UX Engineering, Traveler Experience, Organizer Workspace, Interactive Experiences.

---

## 📌 Project Status

Friday is a fully functional, deployed product built for the Alibaba Cloud AI Hackathon Pakistan 2026 with end-to-end working flows for AI travel planning, travel discovery, community itineraries, organizer packages, booking lifecycle, receipt audits, reviews, email alerts, and WhatsApp messaging.

---

## 🌐 Links

- **GitHub Repository:** [https://github.com/Hamzaumairkhan/Friday](https://github.com/Hamzaumairkhan/Friday)
- **Hackathon:** Alibaba Cloud AI Hackathon Pakistan 2026

---

## 📄 License

Created for the **Alibaba Cloud AI Hackathon Pakistan 2026**.  
© 2026 Friday®. All Rights Reserved.

---

<div align="center">
  <h3>FRIDAY®</h3>
  <p><strong>Your AI Travel Copilot. Your Travel Marketplace. Your Trip Workspace.</strong></p>
  <p><em>Discover less. Plan better. Travel together.</em></p>
  <p>🏔️ 🇵🇰 🤖</p>
</div>
