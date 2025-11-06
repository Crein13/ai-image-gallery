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

-- Enable RLS
ALTER TABLE images ENABLE ROW LEVEL SECURITY;
ALTER TABLE image_metadata ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can only see own images" ON images
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only see own metadata" ON image_metadata
    FOR ALL USING (auth.uid() = user_id);
```

-----------------------------------------------------------
⚙️ SETUP WORKFLOW
-----------------------------------------------------------

🐘 Supabase Setup
- Create project
- Enable Auth & Storage
- Create storage public bucket
- Configure Storage Policies
- Run SQL schema (images + image_metadata)
- Save API keys in .env

🧩 Backend Setup (Express)
- npm init
- Install deps: express, dotenv, axios, cors, openai, @prisma/client, multer, sharp, node-vibrant, supabase-js
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

-----------------------------------------------------------
🎯 KEY TAKEAWAYS
-----------------------------------------------------------

### 🏗️ **Architecture Decisions**
- **Separation of Concerns**: Clean split between frontend (React), backend (Express), and services (Supabase, OpenAI)
- **Image Processing Pipeline**: Efficient thumbnail generation with Sharp, color extraction with node-vibrant
- **AI Integration**: Asynchronous processing with GPT-4o for automated tags and descriptions
- **Authentication Flow**: Supabase Auth with JWT tokens and Row-Level Security (RLS) for data isolation

### 📊 **Performance Optimizations**
- **Thumbnail Strategy**: Generate 300px thumbnails during upload to reduce gallery load times
- **Color Caching**: Extract and store dominant colors for fast filter operations
- **Lazy Loading**: Efficient image grid with pagination and search debouncing
- **Database Indexing**: Optimized queries with proper indexes on user_id and search fields
- **Error Boundaries**: Graceful handling of AI service failures without breaking user experience

### 🔒 **Security Implementation**
- **RLS Policies**: Users can only access their own images and metadata
- **File Validation**: MIME type checking and size limits for uploads
- **API Security**: CORS configuration and JWT token validation
- **Environment Variables**: Secure API key management for OpenAI and Supabase
- **Input Sanitization**: Proper validation of search queries and color filters

### 🧪 **Testing Strategy**
- **Comprehensive Test Coverage**: Unit tests for utilities, integration tests for routes and services
- **Mock Strategy**: Proper mocking of external APIs (OpenAI, Supabase) for reliable testing
- **Error Scenarios**: Testing failure cases for AI processing, file uploads, and database operations
- **Performance Testing**: Validation of image processing and search functionality

-----------------------------------------------------------
🚀 FOR IMPROVEMENT
-----------------------------------------------------------

### 🔧 **Technical Enhancements**
- [ ] **Code Refactoring**: Improve design pattern, like Singleton or Factory pattern to make use of Classes
- [ ] **AI Provider Factory**: Refactor to provider pattern for vendor-agnostic AI processing
- [ ] **Caching Layer**: Implement Redis for frequently accessed images and search results
- [ ] **CDN Integration**: Add CloudFront or similar for global image delivery
- [ ] **Database Optimization**: Add full-text search indexes for better search performance
- [ ] **Batch Processing**: Queue system for AI processing of multiple images

### 🎨 **User Experience**
- [ ] **Advanced Search**: Implement fuzzy search, date ranges, and advanced filters
- [ ] **Bulk Operations**: Select multiple images for batch tagging or deletion
- [ ] **Dark Mode**: Theme switching with user preference persistence

### 🤖 **AI & Machine Learning**
- [ ] **AI Provider Abstraction**: Implement AI-agnostic architecture with provider factory pattern
- [ ] **Multi-Provider Support**: Enable switching between OpenAI, Claude, Gemini, and local AI models
- [ ] **Object Detection**: More detailed object and scene recognition
- [ ] **Smart Collections**: AI-suggested photo albums and collections
- [ ] **Duplicate Detection**: Identify and merge similar images
- [ ] **Auto-Enhancement**: AI-powered image quality improvements

### 📊 **Analytics & Monitoring**
- [ ] **Usage Analytics**: Track user behavior and popular features
- [ ] **Performance Metrics**: Monitor API response times and error rates
- [ ] **Cost Optimization**: Track and optimize OpenAI API usage

### 🔗 **Integration & API**
- [ ] **Third-party Integration**: Google Photos, iCloud, Dropbox import
- [ ] **Webhook System**: Real-time notifications for AI processing completion
- [ ] **Collaboration**: Shared albums and collaborative tagging

*As this was an AI project, I also utilized code agents during development to help debug some tech stack I have used for the first time and improve code quality while also following best practices I have built from previous projects. This README, and other README files as well, was generated with the help of code agents.*
