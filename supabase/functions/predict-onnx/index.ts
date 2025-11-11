import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as ort from "npm:onnxruntime-web@1.17.0";

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

interface HistoricalData {
  date: string;
  avg_price: number;
}

let cachedSession: ort.InferenceSession | null = null;

async function loadONNXModel(): Promise<ort.InferenceSession> {
  if (cachedSession) {
    return cachedSession;
  }

  console.log("Loading ONNX model from Supabase Storage...");

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await supabase.storage
    .from("models")
    .download("price_prediction_model.onnx");

  if (error) {
    throw new Error(`Failed to download model: ${error.message}`);
  }

  const arrayBuffer = await data.arrayBuffer();
  const buffer = new Uint8Array(arrayBuffer);

  cachedSession = await ort.InferenceSession.create(buffer);
  console.log("✓ ONNX model loaded successfully");

  return cachedSession;
}

async function getHistoricalData(
  product: string,
  city: string
): Promise<HistoricalData[]> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: productData, error: productError } = await supabase
    .from("products")
    .select("id")
    .eq("name", product)
    .maybeSingle();

  if (productError || !productData) {
    throw new Error(`Product '${product}' not found`);
  }

  const { data: pricesData, error: pricesError } = await supabase
    .from("market_prices")
    .select("date, price")
    .eq("product_id", productData.id)
    .eq("city", city)
    .order("date", { ascending: true });

  if (pricesError || !pricesData || pricesData.length === 0) {
    throw new Error(`No historical data found for ${product} in ${city}`);
  }

  const grouped = new Map<string, number[]>();
  pricesData.forEach((row) => {
    const date = row.date.split("T")[0];
    if (!grouped.has(date)) {
      grouped.set(date, []);
    }
    grouped.get(date)!.push(parseFloat(row.price));
  });

  const result: HistoricalData[] = [];
  grouped.forEach((prices, date) => {
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    result.push({ date, avg_price: avg });
  });

  return result.sort((a, b) => a.date.localeCompare(b.date));
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

async function predictPrices(
  session: ort.InferenceSession,
  data: HistoricalData[],
  days: number
): Promise<Array<{ date: string; price: number }>> {
  const predictions: Array<{ date: string; price: number }> = [];
  const lastDate = new Date(data[data.length - 1].date);
  const recentData = [...data.slice(-14)];

  for (let dayOffset = 1; dayOffset <= days; dayOffset++) {
    const predictDate = addDays(lastDate, dayOffset);
    const year = predictDate.getFullYear();
    const month = predictDate.getMonth() + 1;
    const dayOfWeek = predictDate.getDay();
    const day = predictDate.getDate();

    let priceLag1, priceLag2, priceLag3;

    if (dayOffset === 1) {
      priceLag1 = recentData[recentData.length - 1].avg_price;
      priceLag2 = recentData[recentData.length - 2].avg_price;
      priceLag3 = recentData[recentData.length - 3].avg_price;
    } else {
      priceLag1 = predictions.length > 0 ? predictions[predictions.length - 1].price : recentData[recentData.length - 1].avg_price;
      priceLag2 = predictions.length > 1 ? predictions[predictions.length - 2].price : recentData[recentData.length - 2].avg_price;
      priceLag3 = predictions.length > 2 ? predictions[predictions.length - 3].price : recentData[recentData.length - 3].avg_price;
    }

    const rolling7 = recentData.slice(-7).reduce((sum, d) => sum + d.avg_price, 0) / Math.min(7, recentData.length);
    const rolling14 = recentData.reduce((sum, d) => sum + d.avg_price, 0) / recentData.length;

    const inputData = new Float32Array([year, month, dayOfWeek, day, priceLag1, priceLag2, priceLag3, rolling7, rolling14]);
    const tensor = new ort.Tensor("float32", inputData, [1, 9]);

    const feeds = { float_input: tensor };
    const results = await session.run(feeds);

    const output = results.variable;
    const predictedPrice = output.data[0] as number;

    const dateStr = predictDate.toISOString().split("T")[0];
    predictions.push({
      date: dateStr,
      price: Math.round(predictedPrice * 100) / 100,
    });

    recentData.push({ date: dateStr, avg_price: predictedPrice });
  }

  return predictions;
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

    const session = await loadONNXModel();
    const historicalData = await getHistoricalData(product, city);
    const predictions = await predictPrices(session, historicalData, days);

    return new Response(
      JSON.stringify({
        success: true,
        product,
        city,
        predictions,
        model_version: "ONNX-XGBoost-v1.0",
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