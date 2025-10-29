import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Jiangsu cities
const jiangsuCities = [
  "Nanjing", "Suzhou", "Wuxi", "Changzhou", "Zhenjiang",
  "Nantong", "Yangzhou", "Taizhou", "Xuzhou", "Huai'an",
  "Yancheng", "Lianyungang", "Suqian"
];

// Simulate real-time price data (in production, this would call an external API)
function generateMarketPrices(productName: string, basePrice: number) {
  return jiangsuCities.map(city => ({
    city,
    price: (basePrice * (0.85 + Math.random() * 0.3)).toFixed(2),
    market_name: `${city} Agricultural Market`,
    date: new Date().toISOString().split('T')[0],
  }));
}

const productBasePrices: Record<string, number> = {
  "Rice": 4.5,
  "Wheat": 3.8,
  "Tomatoes": 6.2,
  "Cucumbers": 4.5,
  "Cabbage": 2.8,
  "Apples": 8.5,
  "Pears": 7.2,
  "Corn": 3.5,
  "Potatoes": 3.2,
  "Carrots": 4.0,
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "fetch";

    if (action === "fetch") {
      // Fetch all products
      const { data: products, error: productsError } = await supabase
        .from("products")
        .select("*");

      if (productsError) throw productsError;

      // Generate and store price data for all products
      const allPrices = [];
      
      for (const product of products || []) {
        const basePrice = productBasePrices[product.name] || 5.0;
        const prices = generateMarketPrices(product.name, basePrice);
        
        for (const priceData of prices) {
          allPrices.push({
            product_id: product.id,
            city: priceData.city,
            market_name: priceData.market_name,
            price: parseFloat(priceData.price),
            price_unit: "CNY/kg",
            date: priceData.date,
            source: "FarmSight Market Data",
          });
        }
      }

      // Insert new prices
      const { error: insertError } = await supabase
        .from("market_prices")
        .insert(allPrices);

      if (insertError) throw insertError;

      return new Response(
        JSON.stringify({
          success: true,
          message: "Market prices updated successfully",
          total_prices: allPrices.length,
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});