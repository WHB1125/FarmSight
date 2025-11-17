import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface SellerData {
  product_id: string;
  city: string;
  seller_name: string;
  seller_type: string;
  price: number;
  contact?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  source_url?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { product_name, city } = await req.json();

    if (!product_name) {
      return new Response(
        JSON.stringify({ error: 'product_name is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get product ID
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, name')
      .ilike('name', product_name)
      .maybeSingle();

    if (productError || !product) {
      return new Response(
        JSON.stringify({ error: 'Product not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // City to coordinates mapping (major cities in Jiangsu)
    const cityCoordinates: Record<string, { lat: number; lng: number }> = {
      'Nanjing': { lat: 32.0603, lng: 118.7969 },
      'Suzhou': { lat: 31.2989, lng: 120.5853 },
      'Wuxi': { lat: 31.4912, lng: 120.3120 },
      'Changzhou': { lat: 31.8117, lng: 119.9742 },
      'Xuzhou': { lat: 34.2044, lng: 117.2848 },
      'Nantong': { lat: 31.9829, lng: 120.8943 },
      'Yangzhou': { lat: 32.3912, lng: 119.4121 },
      'Taizhou': { lat: 32.4849, lng: 119.9229 },
    };

    // Since we don't have actual Huinong API access, we'll generate realistic mock data
    // In production, you would call the real Huinong API here
    const cities = city ? [city] : Object.keys(cityCoordinates);
    const sellerTypes = ['wholesale_market', 'dealer', 'distributor', 'cooperative'];
    const mockSellers: SellerData[] = [];

    for (const targetCity of cities) {
      const coords = cityCoordinates[targetCity];
      if (!coords) continue;

      // Generate 3-5 sellers per city
      const sellerCount = Math.floor(Math.random() * 3) + 3;
      
      for (let i = 0; i < sellerCount; i++) {
        const sellerType = sellerTypes[Math.floor(Math.random() * sellerTypes.length)];
        const basePrice = await getAveragePrice(supabase, product.id, targetCity);
        const priceVariation = (Math.random() - 0.5) * basePrice * 0.2; // ±10% variation
        
        mockSellers.push({
          product_id: product.id,
          city: targetCity,
          seller_name: generateSellerName(targetCity, sellerType, i),
          seller_type: sellerType,
          price: Math.max(0.1, basePrice + priceVariation),
          contact: generateContact(),
          address: `${targetCity} ${generateAddress(sellerType)}`,
          latitude: coords.lat + (Math.random() - 0.5) * 0.1,
          longitude: coords.lng + (Math.random() - 0.5) * 0.1,
          source_url: `https://www.cnhnb.com/p/${product_name}`,
        });
      }
    }

    // Insert or update sellers in database
    if (mockSellers.length > 0) {
      // Delete old entries for this product (optional: only if updating)
      if (city) {
        await supabase
          .from('sellers')
          .delete()
          .eq('product_id', product.id)
          .eq('city', city);
      } else {
        await supabase
          .from('sellers')
          .delete()
          .eq('product_id', product.id);
      }

      // Insert new data
      const { error: insertError } = await supabase
        .from('sellers')
        .insert(mockSellers);

      if (insertError) {
        console.error('Insert error:', insertError);
        return new Response(
          JSON.stringify({ error: 'Failed to save seller data', details: insertError }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        sellers_count: mockSellers.length,
        sellers: mockSellers,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function getAveragePrice(
  supabase: any,
  productId: string,
  city: string
): Promise<number> {
  const { data } = await supabase
    .from('market_prices')
    .select('price')
    .eq('product_id', productId)
    .eq('city', city)
    .order('date', { ascending: false })
    .limit(10);

  if (!data || data.length === 0) {
    return 10 + Math.random() * 20; // Default range 10-30
  }

  const avg = data.reduce((sum: number, item: any) => sum + item.price, 0) / data.length;
  return avg;
}

function generateSellerName(city: string, type: string, index: number): string {
  const prefixes = ['鑫', '华', '盛', '农', '丰', '绿', '春', '顺'];
  const suffixes = {
    wholesale_market: '批发市场',
    dealer: '经销商',
    distributor: '配送中心',
    cooperative: '合作社',
  };
  
  const prefix = prefixes[index % prefixes.length];
  return `${city}${prefix}${suffixes[type] || '商户'}`;
}

function generateContact(): string {
  const prefix = ['138', '139', '158', '188', '186'];
  const randomPrefix = prefix[Math.floor(Math.random() * prefix.length)];
  const randomNumber = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
  return `${randomPrefix}${randomNumber}`;
}

function generateAddress(type: string): string {
  const addresses = {
    wholesale_market: '农产品批发市场',
    dealer: '农贸市场',
    distributor: '物流园区',
    cooperative: '农业园区',
  };
  
  const streetNum = Math.floor(Math.random() * 500) + 1;
  return `${addresses[type] || '市场'}${streetNum}号`;
}