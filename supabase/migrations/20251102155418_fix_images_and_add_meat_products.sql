/*
  # Fix Product Images and Add Meat Products

  1. Changes
    - Update incorrect images for cabbage, corn, pears, and rice
    - Add beef and pork products to the database
    - Use correct Pexels stock photo URLs

  2. Important Notes
    - All images are 400x400 for consistent display
    - New meat products added to inventory
*/

-- Fix incorrect product images
UPDATE products SET image_url = 'https://images.pexels.com/photos/7937496/pexels-photo-7937496.jpeg?auto=compress&cs=tinysrgb&w=400&h=400' WHERE name = 'Cabbage';
UPDATE products SET image_url = 'https://images.pexels.com/photos/547263/pexels-photo-547263.jpeg?auto=compress&cs=tinysrgb&w=400&h=400' WHERE name = 'Corn';
UPDATE products SET image_url = 'https://images.pexels.com/photos/209339/pexels-photo-209339.jpeg?auto=compress&cs=tinysrgb&w=400&h=400' WHERE name = 'Pears';
UPDATE products SET image_url = 'https://images.pexels.com/photos/7456376/pexels-photo-7456376.jpeg?auto=compress&cs=tinysrgb&w=400&h=400' WHERE name = 'Rice';

-- Add beef and pork products
INSERT INTO products (name, category, unit, description, image_url) VALUES
  ('Beef', 'Meat', 'kg', 'Fresh beef', 'https://images.pexels.com/photos/618775/pexels-photo-618775.jpeg?auto=compress&cs=tinysrgb&w=400&h=400'),
  ('Pork', 'Meat', 'kg', 'Fresh pork', 'https://images.pexels.com/photos/3688/food-dinner-lunch-unhealthy.jpg?auto=compress&cs=tinysrgb&w=400&h=400')
ON CONFLICT DO NOTHING;