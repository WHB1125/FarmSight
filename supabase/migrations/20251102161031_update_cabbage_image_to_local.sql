/*
  # Update Cabbage Image to Local File

  1. Changes
    - Update cabbage product to use the local image file OIP-C.jpg
    - This image shows fresh Napa cabbage with visible texture

  2. Important Notes
    - Using local file from public directory
    - Path will be /OIP-C.jpg in the application
*/

-- Update Cabbage to use local image
UPDATE products SET image_url = '/OIP-C.jpg' WHERE name = 'Cabbage';