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

  const cityPositions: Record<string, { x: number; y: number }> = {
    'Nanjing': { x: 300, y: 280 },
    'Suzhou': { x: 450, y: 320 },
    'Wuxi': { x: 400, y: 270 },
    'Changzhou': { x: 350, y: 290 },
    'Xuzhou': { x: 150, y: 150 },
    'Nantong': { x: 420, y: 220 },
    'Yangzhou': { x: 340, y: 240 },
    'Taizhou': { x: 360, y: 200 },
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
          <p className="text-gray-600">Loading regional market data...</p>
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
            Regional Markets - {productName}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {sellers.length} sellers across {Object.keys(cityPositions).length} cities
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600">Average Regional Price</p>
          <p className="text-2xl font-bold text-green-600">
            ¥{globalAvgPrice.toFixed(2)} / {unit}
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-lg p-6">
            <svg viewBox="0 0 600 450" className="w-full h-auto">
              <rect x="0" y="0" width="600" height="450" fill="#f0fdf4" />

              <path
                d="M 100 100 L 500 100 L 500 400 L 100 400 Z"
                fill="#e0f2fe"
                stroke="#bae6fd"
                strokeWidth="2"
                opacity="0.3"
              />

              {Object.entries(cityPositions).map(([city, pos]) => {
                const cityData = getCityData(city);
                if (!cityData) return null;

                const isSelected = selectedCity === city;
                const radius = isSelected ? 25 : 15 + (cityData.count * 2);
                const color = getPriceColor(cityData.avgPrice);

                return (
                  <g key={city}>
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={radius}
                      fill={color}
                      opacity={isSelected ? 0.9 : 0.7}
                      stroke="white"
                      strokeWidth="3"
                      className="cursor-pointer transition-all duration-300"
                      onMouseEnter={() => setSelectedCity(city)}
                      onMouseLeave={() => setSelectedCity(null)}
                    />
                    <text
                      x={pos.x}
                      y={pos.y - radius - 8}
                      textAnchor="middle"
                      className="text-xs font-semibold fill-gray-800 pointer-events-none"
                    >
                      {city}
                    </text>
                    <text
                      x={pos.x}
                      y={pos.y + 5}
                      textAnchor="middle"
                      className="text-xs font-bold fill-white pointer-events-none"
                    >
                      ¥{cityData.avgPrice.toFixed(1)}
                    </text>
                  </g>
                );
              })}
            </svg>

            <div className="flex items-center justify-center gap-6 mt-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-green-500"></div>
                <span className="text-gray-700">Low Price</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
                <span className="text-gray-700">Medium Price</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-red-500"></div>
                <span className="text-gray-700">High Price</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Store className="w-4 h-4 text-green-600" />
              {selectedCity ? `${selectedCity} Sellers` : 'All Sellers'}
            </h3>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredSellers.length === 0 ? (
                <p className="text-sm text-gray-500">No sellers available</p>
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
                              {seller.city}
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
                              {isLowPrice ? 'Below avg' : 'Above avg'}
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
              Show All Cities
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
