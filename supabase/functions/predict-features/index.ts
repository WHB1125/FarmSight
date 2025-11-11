import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

// ✅ CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// ✅ 定义类型
interface FeatureRequest {
  product: string;
  city: string;
}

interface HistoricalData {
  date: string;
  avg_price: number;
}

// ✅ 获取历史数据
async function getHistoricalData(product: string, city: string): Promise<HistoricalData[]> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: productData, error: productError } = await supabase
    .from("products")
    .select("id")
    .eq("name", product)
    .maybeSingle();

  if (productError || !productData) throw new Error(`Product '${product}' not found`);

  const { data: pricesData, error: pricesError } = await supabase
    .from("market_prices")
    .select("date, price")
    .eq("product_id", productData.id)
    .eq("city", city)
    .order("date", { ascending: true });

  if (pricesError || !pricesData || pricesData.length === 0) {
    throw new Error(`No historical data found for ${product} in ${city}`);
  }

  // 按日期平均化
  const grouped = new Map<string, number[]>();
  pricesData.forEach((row) => {
    const date = row.date.split("T")[0];
    if (!grouped.has(date)) grouped.set(date, []);
    grouped.get(date)!.push(parseFloat(row.price));
  });

  const result: HistoricalData[] = [];
  grouped.forEach((prices, date) => {
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    result.push({ date, avg_price: avg });
  });

  return result.sort((a, b) => a.date.localeCompare(b.date));
}

// ✅ 计算特征向量
function computeFeatureVector(data: HistoricalData[]): number[] {
  const recentData = data.slice(-14);
  const prices = recentData.map((d) => d.avg_price);
  const lastDate = new Date(data[data.length - 1].date);

  // Lag features
  const lag_1 = prices[prices.length - 1] || 0;
  const lag_3 = prices[prices.length - 3] || 0;
  const lag_7 = prices[prices.length - 7] || 0;

  // Rolling mean (last 7 days)
  const last7 = prices.slice(-7);
  const roll7_mean = last7.length > 0 ? last7.reduce((a, b) => a + b, 0) / last7.length : 0;

  // Rolling std (last 7 days)
  const roll7_std = last7.length > 1
    ? Math.sqrt(last7.reduce((sum, p) => sum + Math.pow(p - roll7_mean, 2), 0) / last7.length)
    : 0;

  // Rolling mean (last 10 days)
  const last10 = prices.slice(-10);
  const roll10_mean = last10.length > 0 ? last10.reduce((a, b) => a + b, 0) / last10.length : 0;

  // Date features
  const dow = lastDate.getDay(); // day of week (0-6)
  const dom = lastDate.getDate(); // day of month (1-31)
  const month = lastDate.getMonth() + 1; // month (1-12)

  return [lag_1, lag_3, lag_7, roll7_mean, roll7_std, roll10_mean, dow, dom, month];
}

// ✅ 主处理函数
Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Parse request body
    const { product, city }: FeatureRequest = await req.json();

    if (!product || !city) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: product and city" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`📊 Computing features for ${product} in ${city}`);

    // Get historical data
    const data = await getHistoricalData(product, city);

    if (data.length < 14) {
      throw new Error("Insufficient historical data (need at least 14 days)");
    }

    // Compute feature vector
    const feature_vector = computeFeatureVector(data);

    console.log(`✅ Features computed: ${JSON.stringify(feature_vector)}`);

    // Return feature vector
    return new Response(
      JSON.stringify({
        product,
        city,
        feature_vector,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("❌ Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
