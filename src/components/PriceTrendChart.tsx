import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface PriceTrendData {
  date: string;
  avgPrice: number;
  change: number;
}

interface PriceTrendChartProps {
  productName: string;
  days?: number;
}

export function PriceTrendChart({ productName, days = 7 }: PriceTrendChartProps) {
  const [trendData, setTrendData] = useState<PriceTrendData[]>([]);
  const [loading, setLoading] = useState(true);
  const [productImage, setProductImage] = useState<string>('');
  const [productId, setProductId] = useState<string>('');
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedDatePrice, setSelectedDatePrice] = useState<number | null>(null);

  useEffect(() => {
    loadTrendData();
  }, [productName]);

  async function loadTrendData() {
    try {
      setLoading(true);

      const { data: product } = await supabase
        .from('products')
        .select('id, image_url')
        .eq('name', productName)
        .limit(1)
        .maybeSingle();

      if (!product) return;
      setProductImage(product.image_url || '');
      setProductId(product.id);

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - days);

      const { data: prices, error } = await supabase
        .from('market_prices')
        .select('date, price')
        .eq('product_id', product.id)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (error) throw error;

      const groupedByDate: Record<string, number[]> = {};
      prices?.forEach((price) => {
        if (!groupedByDate[price.date]) {
          groupedByDate[price.date] = [];
        }
        groupedByDate[price.date].push(price.price);
      });

      const trends: PriceTrendData[] = Object.entries(groupedByDate)
        .map(([date, priceList]) => ({
          date,
          avgPrice: priceList.reduce((a, b) => a + b, 0) / priceList.length,
          change: 0,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      for (let i = 1; i < trends.length; i++) {
        trends[i].change = trends[i].avgPrice - trends[i - 1].avgPrice;
      }

      setTrendData(trends);
    } catch (error) {
      console.error('Error loading trend data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading price trends...</p>
        </div>
      </div>
    );
  }

  if (trendData.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 text-center">
        <p className="text-gray-600">No price data available for {productName}</p>
      </div>
    );
  }

  const maxPrice = Math.max(...trendData.map(d => d.avgPrice));
  const minPrice = Math.min(...trendData.map(d => d.avgPrice));
  const priceRange = maxPrice - minPrice;
  const chartHeight = 300;

  const getYPosition = (price: number) => {
    if (priceRange === 0) return chartHeight / 2;
    return chartHeight - ((price - minPrice) / priceRange) * chartHeight;
  };

  const pathData = trendData
    .map((point, index) => {
      const x = (index / (trendData.length - 1)) * 100;
      const y = getYPosition(point.avgPrice);
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  const currentPrice = trendData[trendData.length - 1]?.avgPrice || 0;
  const previousPrice = trendData[0]?.avgPrice || 0;
  const totalChange = currentPrice - previousPrice;
  const percentChange = ((totalChange / previousPrice) * 100).toFixed(2);

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          {productImage && (
            <img
              src={productImage}
              alt={productName}
              className="w-16 h-16 rounded-lg object-cover"
            />
          )}
          <div>
            <h3 className="text-2xl font-bold text-gray-900">{productName} Price Trend</h3>
            <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
              <Calendar className="w-4 h-4" />
              Last 7 days
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-gray-900">¥{currentPrice.toFixed(2)}</p>
          <div className={`flex items-center gap-1 justify-end mt-1 ${totalChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {totalChange >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span className="font-semibold">{totalChange >= 0 ? '+' : ''}{percentChange}%</span>
          </div>
          <button
            onClick={() => setShowCalendar(!showCalendar)}
            className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
          >
            <Calendar className="w-4 h-4" />
            Check Date Price
          </button>
        </div>
      </div>

      <div className="relative" style={{ height: chartHeight }}>
        <svg
          viewBox={`0 0 100 ${chartHeight}`}
          preserveAspectRatio="none"
          className="w-full h-full"
        >
          <defs>
            <linearGradient id="priceGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.05" />
            </linearGradient>
          </defs>

          <path
            d={`${pathData} L 100 ${chartHeight} L 0 ${chartHeight} Z`}
            fill="url(#priceGradient)"
          />

          <path
            d={pathData}
            fill="none"
            stroke="#3B82F6"
            strokeWidth="0.5"
            vectorEffect="non-scaling-stroke"
          />

          {trendData.map((point, index) => {
            const x = (index / (trendData.length - 1)) * 100;
            const y = getYPosition(point.avgPrice);
            const isIncrease = point.change >= 0;

            return (
              <g key={index}>
                <circle
                  cx={x}
                  cy={y}
                  r="1"
                  fill={isIncrease ? '#10B981' : '#EF4444'}
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            );
          })}
        </svg>

        <div className="absolute top-0 right-0 text-xs text-gray-500">
          ¥{maxPrice.toFixed(2)}
        </div>
        <div className="absolute bottom-0 right-0 text-xs text-gray-500">
          ¥{minPrice.toFixed(2)}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-7 gap-2">
        {trendData.slice(-7).map((point, index) => {
          const date = new Date(point.date);
          const isIncrease = point.change >= 0;

          return (
            <div key={index} className="text-center">
              <div className={`text-xs font-medium mb-1 ${isIncrease ? 'text-green-600' : 'text-red-600'}`}>
                {isIncrease ? '+' : ''}{point.change.toFixed(2)}
              </div>
              <div className="text-xs text-gray-600 font-medium">
                ¥{point.avgPrice.toFixed(2)}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {date.getMonth() + 1}/{date.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex items-center justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span className="text-gray-600">Price Increase</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <span className="text-gray-600">Price Decrease</span>
        </div>
      </div>

      {showCalendar && (
        <div className="mt-6 border-t pt-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Select a Date to View Price</h4>
          <div className="bg-gray-50 rounded-lg p-4">
            <input
              type="date"
              value={selectedDate}
              onChange={async (e) => {
                const date = e.target.value;
                setSelectedDate(date);

                if (date && productId) {
                  try {
                    const { data, error } = await supabase
                      .from('market_prices')
                      .select('price')
                      .eq('product_id', productId)
                      .eq('date', date);

                    if (error) throw error;

                    if (data && data.length > 0) {
                      const avgPrice = data.reduce((sum, item) => sum + item.price, 0) / data.length;
                      setSelectedDatePrice(avgPrice);
                    } else {
                      setSelectedDatePrice(null);
                    }
                  } catch (error) {
                    console.error('Error fetching price for date:', error);
                    setSelectedDatePrice(null);
                  }
                }
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {selectedDate && (
              <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
                <p className="text-sm text-gray-600 mb-2">
                  Price on {new Date(selectedDate).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
                {selectedDatePrice !== null ? (
                  <p className="text-2xl font-bold text-gray-900">¥{selectedDatePrice.toFixed(2)}</p>
                ) : (
                  <p className="text-gray-500">No price data available for this date</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
