
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://qhnztjjepgewzmimlhkn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFobnp0amplcGdld3ptaW1saGtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4NjI1NTYsImV4cCI6MjA3NjQzODU1Nn0.2AvQyCWZlhRNDnqRcAY-gcO4qfUICYsEf_mLPS5bRO8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function exportAllData() {
  console.log('Starting full export...');
  
  const tenDaysAgo = new Date();
  tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
  const dateStr = tenDaysAgo.toISOString().split('T')[0];
  
  let allData = [];
  let from = 0;
  const batchSize = 1000;
  
  while (true) {
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
      .order('city')
      .range(from, from + batchSize - 1);
    
    if (error) {
      console.error('Error:', error);
      break;
    }
    
    if (!prices || prices.length === 0) break;
    
    console.log(`Fetched batch: ${from} to ${from + prices.length}`);
    allData = allData.concat(prices);
    
    if (prices.length < batchSize) break;
    from += batchSize;
  }
  
  console.log(`Total records fetched: ${allData.length}`);
  
  // 生成 CSV
  const csv = ['product_name,city,price,price_unit,date,market_name,source'];
  
  allData.forEach(row => {
    const productName = row.products?.name || 'Unknown';
    const source = (row.source || 'N/A').replace(/"/g, '""');
    csv.push(`"${productName}","${row.city}",${row.price},"${row.price_unit}",${row.date},"${row.market_name}","${source}"`);
  });
  
  fs.writeFileSync('market_prices_export_10days.csv', csv.join('\n'));
  console.log('\nExport complete!');
  console.log('File: market_prices_export_10days.csv');
  console.log(`Total records: ${allData.length}`);
}

exportAllData();
