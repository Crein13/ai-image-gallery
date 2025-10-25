===========================================================
🧠 PROJECT CONTEXT — AI Image Gallery (React + Express + Supabase + OpenAI)
===========================================================

🎯 GOAL:
Build a full-stack AI-powered Image Gallery web app that allows users to:
1. Upload images (original + thumbnail)
2. Automatically generate AI-based tags, captions, and dominant colors
3. Search/filter images by text or color
4. Authenticate via Supabase (email/password)
5. Access only their own content (RLS)

-----------------------------------------------------------
🗂️ FOLDER STRUCTURE
-----------------------------------------------------------

ai-image-gallery/
├── frontend/                  # React + Vite (Vercel)
│   ├── src/
│   │   ├── components/        # GalleryGrid, ImageModal, UploadZone
│   │   ├── pages/             # Auth, Gallery, Upload
│   │   ├── hooks/             # useAuth, useUpload, useSearch
│   │   ├── services/          # axios API clients
│   │   ├── supabaseClient.js  # Supabase setup
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── .env
│   └── package.json
│
├── backend/                   # Express.js (Railway/Render)
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.js        # Auth routes (login/logout)
│   │   │   ├── images.js      # Upload/list/search images
│   │   │   └── ai.js          # AI tagging/descriptions
│   │   ├── services/
│   │   │   ├── supabaseClient.js   # DB + Storage
│   │   │   ├── openaiService.js    # AI processing (OpenAI API)
│   │   │   └── prismaClient.js     # ORM (Supabase PostgreSQL)
│   │   ├── utils/
│   │   │   ├── imageProcessor.js   # Resize, thumbnail (sharp)
│   │   │   ├── colorExtractor.js   # Extract dominant colors
│   │   │   └── errorHandler.js     # Centralized error handling
│   │   ├── app.js
│   │   └── server.js
│   ├── prisma/
│   │   └── schema.prisma
│   ├── .env
│   └── package.json
│
└── README.md

-----------------------------------------------------------
🧩 TECH STACK
-----------------------------------------------------------

| Layer | Tech | Purpose |
|-------|------|----------|
| Frontend | React (Vite) + TailwindCSS | Auth, Gallery, Upload UI |
| Backend | Express.js | REST API + AI Integration |
| Database | Supabase (PostgreSQL) | User & image metadata |
| ORM | Prisma | Type-safe DB access |
| AI | OpenAI API (GPT-4o-mini or Vision) | Tags, description, colors |
| Auth | Supabase Auth | Email/password login |
| Storage | Supabase Storage | Original + thumbnail images |
| Hosting | Frontend: Vercel / Backend: Railway | Free-tier friendly |
| Security | HTTPS, JWT, RLS, .env | Cloud-safe setup |

-----------------------------------------------------------
🧱 Database Schema (SQL on Supabase)
-----------------------------------------------------------

```sql
CREATE TABLE images (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  filename VARCHAR(255),
  original_path TEXT,
  thumbnail_path TEXT,
  uploaded_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE image_metadata (
  id SERIAL PRIMARY KEY,
  image_id INTEGER REFERENCES images(id),
  user_id UUID REFERENCES auth.users(id),
  description TEXT,
  tags TEXT[],
  colors VARCHAR(7)[],
  ai_processing_status VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE images ENABLE ROW LEVEL SECURITY;
ALTER TABLE image_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only see own images" ON images
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only see own metadata" ON image_metadata
  FOR ALL USING (auth.uid() = user_id);

-----------------------------------------------------------
⚙️ SETUP WORKFLOW (Day-by-Day)
-----------------------------------------------------------

🗓️ Day 1 — Supabase Setup
- Create project
- Enable Auth & Storage
- Run SQL schema (images + image_metadata)
- Save API keys in .env

🗓️ Day 2 — Backend Setup (Express)
- npm init
- Install deps: express, dotenv, axios, cors, openai, @prisma/client, sharp, color-thief-node, supabase-js
- Configure Supabase client + Prisma
- Implement image upload and thumbnail generator
- Add OpenAI tagging route

🗓️ Day 3 — Frontend Setup (React + Vite)
- npm create vite@latest frontend --template react
- npm install @supabase/supabase-js axios react-router-dom tailwindcss
- Add Supabase Auth (login/signup)
- Create upload and gallery pages
- Connect to backend API

🗓️ Day 4 — Integration & Testing
- Test end-to-end upload → AI processing → Gallery view
- Implement search + filter by color
- Validate RLS and secure API keys
- Add loading/error states

🗓️ Day 5 — Deployment
- Deploy frontend (Vercel)
- Deploy backend (Railway/Render)
- Configure environment variables securely
- Final README + AI service comparison

-----------------------------------------------------------
🔒 CLOUD SECURITY PRACTICES
-----------------------------------------------------------
- Store keys in .env only
- Use Supabase Row-Level Security (RLS)
- Enable HTTPS for deployed endpoints
- Sanitize uploads (check MIME type, size)
- Restrict CORS to Vercel domain only
- Handle AI + Supabase API errors gracefully
