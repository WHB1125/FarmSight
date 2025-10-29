import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const jiangsuCities = [
  "Nanjing", "Suzhou", "Wuxi", "Changzhou", "Zhenjiang",
  "Nantong", "Yangzhou", "Taizhou", "Xuzhou", "Huai'an",
  "Yancheng", "Lianyungang", "Suqian"
];

function generateMarketPrices(productName: string, basePrice: number, date: Date) {
  return jiangsuCities.map(city => {
    const cityVariation = (city.charCodeAt(0) % 20) / 100;
    const dateVariation = (date.getDate() % 10) / 100;
    const randomVariation = (Math.random() * 0.2) - 0.1;
    const finalPrice = basePrice * (0.85 + cityVariation + dateVariation + randomVariation);
    
    return {
      city,
      price: Math.max(finalPrice, basePrice * 0.7).toFixed(2),
      market_name: `${city} Agricultural Market`,
      date: date.toISOString().split('T')[0],
    };
  });
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
  "Chicken": 18.5,
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
    const daysParam = url.searchParams.get("days");
    const days = daysParam ? parseInt(daysParam) : 1;

    if (action === "fetch" || action === "generate-historical") {
      const { data: products, error: productsError } = await supabase
        .from("products")
        .select("*");

      if (productsError) throw productsError;

      const allPrices = [];
      const today = new Date();
      
      for (let dayOffset = 0; dayOffset < days; dayOffset++) {
        const currentDate = new Date(today);
        currentDate.setDate(today.getDate() - dayOffset);
        
        for (const product of products || []) {
          const basePrice = productBasePrices[product.name] || 5.0;
          const prices = generateMarketPrices(product.name, basePrice, currentDate);
          
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
      }

      const { error: insertError } = await supabase
        .from("market_prices")
        .insert(allPrices);

      if (insertError) throw insertError;

      return new Response(
        JSON.stringify({
          success: true,
          message: "Market prices updated successfully",
          total_prices: allPrices.length,
          days_generated: days,
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