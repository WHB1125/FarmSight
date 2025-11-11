import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PredictionRequest {
  product: string;
  city: string;
  days?: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { product, city, days = 3 }: PredictionRequest = await req.json();

    if (!product || !city) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required fields: product, city",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: productData, error: productError } = await supabase
      .from("products")
      .select("id")
      .eq("name", product)
      .maybeSingle();

    if (productError || !productData) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Product '${product}' not found`,
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: pricesData, error: pricesError } = await supabase
      .from("market_prices")
      .select("date, price")
      .eq("product_id", productData.id)
      .eq("city", city)
      .order("date", { ascending: false })
      .limit(30);

    if (pricesError || !pricesData || pricesData.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `No historical data found for ${product} in ${city}`,
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const prices = pricesData.map((p) => parseFloat(p.price)).reverse();
    const recentPrices = prices.slice(-7);
    const avgPrice = recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length;

    let trend = 0;
    if (prices.length >= 2) {
      const recentAvg = recentPrices.slice(-3).reduce((a, b) => a + b, 0) / 3;
      const olderAvg = recentPrices.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
      trend = (recentAvg - olderAvg) / olderAvg;
    }

    const variance = recentPrices.reduce((sum, price) => {
      return sum + Math.pow(price - avgPrice, 2);
    }, 0) / recentPrices.length;
    const stdDev = Math.sqrt(variance);

    const predictions = [];
    const lastDate = new Date(pricesData[0].date);

    for (let i = 1; i <= days; i++) {
      const predictDate = new Date(lastDate);
      predictDate.setDate(predictDate.getDate() + i);

      const randomFactor = (Math.random() - 0.5) * stdDev * 0.3;
      const trendFactor = avgPrice * trend * i * 0.5;
      const predictedPrice = avgPrice + trendFactor + randomFactor;

      predictions.push({
        date: predictDate.toISOString().split("T")[0],
        price: Math.max(0.1, Math.round(predictedPrice * 100) / 100),
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        product,
        city,
        predictions,
        model_version: "Statistical-Moving-Average-v1.0",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});