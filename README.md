# FRIDAY — AI Travel Copilot & Trusted Marketplace for Pakistan

> *"Friday doesn't just tell you where to go — it plans the trip, adapts when things change, organizes your group, and connects you with trusted local organizers to make it happen."*

---

## 🏛️ Architecture Overview

Friday is built on a modular multi-agent architecture powered by **FastAPI**, **LangGraph**, and a **Dual-Engine LLM Router (Google Gemini + Groq)**.

```
                  ┌─────────────────────────────────────┐
                  │          FastAPI Backend            │
                  └──────────────────┬──────────────────┘
                                     │
                 ┌───────────────────▼──────────────────┐
                 │       LangGraph Multi-Agent Engine   │
                 └─┬───────┬───────┬───────┬───────────┬─┘
                   │       │       │       │           │
 ┌─────────────────▼┐ ┌────▼─────┐ ┌▼──────▼───┐ ┌─────▼──────┐ ┌─────────────▼┐
 │ConversationAgent │ │ Research │ │  Planner  │ │ Replanner  │ │ Marketplace & │
 │  (Groq/Gemini)   │ │  Agent   │ │   Agent   │ │   Agent    │ │ Booking Agent │
 └──────────────────┘ └────┬─────┘ └───────────┘ └────────────┘ └──────┬────────┘
                           │                                           │
         ┌─────────────────┼──────────────────┐                        │
         │                 │                  │                        │
  ┌──────▼───────┐  ┌──────▼───────┐  ┌───────▼────────┐        ┌──────▼───────┐
  │ Tavily Web   │  │ Google Maps  │  │  OpenWeather   │        │ Resend Email │
  │ Search API   │  │ Places/Routes│  │ 5-Day Forecast │        │ Notification │
  └──────────────┘  └──────────────┘  └────────────────┘        └──────────────┘
```

---

## 🚀 Live Provider Integrations

| Feature | Primary Real Provider | Role / Responsibility |
| :--- | :--- | :--- |
| **Complex Planning & Reasoning** | **Google Gemini** (`gemini-2.5-flash`) | Itinerary generation, replanning reasoning, structured multi-day plans. |
| **Fast Extraction & Low-Latency** | **Groq** (`llama-3.3-70b-versatile`) | Roman Urdu slot extraction, classification, speed-critical tasks. |
| **Web Research & Intel** | **Tavily API** | Live road advisories, travel facts, attractions with provenance URLs. |
| **Places & Attractions** | **Google Maps Places API** | Real tourist attractions, coordinates, ratings, reviews, Maps URLs. |
| **Routing & Drive Times** | **Google Maps Directions API** | Exact road distance, travel durations, transit steps, travel modes. |
| **Live Weather & Forecasts** | **OpenWeather API** | Live temperature, feels like, precipitation chance, 5-day forecast. |
| **Hotels & Restaurants** | **Google Places (Lodging / Dining)** | Real hotel and dining discovery with transparent availability metadata. |
| **Booking Dispatch** | **Resend Email API** | Dispatches real email alerts to tour organizers on booking creation. |
| **Persistent Vector RAG** | **ChromaDB + PyMuPDF** | Persistent vector store on `./data/chroma` with document chunking. |
| **Deterministic Budgeting** | **Pure Python Engine** | Deterministic budget calculations; zero LLM arithmetic hallucinations. |

---

## ⚙️ Environment Configuration (`.env`)

```env
# Application
APP_NAME=Friday
APP_VERSION=0.1.0
DEBUG=True
HOST=0.0.0.0
PORT=8000

# SQLite Database
DATABASE_URL=sqlite+aiosqlite:///./data/friday.db

# Primary AI Reasoning (Google Gemini)
GOOGLE_API_KEY=
GEMINI_MODEL=gemini-2.5-flash

# Fast AI Extraction & Fallback (Groq)
GROQ_API_KEY=
GROQ_MODEL=llama-3.3-70b-versatile

# ChromaDB Vector Store
CHROMA_PATH=./data/chroma

# Embeddings
EMBEDDING_PROVIDER=gemini
EMBEDDING_MODEL=text-embedding-004

# Live Research Tools
TAVILY_API_KEY=
GOOGLE_MAPS_API_KEY=
OPENWEATHER_API_KEY=

# Booking Notifications (Resend)
RESEND_API_KEY=
EMAIL_FROM=onboarding@resend.dev

# Observability
LANGSMITH_API_KEY=
LANGSMITH_TRACING=false
```

---

## 🧪 Testing & Verification

Run the entire test suite (25/25 automated tests):

```bash
pytest -v
```

Execute the End-to-End AI Copilot Verification Script:

```bash
python scripts/verify_copilot.py
```

Run the Backend Server:

```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
