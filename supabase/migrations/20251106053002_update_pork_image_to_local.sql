/*
  # Update Pork Product Image to Local File

  1. Changes
    - Updates the pork product image_url to use the local /pork.jpg file
    - Ensures the image is properly set for better performance and reliability
  
  2. Notes
    - Uses local asset instead of external URL
    - Improves page load performance
*/

-- Update pork image to use local file
UPDATE products 
SET image_url = '/pork.jpg'
WHERE name = 'Pork' AND category = 'Meat';
