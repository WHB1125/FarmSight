/*
  # Fix Cabbage and Rice Product Images

  1. Changes
    - Update cabbage with correct image
    - Update rice with working image URL

  2. Important Notes
    - Using verified Pexels stock photos at 400x400
*/

-- Fix Cabbage image with correct photo
UPDATE products SET image_url = 'https://images.pexels.com/photos/2286776/pexels-photo-2286776.jpeg?auto=compress&cs=tinysrgb&w=400&h=400' WHERE name = 'Cabbage';

-- Fix Rice image with working URL
UPDATE products SET image_url = 'https://images.pexels.com/photos/4110256/pexels-photo-4110256.jpeg?auto=compress&cs=tinysrgb&w=400&h=400' WHERE name = 'Rice';