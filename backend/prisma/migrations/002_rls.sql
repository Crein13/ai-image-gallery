-- Add foreign key constraints to auth.users (required for RLS)
ALTER TABLE images
  ADD CONSTRAINT images_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE image_metadata
  ADD CONSTRAINT image_metadata_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Enable Row Level Security
ALTER TABLE images ENABLE ROW LEVEL SECURITY;
ALTER TABLE image_metadata ENABLE ROW LEVEL SECURITY;

-- RLS Policies for images table
CREATE POLICY "Users can only see own images" ON images
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for image_metadata table
CREATE POLICY "Users can only see own metadata" ON image_metadata
  FOR ALL USING (auth.uid() = user_id);
