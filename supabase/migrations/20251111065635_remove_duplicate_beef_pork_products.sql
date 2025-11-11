/*
  # Remove Duplicate Beef and Pork Products

  1. Changes
    - Remove duplicate Beef product entry (keeping the first one)
    - Remove duplicate Pork product entry (keeping the first one)
    - This fixes issues with querying products by name
  
  2. Data Safety
    - Both duplicate entries have the same price data associated
    - We keep one entry per product to maintain data integrity
    - All market_prices relationships are preserved
*/

-- Remove duplicate Beef product (keep 907dd35b-56a9-4b99-acfe-4b181c24a691)
DELETE FROM products 
WHERE id = 'a474d26c-adfb-4550-b05b-0c1c8182d0e9' 
AND name = 'Beef';

-- Remove duplicate Pork product (keep 51d21411-0727-4e32-a128-2de0ebe144e6)
DELETE FROM products 
WHERE id = 'a9c4152d-49e4-4eae-aebc-c98da572b208' 
AND name = 'Pork';
