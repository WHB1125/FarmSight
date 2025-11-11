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

interface FeatureSpec {
  product_categories: string[];
  city_categories: string[];
  numeric_features: string[];
}

// ✅ 缓存 feature_spec
let featureSpecCache: FeatureSpec | null = null;

async function loadFeatureSpec(): Promise<FeatureSpec> {
  if (featureSpecCache) return featureSpecCache;

  const specUrl = Deno.env.get("FEATURE_SPEC_URL");
  if (specUrl) {
    try {
      console.log("🔍 Fetching feature spec from:", specUrl);
      const res = await fetch(specUrl);
      if (res.ok) {
        const spec = await res.json();
        featureSpecCache = spec;
        console.log("✅ Feature spec loaded from URL");
        return spec;
      }
    } catch (err) {
      console.warn("⚠️ Failed to load feature spec from URL, using defaults");
    }
  }

  // 默认配置（基于数据库实际数据）
  featureSpecCache = {
    product_categories: [
      "Apples", "Beef", "Cabbage", "Carrots", "Chicken", "Corn",
      "Cucumbers", "Pears", "Pork", "Potatoes", "Rice", "Tomatoes", "Wheat"
    ],
    city_categories: [
      "Changzhou", "Huai'an", "Lianyungang", "Nanjing", "Nantong",
      "Suqian", "Suzhou", "Taizhou", "Wuxi", "Xuzhou", "Yancheng",
      "Yangzhou", "Zhenjiang"
    ],
    numeric_features: [
      "lag_1", "lag_3", "lag_7", "roll7_mean", "roll7_std",
      "roll10_mean", "dow", "dom", "month"
    ],
  };
  console.log("✅ Using default feature spec");
  return featureSpecCache;
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

// ✅ 计算数值特征（9个）
function computeNumericFeatures(data: HistoricalData[]): number[] {
  const prices = data.slice(-14).map((d) => d.avg_price);
  const lastDate = new Date(data[data.length - 1].date);

  // Lag features
  const lag_1 = prices[prices.length - 1] || 0;
  const lag_3 = prices[prices.length - 3] || 0;
  const lag_7 = prices[prices.length - 7] || 0;

  // Rolling mean (last 7 days)
  const last7 = prices.slice(-7);
  const roll7_mean = last7.length > 0
    ? last7.reduce((a, b) => a + b, 0) / last7.length
    : 0;

  // Rolling std (last 7 days)
  const roll7_std = last7.length > 1
    ? Math.sqrt(last7.reduce((sum, p) => sum + Math.pow(p - roll7_mean, 2), 0) / last7.length)
    : 0;

  // Rolling mean (last 10 days)
  const last10 = prices.slice(-10);
  const roll10_mean = last10.length > 0
    ? last10.reduce((a, b) => a + b, 0) / last10.length
    : 0;

  // Date features
  const dow = lastDate.getDay(); // day of week (0-6)
  const dom = lastDate.getDate(); // day of month (1-31)
  const month = lastDate.getMonth() + 1; // month (1-12)

  return [lag_1, lag_3, lag_7, roll7_mean, roll7_std, roll10_mean, dow, dom, month];
}

// ✅ One-hot 编码
function oneHotEncode(value: string, categories: string[]): number[] {
  const result = new Array(categories.length).fill(0);
  const index = categories.indexOf(value);
  if (index !== -1) {
    result[index] = 1;
  }
  return result;
}

// ✅ 构建完整的 35 维特征向量
async function buildFeatureVector(
  product: string,
  city: string,
  data: HistoricalData[]
): Promise<number[]> {
  const spec = await loadFeatureSpec();

  // 1. 数值特征（9维）
  const numericFeatures = computeNumericFeatures(data);

  // 2. product_name one-hot（13维）
  const productOneHot = oneHotEncode(product, spec.product_categories);

  // 3. city one-hot（13维）
  const cityOneHot = oneHotEncode(city, spec.city_categories);

  // 4. 拼接：9 + 13 + 13 = 35
  const featureVector = [...numericFeatures, ...productOneHot, ...cityOneHot];

  console.log(`📊 Feature vector dimensions: numeric=${numericFeatures.length}, product=${productOneHot.length}, city=${cityOneHot.length}, total=${featureVector.length}`);

  return featureVector;
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

    console.log(`📊 Building feature vector for ${product} in ${city}`);

    // Get historical data
    const data = await getHistoricalData(product, city);

    if (data.length < 14) {
      throw new Error("Insufficient historical data (need at least 14 days)");
    }

    // Build 35-dimensional feature vector
    const feature_vector = await buildFeatureVector(product, city, data);

    if (feature_vector.length !== 35) {
      throw new Error(`Invalid feature vector dimension: expected 35, got ${feature_vector.length}`);
    }

    console.log(`✅ Feature vector generated: ${feature_vector.length} dimensions`);

    // Return feature vector
    return new Response(
      JSON.stringify({
        product,
        city,
        feature_vector,
        schema: {
          transformed_dim: 35,
        },
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
