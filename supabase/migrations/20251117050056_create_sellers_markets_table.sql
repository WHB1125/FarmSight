/*
  # Create Sellers and Markets Table

  ## Purpose
  Store seller/market information from Huinong API for each product and region.

  ## New Tables
  
  ### `sellers`
  - `id` (uuid, primary key) - Unique identifier
  - `product_id` (uuid, foreign key) - Reference to products table
  - `city` (text) - City/region name
  - `seller_name` (text) - Name of seller/market/dealer
  - `seller_type` (text) - Type: 'dealer', 'wholesale_market', 'retailer', etc.
  - `price` (decimal) - Current price offered by this seller
  - `contact` (text, nullable) - Contact information
  - `address` (text, nullable) - Physical address
  - `latitude` (decimal, nullable) - Latitude for map display
  - `longitude` (decimal, nullable) - Longitude for map display
  - `source_url` (text, nullable) - URL from Huinong API
  - `last_updated` (timestamptz) - Last time data was refreshed
  - `created_at` (timestamptz) - Record creation time

  ## Security
  - Enable RLS on `sellers` table
  - Add policy for authenticated users to read seller data
  - Add policy for service role to insert/update seller data
*/

-- Create sellers table
CREATE TABLE IF NOT EXISTS sellers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  city text NOT NULL,
  seller_name text NOT NULL,
  seller_type text NOT NULL DEFAULT 'dealer',
  price decimal(10, 2) NOT NULL,
  contact text,
  address text,
  latitude decimal(10, 6),
  longitude decimal(11, 6),
  source_url text,
  last_updated timestamptz DEFAULT now() NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_sellers_product_id ON sellers(product_id);
CREATE INDEX IF NOT EXISTS idx_sellers_city ON sellers(city);
CREATE INDEX IF NOT EXISTS idx_sellers_product_city ON sellers(product_id, city);

-- Enable RLS
ALTER TABLE sellers ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can read all seller data
CREATE POLICY "Authenticated users can read sellers"
  ON sellers
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Public users can also read seller data (for public market info)
CREATE POLICY "Public users can read sellers"
  ON sellers
  FOR SELECT
  TO anon
  USING (true);

-- Policy: Service role can insert seller data
CREATE POLICY "Service role can insert sellers"
  ON sellers
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Policy: Service role can update seller data
CREATE POLICY "Service role can update sellers"
  ON sellers
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy: Service role can delete seller data
CREATE POLICY "Service role can delete sellers"
  ON sellers
  FOR DELETE
  TO service_role
  USING (true);