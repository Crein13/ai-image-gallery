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
