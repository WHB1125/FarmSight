/*
  # Agricultural Product Price Monitoring System

  1. New Tables
    - `products`
      - `id` (uuid, primary key)
      - `name` (text, not null) - Product name (e.g., "Tomatoes", "Rice")
      - `category` (text, not null) - Category (e.g., "Vegetables", "Grains", "Fruits")
      - `unit` (text, not null) - Unit of measurement (e.g., "kg", "ton")
      - `description` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `market_prices`
      - `id` (uuid, primary key)
      - `product_id` (uuid, foreign key to products)
      - `city` (text, not null) - City name in Jiangsu (e.g., "Nanjing", "Suzhou")
      - `market_name` (text) - Specific market or source
      - `price` (numeric, not null) - Current price
      - `price_unit` (text, not null) - Price unit (e.g., "CNY/kg")
      - `date` (date, not null) - Price date
      - `source` (text) - Data source
      - `created_at` (timestamptz)

    - `price_alerts`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `product_id` (uuid, foreign key to products)
      - `city` (text)
      - `alert_type` (text, not null) - "above" or "below"
      - `threshold_price` (numeric, not null)
      - `is_active` (boolean, default true)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Public read access for products and market_prices
    - User-specific access for price_alerts

  3. Important Notes
    - Products represent agricultural items tracked in the system
    - Market prices store real-time and historical price data from Jiangsu cities
    - Price alerts allow users to monitor price thresholds
*/

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL,
  unit text NOT NULL DEFAULT 'kg',
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create market_prices table
CREATE TABLE IF NOT EXISTS market_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  city text NOT NULL,
  market_name text,
  price numeric(10, 2) NOT NULL,
  price_unit text NOT NULL DEFAULT 'CNY/kg',
  date date NOT NULL DEFAULT CURRENT_DATE,
  source text,
  created_at timestamptz DEFAULT now()
);

-- Create price_alerts table
CREATE TABLE IF NOT EXISTS price_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  city text,
  alert_type text NOT NULL CHECK (alert_type IN ('above', 'below')),
  threshold_price numeric(10, 2) NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_market_prices_product_id ON market_prices(product_id);
CREATE INDEX IF NOT EXISTS idx_market_prices_city ON market_prices(city);
CREATE INDEX IF NOT EXISTS idx_market_prices_date ON market_prices(date DESC);
CREATE INDEX IF NOT EXISTS idx_price_alerts_user_id ON price_alerts(user_id);

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_alerts ENABLE ROW LEVEL SECURITY;

-- Products policies (public read)
CREATE POLICY "Anyone can read products"
  ON products
  FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Authenticated users can insert products"
  ON products
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Market prices policies (public read)
CREATE POLICY "Anyone can read market prices"
  ON market_prices
  FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Authenticated users can insert market prices"
  ON market_prices
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Price alerts policies (user-specific)
CREATE POLICY "Users can read own alerts"
  ON price_alerts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own alerts"
  ON price_alerts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own alerts"
  ON price_alerts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own alerts"
  ON price_alerts
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create trigger for products updated_at
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert sample products
INSERT INTO products (name, category, unit, description) VALUES
  ('Rice', 'Grains', 'kg', 'White rice'),
  ('Wheat', 'Grains', 'kg', 'Wheat grain'),
  ('Tomatoes', 'Vegetables', 'kg', 'Fresh tomatoes'),
  ('Cucumbers', 'Vegetables', 'kg', 'Fresh cucumbers'),
  ('Cabbage', 'Vegetables', 'kg', 'Chinese cabbage'),
  ('Apples', 'Fruits', 'kg', 'Fresh apples'),
  ('Pears', 'Fruits', 'kg', 'Fresh pears'),
  ('Corn', 'Grains', 'kg', 'Sweet corn'),
  ('Potatoes', 'Vegetables', 'kg', 'Fresh potatoes'),
  ('Carrots', 'Vegetables', 'kg', 'Fresh carrots')
ON CONFLICT DO NOTHING;