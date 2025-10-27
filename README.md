***
# 🧠 PROJECT CONTEXT — AI Image Gallery (React + Express + Supabase + OpenAI)
***

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
```
ai-image-gallery/
├── frontend/                     # React + Vite (Vercel)
│   ├── src/
│   │   ├── components/           # GalleryGrid, ImageModal, UploadZone
│   │   ├── pages/                # Auth, Gallery, Upload
│   │   ├── hooks/                # useAuth, useUpload, useSearch
│   │   ├── services/             # axios API clients
│   │   ├── supabaseClient.js     # Supabase setup
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── __tests__/            # Frontend unit + integration tests
│   │       ├── components/
│   │       │   └── GalleryGrid.test.jsx
│   │       ├── hooks/
│   │       │   └── useUpload.test.jsx
│   │       └── pages/
│   │           └── Gallery.test.jsx
│   ├── vitest.config.js          # Vitest config for testing
│   ├── .env
│   └── package.json
│
├── backend/                      # Express.js (Railway/Render)
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── images.js
│   │   │   └── ai.js
│   │   ├── services/
│   │   │   ├── supabaseClient.js
│   │   │   ├── openaiService.js
│   │   │   └── prismaClient.js
│   │   ├── utils/
│   │   │   ├── imageProcessor.js
│   │   │   ├── colorExtractor.js
│   │   │   └── errorHandler.js
│   │   ├── app.js
│   │   ├── server.js
│   │   └── __tests__/            # Backend unit + integration tests
│   │       ├── routes/
│   │       │   └── images.test.js
│   │       ├── services/
│   │       │   └── openaiService.test.js
│   │       └── utils/
│   │           └── imageProcessor.test.js
│   ├── prisma/
│   │   └── schema.prisma
│   ├── .env
│   ├── jest.config.js
│   └── package.json
│
└── README.md
```
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
-- Install pgvector extension for semantic search
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;  -- For fuzzy text search

CREATE TABLE images (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  original_path TEXT NOT NULL,
  thumbnail_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR(100),
  uploaded_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE image_metadata (
  id SERIAL PRIMARY KEY,
  image_id INTEGER REFERENCES images(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- AI-generated content
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  colors VARCHAR(7)[] DEFAULT '{}',
  dominant_color VARCHAR(7),

  -- Semantic search (OpenAI embeddings for "vibe" search)
  embedding vector(1536),

  -- Processing status
  ai_processing_status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_images_user_id ON images(user_id);
CREATE INDEX idx_images_uploaded_at ON images(uploaded_at DESC);

CREATE INDEX idx_metadata_user_id ON image_metadata(user_id);
CREATE INDEX idx_metadata_image_id ON image_metadata(image_id);
CREATE INDEX idx_metadata_tags_gin ON image_metadata USING GIN(tags);
CREATE INDEX idx_metadata_colors_gin ON image_metadata USING GIN(colors);
CREATE INDEX idx_metadata_description_fts ON image_metadata USING GIN(to_tsvector('english', description));

-- Vector similarity index for semantic search
CREATE INDEX idx_metadata_embedding_ivfflat ON image_metadata
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Row Level Security
ALTER TABLE images ENABLE ROW LEVEL SECURITY;
ALTER TABLE image_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only see own images" ON images
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only see own metadata" ON image_metadata
  FOR ALL USING (auth.uid() = user_id);

-- Stored procedure for vector search (Google Photos-style semantic search)
CREATE OR REPLACE FUNCTION vector_search(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.8,
  match_count int DEFAULT 20,
  user_filter uuid DEFAULT NULL
)
RETURNS TABLE (
  id int,
  image_id int,
  description text,
  tags text[],
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    image_metadata.id,
    image_metadata.image_id,
    image_metadata.description,
    image_metadata.tags,
    1 - (image_metadata.embedding <=> query_embedding) as similarity
  FROM image_metadata
  WHERE
    (user_filter IS NULL OR image_metadata.user_id = user_filter)
    AND image_metadata.embedding IS NOT NULL
    AND 1 - (image_metadata.embedding <=> query_embedding) > match_threshold
  ORDER BY image_metadata.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Stored procedure for fuzzy tag search
CREATE OR REPLACE FUNCTION search_images_by_tags(
  search_term text,
  user_filter uuid DEFAULT NULL
)
RETURNS TABLE (
  id int,
  image_id int,
  description text,
  tags text[],
  match_score float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    image_metadata.id,
    image_metadata.image_id,
    image_metadata.description,
    image_metadata.tags,
    similarity(array_to_string(image_metadata.tags, ' '), search_term) as match_score
  FROM image_metadata
  WHERE
    (user_filter IS NULL OR image_metadata.user_id = user_filter)
    AND (
      search_term = ANY(image_metadata.tags)
      OR similarity(array_to_string(image_metadata.tags, ' '), search_term) > 0.3
    )
  ORDER BY match_score DESC;
END;
$$;
```

-----------------------------------------------------------
⚙️ SETUP WORKFLOW
-----------------------------------------------------------

🐘 Supabase Setup
- Create project
- Enable Auth & Storage
- Run SQL schema (images + image_metadata)
- Save API keys in .env

🧩 Backend Setup (Express)
- npm init
- Install deps: express, dotenv, axios, cors, openai, @prisma/client, multer, sharp, color-thief-node, supabase-js
- Configure Supabase client + Prisma
- Implement image upload and thumbnail generator
- Add OpenAI tagging route

⚛️ Frontend Setup (React + Vite)
- npm create vite@latest frontend --template react
- npm install @supabase/supabase-js axios react-router-dom tailwindcss
- Add Supabase Auth (login/signup)
- Create upload and gallery pages
- Connect to backend API

🧪 Integration & Testing
- Test end-to-end upload → AI processing → Gallery view
- Implement search + filter by color
- Validate RLS and secure API keys
- Add loading/error states

🚀 Deployment
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
- Handle AI + Supabase API errors
