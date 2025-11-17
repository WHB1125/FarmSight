import { useState, useEffect } from 'react';
import { MapPin, Store, Building, Users, Phone, MapPinned, TrendingDown, TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Seller {
  id: string;
  city: string;
  seller_name: string;
  seller_type: string;
  price: number;
  contact: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  source_url: string | null;
}

interface Props {
  productId: string;
  productName: string;
  unit: string;
}

export function RegionalMarketMap({ productId, productName, unit }: Props) {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [hoveredSeller, setHoveredSeller] = useState<string | null>(null);

  const cityPositions: Record<string, { x: number; y: number; cn: string }> = {
    'Nanjing': { x: 280, y: 420, cn: '南京市' },
    'Suzhou': { x: 490, y: 480, cn: '苏州市' },
    'Wuxi': { x: 380, y: 350, cn: '无锡市' },
    'Changzhou': { x: 320, y: 380, cn: '常州市' },
    'Xuzhou': { x: 150, y: 120, cn: '徐州市' },
    'Nantong': { x: 520, y: 360, cn: '南通市' },
    'Yangzhou': { x: 340, y: 280, cn: '扬州市' },
    'Taizhou': { x: 400, y: 240, cn: '泰州市' },
    'Zhenjiang': { x: 360, y: 360, cn: '镇江市' },
    'Yancheng': { x: 480, y: 210, cn: '盐城市' },
    'Huai\'an': { x: 300, y: 180, cn: '淮安市' },
    'Lianyungang': { x: 380, y: 80, cn: '连云港市' },
    'Suqian': { x: 260, y: 240, cn: '宿迁市' },
  };

  useEffect(() => {
    loadSellers();
  }, [productId]);

  async function loadSellers() {
    setLoading(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(
        `${supabaseUrl}/functions/v1/fetch-huinong-sellers`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ product_name: productName }),
        }
      );

      if (response.ok) {
        const { data: sellersData, error } = await supabase
          .from('sellers')
          .select('*')
          .eq('product_id', productId)
          .order('city');

        if (!error && sellersData) {
          setSellers(sellersData);
        }
      }
    } catch (error) {
      console.error('Error loading sellers:', error);
    } finally {
      setLoading(false);
    }
  }

  function getCityData(city: string) {
    const citySellers = sellers.filter(s => s.city === city);
    if (citySellers.length === 0) return null;

    const avgPrice = citySellers.reduce((sum, s) => sum + s.price, 0) / citySellers.length;
    const minPrice = Math.min(...citySellers.map(s => s.price));
    const maxPrice = Math.max(...citySellers.map(s => s.price));

    return { sellers: citySellers, avgPrice, minPrice, maxPrice, count: citySellers.length };
  }

  function getPriceColor(price: number) {
    const allPrices = sellers.map(s => s.price);
    const minGlobal = Math.min(...allPrices);
    const maxGlobal = Math.max(...allPrices);
    const range = maxGlobal - minGlobal;

    if (range === 0) return '#10b981';

    const normalized = (price - minGlobal) / range;

    if (normalized < 0.33) return '#10b981';
    if (normalized < 0.66) return '#f59e0b';
    return '#ef4444';
  }

  function getSellerIcon(type: string) {
    switch (type) {
      case 'wholesale_market': return Building;
      case 'cooperative': return Users;
      case 'distributor': return MapPinned;
      default: return Store;
    }
  }

  const filteredSellers = selectedCity
    ? sellers.filter(s => s.city === selectedCity)
    : sellers;

  const globalAvgPrice = sellers.length > 0
    ? sellers.reduce((sum, s) => sum + s.price, 0) / sellers.length
    : 0;

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-md p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">正在加载区域市场数据...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MapPin className="w-6 h-6 text-green-600" />
            区域市场分布 - {productName}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            江苏省 {Object.keys(cityPositions).length} 个城市共 {sellers.length} 家供应商
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600">区域平均价格</p>
          <p className="text-2xl font-bold text-green-600">
            ¥{globalAvgPrice.toFixed(2)} / {unit}
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="relative">
              <img
                src="/image copy copy.png"
                alt="江苏省地图"
                className="w-full h-auto"
              />
              <svg viewBox="0 0 650 580" className="absolute inset-0 w-full h-full">

                {Object.entries(cityPositions).map(([city, pos]) => {
                  const cityData = getCityData(city);
                  if (!cityData) return null;

                  const isSelected = selectedCity === city;
                  const radius = isSelected ? 28 : 18 + (cityData.count * 1.5);
                  const color = getPriceColor(cityData.avgPrice);

                  return (
                    <g key={city}>
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r={radius}
                        fill={color}
                        opacity={isSelected ? 0.95 : 0.85}
                        stroke="white"
                        strokeWidth="3"
                        className="cursor-pointer transition-all duration-300 drop-shadow-lg"
                        onMouseEnter={() => setSelectedCity(city)}
                        onMouseLeave={() => setSelectedCity(null)}
                      />
                      <text
                        x={pos.x}
                        y={pos.y + 4}
                        textAnchor="middle"
                        className="text-sm font-bold fill-white pointer-events-none"
                        style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}
                      >
                        ¥{cityData.avgPrice.toFixed(0)}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            <div className="flex items-center justify-center gap-6 mt-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-green-500"></div>
                <span className="text-gray-700">低价区</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
                <span className="text-gray-700">中价区</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-red-500"></div>
                <span className="text-gray-700">高价区</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Store className="w-4 h-4 text-green-600" />
              {selectedCity ? `${cityPositions[selectedCity]?.cn || selectedCity} 供应商` : '所有供应商'}
            </h3>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredSellers.length === 0 ? (
                <p className="text-sm text-gray-500">暂无供应商信息</p>
              ) : (
                filteredSellers.map((seller) => {
                  const Icon = getSellerIcon(seller.seller_type);
                  const isLowPrice = seller.price < globalAvgPrice;

                  return (
                    <div
                      key={seller.id}
                      className={`bg-white rounded-lg p-3 border-2 transition-all cursor-pointer ${
                        hoveredSeller === seller.id
                          ? 'border-green-500 shadow-md'
                          : 'border-gray-200 hover:border-green-300'
                      }`}
                      onMouseEnter={() => setHoveredSeller(seller.id)}
                      onMouseLeave={() => setHoveredSeller(null)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-start gap-2 flex-1">
                          <Icon className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-gray-900 truncate">
                              {seller.seller_name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {cityPositions[seller.city]?.cn || seller.city}
                            </p>
                          </div>
                        </div>
                        <div className="text-right ml-2">
                          <p className="text-lg font-bold text-green-600 whitespace-nowrap">
                            ¥{seller.price.toFixed(2)}
                          </p>
                          <div className="flex items-center gap-1 justify-end">
                            {isLowPrice ? (
                              <TrendingDown className="w-3 h-3 text-green-600" />
                            ) : (
                              <TrendingUp className="w-3 h-3 text-red-600" />
                            )}
                            <span className={`text-xs ${isLowPrice ? 'text-green-600' : 'text-red-600'}`}>
                              {isLowPrice ? '低于均价' : '高于均价'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {seller.address && (
                        <p className="text-xs text-gray-600 mb-1 flex items-start gap-1">
                          <MapPinned className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          <span className="line-clamp-2">{seller.address}</span>
                        </p>
                      )}

                      {seller.contact && (
                        <p className="text-xs text-gray-600 flex items-center gap-1">
                          <Phone className="w-3 h-3 flex-shrink-0" />
                          <span>{seller.contact}</span>
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {selectedCity && (
            <button
              onClick={() => setSelectedCity(null)}
              className="w-full py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
            >
              显示所有城市
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
