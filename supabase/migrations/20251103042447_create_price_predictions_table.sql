/*
  # Create Price Predictions Table

  1. New Tables
    - `price_predictions`
      - `id` (uuid, primary key)
      - `product_id` (uuid, foreign key to products)
      - `product_name` (text, for easy querying)
      - `city` (text)
      - `predict_date` (date)
      - `predicted_price` (numeric)
      - `model_version` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `price_predictions` table
    - Add policy for authenticated users to read predictions
    - Add policy for authenticated users to insert predictions

  3. Indexes
    - Add index on product_name and city for faster queries
    - Add index on predict_date for time-based queries
*/

-- Create price_predictions table
CREATE TABLE IF NOT EXISTS price_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  product_name text NOT NULL,
  city text NOT NULL,
  predict_date date NOT NULL,
  predicted_price numeric NOT NULL,
  model_version text DEFAULT 'XGBoost-v1.0',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE price_predictions ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users to read predictions
CREATE POLICY "Authenticated users can read price predictions"
  ON price_predictions
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policies for authenticated users to insert predictions
CREATE POLICY "Authenticated users can insert price predictions"
  ON price_predictions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_price_predictions_product_city 
  ON price_predictions(product_name, city);

CREATE INDEX IF NOT EXISTS idx_price_predictions_date 
  ON price_predictions(predict_date);

CREATE INDEX IF NOT EXISTS idx_price_predictions_product_id 
  ON price_predictions(product_id);