# AI Image Gallery - Backend API

Express.js REST API for the AI Image Gallery application. Handles image uploads, AI-powered metadata generation using OpenAI GPT-4o, and provides endpoints for authentication, search, and image management.

## 🎯 Overview

This backend provides:
- **Authentication**: User signup/signin via Supabase Auth (JWT-based)
- **Image Upload**: Multi-file upload with automatic thumbnail generation and color extraction
 - **AI Processing**: Background processing using OpenAI GPT-4o for tags and descriptions
- **Image Management**: CRUD operations with pagination and HATEOAS links
 - **Search**: Text search (fuzzy) and "find similar" by tags/colors (implemented)
- **Security**: Row-level security, ownership enforcement, input validation

## 🏗️ Architecture

- **Service-Based Architecture**: Routes delegate to services for business logic
- **Asynchronous AI Processing**: Non-blocking background processing
- **Test-Driven Development**: Comprehensive test coverage with Jest
- **Database**: Prisma ORM with Supabase PostgreSQL
- **Storage**: Supabase Storage for images (originals + thumbnails)

## 📋 Prerequisites

- **Node.js**: v18 or higher
- **npm**: v9 or higher
- **Supabase Account**: For database, storage, and authentication
- **OpenAI API Key**: For AI image analysis

## 🚀 Local Development Setup

### 1. Clone the Repository

```bash
git clone https://github.com/Crein13/ai-image-gallery.git
cd ai-image-gallery/backend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Variables

Create a `.env` file in the `backend` directory based on `.env.example`:

```bash
cp .env.example .env
```

Then update the values:

```env
# Backend environment variables
PORT=4000
CORS_ORIGIN=http://localhost:5173

# Supabase (server-side)
SUPABASE_URL="https://<your-project>.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="<role-key>"
SUPABASE_BUCKET="<your-bucket-name>"

# Database (Supabase Postgres connection string)
# Connect to Supabase via connection pooling
DATABASE_URL="postgresql://<username>:<password>@<host>:6543/<database>?pgbouncer=true"
# Direct connection to the database. Used for migrations
DIRECT_URL="postgresql://<username>:<password>@<host>:5432/<database>"

# OpenAI
OPENAI_API_KEY="<your-openai-api-key>"
```

#### Getting Your Supabase Credentials:

1. Go to [supabase.com](https://supabase.com) and create a project
2. Navigate to **Settings** → **API**
   - Copy `URL` to `SUPABASE_URL`
   - Copy `service_role` key to `SUPABASE_SERVICE_ROLE_KEY`
3. Navigate to **Settings** → **Database**
   - Copy the **Connection Pooling** connection string to `DATABASE_URL`
   - Copy the **Direct Connection** string to `DIRECT_URL`
4. Set `SUPABASE_BUCKET` to `ai-image-gallery` (you'll create this bucket in step 4)

#### Getting Your OpenAI API Key:

1. Go to [platform.openai.com](https://platform.openai.com)
2. Navigate to **API Keys**
3. Create a new key and copy it to `OPENAI_API_KEY`

### 4. Database Setup

#### Run Migrations

```bash
npx prisma migrate dev
```

#### Generate Prisma Client

```bash
npx prisma generate
```

#### Create Supabase Storage Bucket

1. Go to your Supabase project dashboard
2. Navigate to **Storage**
3. Create a bucket named `ai-image-gallery`
4. Choose visibility: Public (simple, use getPublicUrl) or Private (use signed URLs)
5. Configure Storage Policies (see examples below)

#### Run SQL Schema

In your Supabase SQL Editor, run the following schema (from the project requirements):

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

**Note**: The actual database schema has been extended with additional fields (see `prisma/migrations/` for the complete schema with `file_size`, `mime_type`, `dominant_color`, `embedding`, etc.).

### 5. Start Development Server

```bash
npm run dev
```

The server will start on `http://localhost:4000`

## 📜 Available Scripts

### Development

```bash
npm run dev
```
Starts the development server with Node.js. The server runs on the port specified in `.env` (default: 4000).

### Testing

```bash
npm test
```
Runs all tests once using Jest with ESM module support.

```bash
npm run test:watch
```
Runs tests in watch mode. Tests will re-run when files change.

### Database

```bash
npx prisma migrate dev
```
Creates a new migration and applies it to the database.

```bash
npx prisma generate
```
Generates Prisma Client based on your schema.

```bash
npx prisma studio
```
Opens Prisma Studio - a visual database editor in your browser.

```bash
npx prisma db push
```
Pushes schema changes to the database without creating migrations (useful for prototyping).

## 📡 API Endpoints

### Authentication

- **POST** `/api/auth/signup` - Create new user account
- **POST** `/api/auth/signin` - Authenticate user and get JWT token

### Images

- **POST** `/api/images/upload` - Upload one or more images (max 5)
- **GET** `/api/images` - Get paginated list of user's images
  - Query params: `limit` (default: 20), `offset` (default: 0), `sort` ('newest' | 'oldest')
- **GET** `/api/images/:id` - Get single image by ID
- **POST** `/api/images/:imageId/retry-ai` - Manually retry AI processing

### Search

- **GET** `/api/images/search` - Search images by text and/or color
    - When only `query` is provided, uses a PostgreSQL stored procedure (`search_images_by_tags`) for fuzzy matching (pg_trgm)
    - When `color` is provided (with or without `query`), uses Prisma with GIN indexes (fast array lookups)
    - Query params: `query`, `color` (hex), `dominantOnly` (boolean), `limit`, `offset`, `sort` ('newest' | 'oldest')

- **GET** `/api/images/:id/similar` - Find images similar to a given image (shared tags or colors)
    - Excludes the source image
    - Uses simple tag/color overlap per requirements (no vector DB)

## 🗄️ Database Schema

### Tables

#### `images`
Stores core image data and file paths.

```sql
- id (SERIAL PRIMARY KEY)
- user_id (UUID, foreign key to auth.users)
- filename (VARCHAR)
- original_path (TEXT)
- thumbnail_path (TEXT)
- file_size (INTEGER)
- mime_type (VARCHAR)
- uploaded_at (TIMESTAMP)
```

#### `image_metadata`
Stores AI-generated metadata and processing status.

```sql
- id (SERIAL PRIMARY KEY)
- image_id (INTEGER, foreign key to images)
- user_id (UUID, foreign key to auth.users)
- description (TEXT)
- tags (TEXT[])
 - colors (VARCHAR(7)[])
 - dominant_color (VARCHAR(7))
 - ai_processing_status (VARCHAR)
 - created_at (TIMESTAMP)
 - updated_at (TIMESTAMP)
```

### Row Level Security (RLS)

Both tables have RLS enabled with policies ensuring users can only access their own data:

```sql
CREATE POLICY "Users can only see own images" ON images
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only see own metadata" ON image_metadata
    FOR ALL USING (auth.uid() = user_id);
```

## 🧪 Testing

### Test Structure

```
backend/src/__tests__/
├── routes/
│   ├── auth.test.js
│   ├── images.upload.test.js
│   ├── images.list.test.js
│   └── images.get.test.js
├── services/
│   ├── authService.test.js
│   ├── imageService.test.js
│   ├── imageService.get.test.js
│   └── openaiService.test.js
├── middleware/
│   ├── auth.test.js
│   └── upload.test.js
└── utils/
    └── imageProcessor.test.js
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- images.upload.test.js

# Run tests with coverage
npm test -- --coverage
```

### Test Coverage

- **Total Tests**: 95 (94 passing)
- **Routes**: Authentication, Upload, List, Get Single Image
- **Services**: Image processing, AI processing, Authentication
- **Middleware**: Auth verification, File upload validation
- **Utils**: Image processing utilities

## 🔒 Security

### Authentication & Authorization
- JWT tokens validated on every protected endpoint
- User ID extracted from verified token
- All queries filter by `user_id` for ownership enforcement

### Input Validation
- MIME type checking (not just file extensions)
- File size limits (10MB per image)
- Parameter validation (limit, offset, imageId)
- SQL injection prevented via Prisma (parameterized queries)

### API Keys
- All secrets stored in `.env` (never committed to git)
- Service role key only used server-side
- CORS configured to restrict origins

### File Upload
- MIME type validation
- File size limits enforced by Multer
- Unique filenames prevent overwrites
- User-specific folders in storage

## 📁 Project Structure

```
backend/
├── src/
│   ├── routes/              # HTTP route handlers
│   │   ├── auth.js
│   │   └── images.js
│   ├── services/            # Business logic layer
│   │   ├── authService.js
│   │   ├── imageService.js
│   │   ├── openaiService.js
│   │   ├── supabaseClient.js
│   │   └── prismaClient.js
│   ├── middleware/          # Express middleware
│   │   ├── auth.js
│   │   └── upload.js
│   ├── utils/               # Utility functions
│   │   └── imageProcessor.js
│   ├── __tests__/           # Test files
│   ├── app.js               # Express app configuration
│   └── server.js            # Server entry point
├── prisma/
│   └── schema.prisma        # Database schema
├── .env                     # Environment variables (not committed)
├── .env.example             # Example environment file
├── jest.config.js           # Jest configuration
├── package.json
├── IMPLEMENTATION.md        # Detailed implementation docs
└── README.md                # This file
```

## 🔧 Tech Stack

| Technology | Purpose |
|------------|---------|
| **Express.js 5** | Web framework |
| **Prisma** | Type-safe ORM |
| **Supabase** | PostgreSQL database, Storage, Auth |
| **OpenAI GPT-4o** | Image analysis (tags, descriptions) |
| **Sharp** | Image thumbnail generation |
| **node-vibrant** | Color extraction |
| **Multer** | File upload handling |
| **Jest** | Testing framework |
| **Supertest** | HTTP testing |

## 🐛 Troubleshooting

### Port Already in Use

If you get an error about port 4000 being in use:

```bash
# On Windows
netstat -ano | findstr :4000
taskkill /PID <PID> /F

# On Mac/Linux
lsof -ti:4000 | xargs kill -9
```

Or change the `PORT` in your `.env` file.

### Database Connection Issues

Ensure your `DATABASE_URL` is correct and the database is accessible:

```bash
npx prisma db pull
```

This will test the connection and pull the current schema.

### Supabase Storage 403 Errors

Verify your storage bucket policies are correctly configured. The bucket should be public and have policies for INSERT, SELECT, UPDATE, and DELETE based on user authentication.

### OpenAI API Rate Limits

If you hit rate limits during development:
- Use a lower-tier account or add billing
- Reduce concurrent uploads during testing
- Add retry logic with exponential backoff (already implemented)

### Test Failures

If tests fail:

```bash
# Clear Jest cache
npx jest --clearCache

# Run tests with verbose output
npm test -- --verbose
```

## 📚 Additional Documentation

- **[Main README](../README.md)** - Full-stack project overview
- **[Prisma Schema](./prisma/schema.prisma)** - Database schema definition

## 🚀 Deployment

### Environment Variables

Ensure all production environment variables are set:
- `NODE_ENV=production`
- Production Supabase credentials
- Production OpenAI API key
- `CORS_ORIGIN` set to your frontend domain

### Recommended Platforms

- **Railway**: Simple deployment with PostgreSQL support
- **Render**: Free tier available
- **Heroku**: Easy scaling options
- **AWS/GCP/Azure**: For larger scale deployments

### Pre-deployment Checklist

- [ ] All tests passing (`npm test`)
- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] Supabase storage bucket created and configured
- [ ] CORS origins restricted to production domain
- [ ] Error logging configured (Sentry, LogRocket, etc.)
