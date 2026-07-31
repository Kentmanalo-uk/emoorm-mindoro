-- SQL Functions for Review Rating Calculations

-- Function to get product rating and counts
CREATE OR REPLACE FUNCTION get_product_rating(facility_id text)
RETURNS TABLE (
  totalReviews bigint,
  avgRating numeric,
  fiveStarCount bigint,
  fourStarCount bigint,
  threeStarCount bigint,
  twoStarCount bigint,
  oneStarCount bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*),
    COALESCE(ROUND(AVG(rating)::numeric, 1), 0),
    COUNT(CASE WHEN rating = 5 THEN 1 END),
    COUNT(CASE WHEN rating = 4 THEN 1 END),
    COUNT(CASE WHEN rating = 3 THEN 1 END),
    COUNT(CASE WHEN rating = 2 THEN 1 END),
    COUNT(CASE WHEN rating = 1 THEN 1 END)
  FROM reviews
  WHERE facilityId = facility_id AND reviewType = 'product';
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get seller rating and counts
CREATE OR REPLACE FUNCTION get_seller_rating(store_id text)
RETURNS TABLE (
  totalReviews bigint,
  avgRating numeric,
  fiveStarCount bigint,
  fourStarCount bigint,
  threeStarCount bigint,
  twoStarCount bigint,
  oneStarCount bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*),
    COALESCE(ROUND(AVG(rating)::numeric, 1), 0),
    COUNT(CASE WHEN rating = 5 THEN 1 END),
    COUNT(CASE WHEN rating = 4 THEN 1 END),
    COUNT(CASE WHEN rating = 3 THEN 1 END),
    COUNT(CASE WHEN rating = 2 THEN 1 END),
    COUNT(CASE WHEN rating = 1 THEN 1 END)
  FROM reviews
  WHERE storeId = store_id AND reviewType = 'seller';
END;
$$ LANGUAGE plpgsql STABLE;
