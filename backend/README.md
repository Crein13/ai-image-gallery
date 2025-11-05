# AI Image Gallery - Backend API

Express.js REST API for the AI Image Gallery application. This backend handles image uploads, AI-powered metadata generation using OpenAI Vision API, and provides secure endpoints for authentication, search, and image management.

## 🎯 What This Backend Does

This Express.js backend provides:
- **User Authentication**: Sign up/sign in via Supabase Auth with JWT tokens
- **Image Upload & Storage**: Multi-file upload with automatic thumbnail generation and color extraction
- **AI-Powered Analysis**: Background processing using OpenAI GPT-4o for automatic tags, descriptions, and colors
- **Smart Search**: Text search by tags/descriptions and color-based filtering
- **Similar Image Discovery**: Find images with shared tags or colors
- **Secure Access**: Row-level security ensuring users only see their own images

## 🏗️ Backend Architecture

- **Service-Based Design**: Clean separation between HTTP routes and business logic
- **Asynchronous AI Processing**: Upload completes immediately, AI analysis happens in background
- **Test-Driven Development**: Comprehensive Jest test suite with 95+ tests
- **Database**: Prisma ORM with Supabase PostgreSQL for type-safe queries
- **File Storage**: Supabase Storage for original images and auto-generated thumbnails

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

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **Settings** → **API**:
   - Copy the `URL` to `SUPABASE_URL`
   - Copy the `service_role` key to `SUPABASE_SERVICE_ROLE_KEY`
3. Go to **Settings** → **Database**:
   - Copy the **Connection Pooling** string to `DATABASE_URL`
   - Copy the **Direct Connection** string to `DIRECT_URL`
4. Set `SUPABASE_BUCKET` to `ai-image-gallery` (you'll create this in step 4)

#### Getting Your OpenAI API Key:

1. Sign up/log in at [platform.openai.com](https://platform.openai.com)
2. Go to **API Keys** section
3. Create a new secret key and copy it to `OPENAI_API_KEY`

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

1. In your Supabase project dashboard, go to **Storage**
2. Create a new bucket named `ai-image-gallery`
3. Set visibility to Public or Private based on your needs
4. Configure bucket policies for user-based access (see Storage Policies section below)

#### Run SQL Schema

In your Supabase SQL Editor, run the following schema (from the project requirements):

```sql
CREATE TABLE images (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    filename VARCHAR(255),
    original_path TEXT,
    thumbnail_path TEXT,
    file_size INTEGER,
    mime_type VARCHAR(100),
    uploaded_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE image_metadata (
    id SERIAL PRIMARY KEY,
    image_id INTEGER REFERENCES images(id),
    user_id UUID REFERENCES auth.users(id),
    description TEXT,
    tags TEXT[],
    colors VARCHAR(7)[],
    dominant_color VARCHAR(7),
    ai_processing_status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE images ENABLE ROW LEVEL SECURITY;
ALTER TABLE image_metadata ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
CREATE POLICY "Users can only access own images" ON images
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only access own metadata" ON image_metadata
    FOR ALL USING (auth.uid() = user_id);
```

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

## 📡 REST API Endpoints

### Authentication
- **POST** `/api/auth/signup` - Create new user account with email/password
- **POST** `/api/auth/signin` - Authenticate user and receive JWT tokens

### Image Management
- **POST** `/api/images/upload` - Upload 1-5 images with automatic processing
- **GET** `/api/images` - Get paginated list of user's images with metadata
  - Query params: `limit`, `offset`, `sort` ('newest' | 'oldest')
- **GET** `/api/images/:id` - Get single image with full metadata
- **POST** `/api/images/:imageId/retry-ai` - Retry AI processing for failed images

### Search & Discovery
- **GET** `/api/images/search` - Search images by text query and/or color filter
  - Query params: `query` (text), `color` (hex), `dominantOnly`, `limit`, `offset`, `sort`
  - Supports fuzzy text matching and exact color filtering
- **GET** `/api/images/:id/similar` - Find images with similar tags or colors
- **GET** `/api/images/colors` - Get all unique colors from user's images

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
└── README.md                # This file
```

## 🧩 Backend Tech Stack

| Technology | Purpose |
|------------|---------|
| **Express.js** | REST API web framework |
| **Prisma** | Type-safe ORM for database operations |
| **Supabase** | PostgreSQL database, file storage, and authentication |
| **OpenAI GPT-4o Vision** | AI image analysis for tags, descriptions, and colors |
| **Sharp** | Fast thumbnail generation and image processing |
| **node-vibrant** | Dominant color extraction from images |
| **Multer** | Multipart/form-data file upload handling |
| **Jest** | Unit and integration testing framework |
| **Supertest** | HTTP endpoint testing |

## � Search Internals

### Text Search (Fuzzy)
- **Stored Procedure**: `search_images_by_tags(search_term text, user_filter uuid)`
- **Location**: `prisma/migrations/003_search_functions.sql`
- **Uses**: `pg_trgm` similarity and full-text index to rank results
- **Best For**: Human-friendly search with typo tolerance (e.g., "beach" matches "beaches")

### Color and Combined Filters
- **Method**: Prisma queries with GIN indexes on `tags` and `colors` arrays
- **Logic**: AND logic for combined filters (`query + color`)
- **Performance**: ~5-15ms for color-only, ~15-30ms for combined

### Similar Images
- **Algorithm**: Simple tag/color overlap scoring
- **Implementation**: Counts matching tags and colors between images
- **Performance**: ~10-20ms typical query time

## 🗄️ Storage Policies

Your folder structure: `originals/{userId}/...` and `thumbnails/{userId}/...`

### Owner-Only (Private Bucket)

Use this if you want files to be private and accessible only by the owner (or via signed URLs):

```sql
-- Enable RLS
alter table storage.objects enable row level security;

-- Owners can read their files
create policy "Owners can read files (by folder)"
on storage.objects for select to authenticated
using (
  (bucket_id = 'ai-image-gallery'::text)
  and ((storage.foldername(name))[1] = auth.uid()::text)
);

-- Owners can upload files
create policy "Owners can upload files (by folder)"
on storage.objects for insert to authenticated
with check (
  (bucket_id = 'ai-image-gallery'::text)
  and ((storage.foldername(name))[1] = auth.uid()::text)
);

-- Owners can update their files
create policy "Owners can update files (by folder)"
on storage.objects for update to authenticated
using (
  (bucket_id = 'ai-image-gallery'::text)
  and ((storage.foldername(name))[1] = auth.uid()::text)
)
with check (
  (bucket_id = 'ai-image-gallery'::text)
  and ((storage.foldername(name))[1] = auth.uid()::text)
);

-- Owners can delete their files
create policy "Owners can delete files (by folder)"
on storage.objects for delete to authenticated
using (
  (bucket_id = 'ai-image-gallery'::text)
  and ((storage.foldername(name))[1] = auth.uid()::text)
);
```

### Public Read (Entire Bucket)

Use this if you want images publicly accessible via `getPublicUrl`:

```sql
-- Make bucket public
update storage.buckets set public = true where id = 'ai-image-gallery';

-- Public read for entire bucket
create policy "Public read"
on storage.objects for select to public
using (bucket_id = 'ai-image-gallery'::text);

-- Owner-only write (use same insert/update/delete policies as above)
```

### Public Thumbnails Only

Use this if you want only thumbnails public (keep originals private):

```sql
-- Keep bucket private
update storage.buckets set public = false where id = 'ai-image-gallery';

-- Public read for thumbnails only
create policy "Public read for thumbnails only"
on storage.objects for select to public
using (
  (bucket_id = 'ai-image-gallery'::text)
  and ((storage.foldername(name))[1] = 'thumbnails')
);

-- Owner-only read for originals (use authenticated policies above)
```

**Note**: `storage.foldername(name)` returns an array of folder segments. For path `originals/user-123/file.jpg`:
- `[1]` = "originals"
- `[2]` = "user-123"

## �🐛 Troubleshooting

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

## 📚 Related Documentation

- **[Main README](../README.md)** - Full-stack project overview and setup
- **[Prisma Schema](./prisma/schema.prisma)** - Complete database schema definition

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
