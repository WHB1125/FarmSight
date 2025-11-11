COPY (
  SELECT 
    p.name as product_name,
    mp.city,
    mp.price,
    mp.price_unit,
    mp.date,
    mp.market_name,
    mp.source
  FROM market_prices mp
  JOIN products p ON mp.product_id = p.id
  WHERE mp.date >= CURRENT_DATE - INTERVAL '10 days'
  ORDER BY mp.date DESC, p.name, mp.city
) TO STDOUT WITH CSV HEADER;
