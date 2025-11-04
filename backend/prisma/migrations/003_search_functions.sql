-- Stored procedure for tag-based search (simple tag matching)
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
