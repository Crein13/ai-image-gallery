-- Install required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create images table
CREATE TABLE images (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  filename VARCHAR(255) NOT NULL,
  original_path TEXT NOT NULL,
  thumbnail_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR(100),
  uploaded_at TIMESTAMP DEFAULT NOW()
);

-- Create image_metadata table
CREATE TABLE image_metadata (
  id SERIAL PRIMARY KEY,
  image_id INTEGER NOT NULL REFERENCES images(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,

  -- AI-generated content
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  colors VARCHAR(7)[] DEFAULT '{}',
  dominant_color VARCHAR(7),

  -- Processing status
  ai_processing_status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_images_user_id ON images(user_id);
CREATE INDEX idx_images_uploaded_at ON images(uploaded_at DESC);

CREATE INDEX idx_metadata_user_id ON image_metadata(user_id);
CREATE INDEX idx_metadata_image_id ON image_metadata(image_id);
CREATE INDEX idx_metadata_tags_gin ON image_metadata USING GIN(tags);
CREATE INDEX idx_metadata_colors_gin ON image_metadata USING GIN(colors);
CREATE INDEX idx_metadata_description_fts ON image_metadata USING GIN(to_tsvector('english', description));
