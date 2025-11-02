/*
  # Fix Product Images - Final Corrections

  1. Changes
    - Fix Rice image with proper rice grain photo
    - Fix Cabbage image with correct cabbage photo
    - Fix Pears image with correct pear photo
    - Verify Beef and Pork exist in Meat category

  2. Important Notes
    - All images are 400x400 from Pexels
    - Using verified working Pexels URLs
*/

-- Fix Rice image
UPDATE products SET image_url = 'https://images.pexels.com/photos/3656074/pexels-photo-3656074.jpeg?auto=compress&cs=tinysrgb&w=400&h=400' WHERE name = 'Rice';

-- Fix Cabbage image
UPDATE products SET image_url = 'https://images.pexels.com/photos/2255935/pexels-photo-2255935.jpeg?auto=compress&cs=tinysrgb&w=400&h=400' WHERE name = 'Cabbage';

-- Fix Pears image
UPDATE products SET image_url = 'https://images.pexels.com/photos/568471/pexels-photo-568471.jpeg?auto=compress&cs=tinysrgb&w=400&h=400' WHERE name = 'Pears';

-- Ensure Beef and Pork exist in Meat category
INSERT INTO products (name, category, unit, description, image_url) VALUES
  ('Beef', 'Meat', 'kg', 'Fresh beef', 'https://images.pexels.com/photos/618775/pexels-photo-618775.jpeg?auto=compress&cs=tinysrgb&w=400&h=400'),
  ('Pork', 'Meat', 'kg', 'Fresh pork', 'https://images.pexels.com/photos/3688/food-dinner-lunch-unhealthy.jpg?auto=compress&cs=tinysrgb&w=400&h=400')
ON CONFLICT DO NOTHING;