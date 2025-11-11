
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://qhnztjjepgewzmimlhkn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFobnp0amplcGdld3ptaW1saGtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4NjI1NTYsImV4cCI6MjA3NjQzODU1Nn0.2AvQyCWZlhRNDnqRcAY-gcO4qfUICYsEf_mLPS5bRO8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function exportData() {
  console.log('Fetching data from last 10 days...');
  
  const tenDaysAgo = new Date();
  tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
  const dateStr = tenDaysAgo.toISOString().split('T')[0];
  
  const { data: prices, error } = await supabase
    .from('market_prices')
    .select(`
      date,
      city,
      price,
      price_unit,
      market_name,
      source,
      products (name)
    `)
    .gte('date', dateStr)
    .order('date', { ascending: false })
    .order('products(name)');
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log(`Found ${prices.length} records`);
  
  // 生成 CSV
  const csv = ['product_name,city,price,price_unit,date,market_name,source'];
  
  prices.forEach(row => {
    const productName = row.products?.name || 'Unknown';
    csv.push(`"${productName}","${row.city}",${row.price},"${row.price_unit}",${row.date},"${row.market_name}","${row.source || 'N/A'}"`);
  });
  
  fs.writeFileSync('market_prices_export_10days.csv', csv.join('\n'));
  console.log('Export complete! File: market_prices_export_10days.csv');
  console.log(`Total records: ${prices.length}`);
}

exportData();
