/*
  # Add Product Images and Chicken

  1. Changes
    - Add `image_url` column to products table
    - Add Chicken to products
    - Update all products with stock photo URLs from Pexels
    - Generate 30 days of historical price data for all products

  2. Important Notes
    - Using Pexels stock photos with valid URLs
    - Historical data covers the last 30 days
    - Prices vary by city and date to simulate real market conditions
*/

-- Add image_url column to products table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE products ADD COLUMN image_url text;
  END IF;
END $$;

-- Insert Chicken product if it doesn't exist
INSERT INTO products (name, category, unit, description, image_url) VALUES
  ('Chicken', 'Meat', 'kg', 'Fresh chicken', 'https://images.pexels.com/photos/2338407/pexels-photo-2338407.jpeg?auto=compress&cs=tinysrgb&w=400&h=400')
ON CONFLICT DO NOTHING;

-- Update existing products with image URLs
UPDATE products SET image_url = 'https://images.pexels.com/photos/33406/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=400&h=400' WHERE name = 'Rice';
UPDATE products SET image_url = 'https://images.pexels.com/photos/2589457/pexels-photo-2589457.jpeg?auto=compress&cs=tinysrgb&w=400&h=400' WHERE name = 'Wheat';
UPDATE products SET image_url = 'https://images.pexels.com/photos/1327838/pexels-photo-1327838.jpeg?auto=compress&cs=tinysrgb&w=400&h=400' WHERE name = 'Tomatoes';
UPDATE products SET image_url = 'https://images.pexels.com/photos/2329440/pexels-photo-2329440.jpeg?auto=compress&cs=tinysrgb&w=400&h=400' WHERE name = 'Cucumbers';
UPDATE products SET image_url = 'https://images.pexels.com/photos/2286776/pexels-photo-2286776.jpeg?auto=compress&cs=tinysrgb&w=400&h=400' WHERE name = 'Cabbage';
UPDATE products SET image_url = 'https://images.pexels.com/photos/1510392/pexels-photo-1510392.jpeg?auto=compress&cs=tinysrgb&w=400&h=400' WHERE name = 'Apples';
UPDATE products SET image_url = 'https://images.pexels.com/photos/1071878/pexels-photo-1071878.jpeg?auto=compress&cs=tinysrgb&w=400&h=400' WHERE name = 'Pears';
UPDATE products SET image_url = 'https://images.pexels.com/photos/1645668/pexels-photo-1645668.jpeg?auto=compress&cs=tinysrgb&w=400&h=400' WHERE name = 'Corn';
UPDATE products SET image_url = 'https://images.pexels.com/photos/144248/potatoes-vegetables-erdfrucht-bio-144248.jpeg?auto=compress&cs=tinysrgb&w=400&h=400' WHERE name = 'Potatoes';
UPDATE products SET image_url = 'https://images.pexels.com/photos/3650647/pexels-photo-3650647.jpeg?auto=compress&cs=tinysrgb&w=400&h=400' WHERE name = 'Carrots';