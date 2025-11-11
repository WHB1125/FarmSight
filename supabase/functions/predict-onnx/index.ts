import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as ort from "npm:onnxruntime-web@1.17.0";

// ✅ 加载 feature_spec.json
let featureSpecCache: any = null;

async function loadFeatureSpec() {
  if (featureSpecCache) return featureSpecCache;

  const specUrl = Deno.env.get("FEATURE_SPEC_URL");
  if (!specUrl) throw new Error("Missing FEATURE_SPEC_URL environment variable");

  console.log("🔍 Fetching feature spec from:", specUrl);
  const res = await fetch(specUrl);
  if (!res.ok) throw new Error(`Failed to fetch feature spec: ${res.status}`);

  const spec = await res.json();
  featureSpecCache = spec;
  console.log("✅ Feature spec loaded successfully");
  return spec;
}

// ✅ 定义全局 CORS
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// ✅ 定义类型
interface PredictionRequest {
  product: string;
  city: string;
  days?: number;
}

interface HistoricalData {
  date: string;
  avg_price: number;
}

// ✅ 缓存模型
let cachedSession: ort.InferenceSession | null = null;

// ✅ 加载模型
async function loadONNXModel(): Promise<ort.InferenceSession> {
  if (cachedSession) return cachedSession;

  console.log("🔄 Loading ONNX model from Supabase Storage...");
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await supabase.storage.from("model").download("model.onnx");
  if (error) throw new Error(`❌ Failed to download model: ${error.message}`);

  const buffer = new Uint8Array(await data.arrayBuffer());
  cachedSession = await ort.InferenceSession.create(buffer);
  console.log("✅ ONNX model loaded successfully");
  return cachedSession;
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

// ✅ 日期计算函数
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// ✅ 主预测逻辑
async function predictPrices(
  session: ort.InferenceSession,
  data: HistoricalData[],
  product: string,
  city: string,
  days: number
): Promise<Array<{ date: string; price: number }>> {
  const spec = await loadFeatureSpec();
  const predictions: Array<{ date: string; price: number }> = [];
  const lastDate = new Date(data[data.length - 1].date);
  const recentData = [...data.slice(-14)];
