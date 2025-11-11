import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';

const supabaseUrl = 'https://qhnztjjepgewzmimlhkn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFobnp0amplcGdld3ptaW1saGtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4NjI1NTYsImV4cCI6MjA3NjQzODU1Nn0.2AvQyCWZlhRNDnqRcAY-gcO4qfUICYsEf_mLPS5bRO8';
const supabase = createClient(supabaseUrl, supabaseKey);

async function exportToCSV(tableName, filename, orderByColumn = 'created_at') {
  console.log(`\nExporting ${tableName}...`);

  let allData = [];
  let page = 0;
  const pageSize = 1000;

  while (true) {
    let query = supabase
      .from(tableName)
      .select('*')
      .range(page * pageSize, (page + 1) * pageSize - 1);

    // Try to order, but continue even if it fails
    try {
      if (orderByColumn) {
        query = query.order(orderByColumn, { ascending: false });
      }
    } catch (e) {
      console.log(`Note: Could not order by ${orderByColumn}, continuing anyway...`);
    }

    const { data, error } = await query;

    if (error) {
      console.error(`Error fetching ${tableName}:`, error);
      break;
    }

    if (!data || data.length === 0) break;

    allData = allData.concat(data);
    console.log(`  Fetched ${allData.length} records...`);

    if (data.length < pageSize) break;
    page++;
  }

  if (allData.length === 0) {
    console.log(`No data found in ${tableName}`);
    return;
  }

  // Convert to CSV
  const headers = Object.keys(allData[0]);
  const csvHeader = headers.join(',');

  const csvRows = allData.map(row => {
    return headers.map(header => {
      const value = row[header];
      if (value === null || value === undefined) return '';

      // Escape quotes and wrap in quotes if contains comma or newline
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    }).join(',');
  });

  const csv = [csvHeader, ...csvRows].join('\n');

  writeFileSync(filename, csv, 'utf-8');
  console.log(`✓ Exported ${allData.length} records to ${filename}`);
}

async function main() {
  console.log('='.repeat(60));
  console.log('FarmSight CSV Export');
  console.log('='.repeat(60));

  // Export products
  await exportToCSV('products', 'export_products.csv', 'created_at');

  // Export profiles
  await exportToCSV('profiles', 'export_profiles.csv', 'created_at');

  // Export market_prices
  await exportToCSV('market_prices', 'export_market_prices.csv', 'date');

  // Export price_predictions
  await exportToCSV('price_predictions', 'export_price_predictions.csv', 'predict_date');

  console.log('\n' + '='.repeat(60));
  console.log('Export Complete!');
  console.log('='.repeat(60));
  console.log('\nGenerated files:');
  console.log('  - export_products.csv');
  console.log('  - export_profiles.csv');
  console.log('  - export_market_prices.csv');
  console.log('  - export_price_predictions.csv');
}

main().catch(console.error);
