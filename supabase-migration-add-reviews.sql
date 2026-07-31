-- Create reviews table for product and seller reviews
CREATE TABLE IF NOT EXISTS reviews (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  userId text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bookingId uuid REFERENCES bookings(id) ON DELETE SET NULL,
  facilityId text REFERENCES facilities(id) ON DELETE CASCADE,
  storeId text REFERENCES stores(id) ON DELETE CASCADE,
  reviewType text NOT NULL CHECK (reviewType IN ('product', 'seller')),
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title text,
  comment text,
  createdAt timestamptz DEFAULT now(),
  updatedAt timestamptz DEFAULT now(),
  helpful integer DEFAULT 0,
  unhelpful integer DEFAULT 0
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_reviews_facility ON reviews(facilityId);
CREATE INDEX IF NOT EXISTS idx_reviews_store ON reviews(storeId);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews(userId);
CREATE INDEX IF NOT EXISTS idx_reviews_booking ON reviews(bookingId);
CREATE INDEX IF NOT EXISTS idx_reviews_type ON reviews(reviewType);
CREATE INDEX IF NOT EXISTS idx_reviews_created ON reviews(createdAt DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view all reviews
CREATE POLICY "Users can view all reviews"
  ON reviews FOR SELECT
  USING (true);

-- RLS Policy: Users can create reviews
CREATE POLICY "Users can create own reviews"
  ON reviews FOR INSERT
  WITH CHECK (auth.uid()::text = userId);

-- RLS Policy: Users can update their own reviews
CREATE POLICY "Users can update own reviews"
  ON reviews FOR UPDATE
  USING (auth.uid()::text = userId)
  WITH CHECK (auth.uid()::text = userId);

-- RLS Policy: Users can delete their own reviews
CREATE POLICY "Users can delete own reviews"
  ON reviews FOR DELETE
  USING (auth.uid()::text = userId);

-- Create review_ratings view to calculate aggregated ratings
CREATE OR REPLACE VIEW review_ratings AS
SELECT
  facilityId,
  COUNT(*) as totalReviews,
  ROUND(AVG(rating)::numeric, 1) as avgRating,
  MAX(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as fiveStarCount,
  MAX(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as fourStarCount,
  MAX(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as threeStarCount,
  MAX(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as twoStarCount,
  MAX(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as oneStarCount
FROM reviews
WHERE reviewType = 'product' AND facilityId IS NOT NULL
GROUP BY facilityId;

CREATE OR REPLACE VIEW seller_review_ratings AS
SELECT
  storeId,
  COUNT(*) as totalReviews,
  ROUND(AVG(rating)::numeric, 1) as avgRating,
  MAX(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as fiveStarCount,
  MAX(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as fourStarCount,
  MAX(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as threeStarCount,
  MAX(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as twoStarCount,
  MAX(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as oneStarCount
FROM reviews
WHERE reviewType = 'seller' AND storeId IS NOT NULL
GROUP BY storeId;
