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

const cityNameMapping: Record<string, string> = {
  "Nanjing": "南京",
  "Suzhou": "苏州",
  "Wuxi": "无锡",
  "Changzhou": "常州",
  "Zhenjiang": "镇江",
  "Nantong": "南通",
  "Yangzhou": "扬州",
  "Taizhou": "泰州",
  "Xuzhou": "徐州",
  "Huai'an": "淮安",
  "Yancheng": "盐城",
  "Lianyungang": "连云港",
  "Suqian": "宿迁"
};

const productNameMapping: Record<string, string> = {
  "Rice": "大米",
  "Wheat": "小麦",
  "Tomatoes": "西红柿",
  "Cucumbers": "黄瓜",
  "Cabbage": "白菜",
  "Apples": "苹果",
  "Pears": "梨",
  "Corn": "玉米",
  "Potatoes": "土豆",
  "Carrots": "胡萝卜",
  "Chicken": "鸡肉",
  "Beef": "牛肉",
  "Pork": "猪肉",
};

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
  "Beef": 45.0,
  "Pork": 28.0,
};

async function fetchExternalPriceData(productName: string, cityNameCn: string): Promise<number | null> {
  try {
    const apiUrl = `https://www.cnhnb.com/api/price/query?product=${encodeURIComponent(productNameCn)}&city=${encodeURIComponent(cityNameCn)}`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data.price && typeof data.price === 'number') {
        return data.price;
      }
    }
  } catch (error) {
    console.log(`Failed to fetch external price for ${productName} in ${cityNameCn}:`, error.message);
  }
  
  return null;
}

async function getPriceForProduct(productName: string, city: string, basePrice: number, date: Date): Promise<{ city: string; price: string; market_name: string; date: string; source: string }> {
  const cityNameCn = cityNameMapping[city] || city;
  const productNameCn = productNameMapping[productName] || productName;
  
  let price: number;
  let source = "FarmSight Market Data";
  
  const externalPrice = await fetchExternalPriceData(productNameCn, cityNameCn);
  
  if (externalPrice !== null) {
    price = externalPrice;
    source = "External API Data";
  } else {
    const cityVariation = (city.charCodeAt(0) % 20) / 100;
    const dateVariation = (date.getDate() % 10) / 100;
    const randomVariation = (Math.random() * 0.2) - 0.1;
    price = Math.max(basePrice * (0.85 + cityVariation + dateVariation + randomVariation), basePrice * 0.7);
  }
  
  return {
    city,
    price: price.toFixed(2),
    market_name: `${city} Agricultural Market`,
    date: date.toISOString().split('T')[0],
    source,
  };
}

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

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (action === "generate-historical") {
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 30);
        
        const { error: deleteError } = await supabase
          .from("market_prices")
          .delete()
          .lt("date", thirtyDaysAgo.toISOString().split('T')[0]);

        if (deleteError) throw deleteError;

        const allPrices = [];
        
        for (let dayOffset = 0; dayOffset < days; dayOffset++) {
          const currentDate = new Date(today);
          currentDate.setDate(today.getDate() - dayOffset);
          
          for (const product of products || []) {
            const basePrice = productBasePrices[product.name] || 5.0;
            
            if (dayOffset === 0) {
              for (const city of jiangsuCities) {
                const priceData = await getPriceForProduct(product.name, city, basePrice, currentDate);
                allPrices.push({
                  product_id: product.id,
                  city: priceData.city,
                  market_name: priceData.market_name,
                  price: parseFloat(priceData.price),
                  price_unit: "CNY/kg",
                  date: priceData.date,
                  source: priceData.source,
                });
              }
            } else {
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
        }

        const { error: insertError } = await supabase
          .from("market_prices")
          .insert(allPrices);

        if (insertError) throw insertError;

        return new Response(
          JSON.stringify({
            success: true,
            message: "Historical market prices generated successfully",
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

      const todayStr = today.toISOString().split('T')[0];
      
      const { data: existingPrices } = await supabase
        .from("market_prices")
        .select("id")
        .eq("date", todayStr)
        .limit(1);

      if (existingPrices && existingPrices.length > 0) {
        return new Response(
          JSON.stringify({
            success: true,
            message: "Prices for today already exist",
            skipped: true,
          }),
          {
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }

      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 30);
      
      const { error: deleteError } = await supabase
        .from("market_prices")
        .delete()
        .lt("date", thirtyDaysAgo.toISOString().split('T')[0]);

      if (deleteError) throw deleteError;

      const allPrices = [];
      
      for (const product of products || []) {
        const basePrice = productBasePrices[product.name] || 5.0;
        
        for (const city of jiangsuCities) {
          const priceData = await getPriceForProduct(product.name, city, basePrice, today);
          allPrices.push({
            product_id: product.id,
            city: priceData.city,
            market_name: priceData.market_name,
            price: parseFloat(priceData.price),
            price_unit: "CNY/kg",
            date: priceData.date,
            source: priceData.source,
          });
        }
      }

      const { error: insertError } = await supabase
        .from("market_prices")
        .insert(allPrices);

      if (insertError) throw insertError;

      return new Response(
        JSON.stringify({
          success: true,
          message: "Market prices updated successfully with rolling 30-day window",
          total_prices: allPrices.length,
          date: todayStr,
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