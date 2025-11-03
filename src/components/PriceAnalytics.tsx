import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, BarChart3, PieChart, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Product {
  id: string;
  name: string;
  category: string;
}

interface MarketPrice {
  product_id: string;
  city: string;
  price: number;
  date: string;
  product?: Product;
}

interface PricePrediction {
  id: string;
  product_name: string;
  city: string;
  predict_date: string;
  predicted_price: number;
  model_version: string;
  created_at: string;
}

interface PriceAnalyticsProps {
  userRole: 'farmer' | 'manager' | 'retailer';
}

export function PriceAnalytics({ userRole }: PriceAnalyticsProps) {
  const [prices, setPrices] = useState<MarketPrice[]>([]);
  const [predictions, setPredictions] = useState<PricePrediction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPrices();
    loadPredictions();
  }, []);

  async function loadPrices() {
    try {
      const { data, error } = await supabase
        .from('market_prices')
        .select(`
          product_id,
          city,
          price,
          date,
          product:products!inner(id, name, category)
        `)
        .order('date', { ascending: false })
        .limit(500);

      if (error) throw error;

      const formattedData = (data || []).map(item => ({
        ...item,
        product: Array.isArray(item.product) ? item.product[0] : item.product
      })) as MarketPrice[];

      setPrices(formattedData);
    } catch (error) {
      console.error('Error loading prices:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadPredictions() {
    try {
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('price_predictions')
        .select('*')
        .gte('predict_date', today)
        .order('predict_date', { ascending: true })
        .order('product_name', { ascending: true });

      if (error) throw error;
      setPredictions(data || []);
    } catch (error) {
      console.error('Error loading predictions:', error);
    }
  }

  const getCategoryStats = () => {
    const categoryData: Record<string, { total: number; avg: number; count: number }> = {};

    prices.forEach((price) => {
      const category = price.product?.category || 'Unknown';
      if (!categoryData[category]) {
        categoryData[category] = { total: 0, avg: 0, count: 0 };
      }
      categoryData[category].total += price.price;
      categoryData[category].count += 1;
    });

    Object.keys(categoryData).forEach((category) => {
      categoryData[category].avg = categoryData[category].total / categoryData[category].count;
    });

    return categoryData;
  };

  const getTopCities = () => {
    const cityData: Record<string, { total: number; count: number }> = {};

    prices.forEach((price) => {
      if (!cityData[price.city]) {
        cityData[price.city] = { total: 0, count: 0 };
      }
      cityData[price.city].total += price.price;
      cityData[price.city].count += 1;
    });

    return Object.entries(cityData)
      .map(([city, data]) => ({
        city,
        avgPrice: data.total / data.count,
        count: data.count,
      }))
      .sort((a, b) => b.avgPrice - a.avgPrice)
      .slice(0, 5);
  };

  const getPriceTrends = () => {
    const productData: Record<string, number[]> = {};

    prices.forEach((price) => {
      const productName = price.product?.name || 'Unknown';
      if (!productData[productName]) {
        productData[productName] = [];
      }
      productData[productName].push(price.price);
    });

    return Object.entries(productData)
      .map(([product, priceList]) => {
        const avg = priceList.reduce((a, b) => a + b, 0) / priceList.length;
        const min = Math.min(...priceList);
        const max = Math.max(...priceList);
        const volatility = ((max - min) / avg * 100).toFixed(1);

        return { product, avg, min, max, volatility: parseFloat(volatility) };
      })
      .sort((a, b) => b.volatility - a.volatility)
      .slice(0, 6);
  };

  const categoryStats = getCategoryStats();
  const topCities = getTopCities();
  const priceTrends = getPriceTrends();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  const getRoleSpecificInsights = () => {
    switch (userRole) {
      case 'farmer':
        return {
          title: 'Selling Opportunities',
          description: 'Best markets and products for your farm',
          color: 'green',
        };
      case 'manager':
        return {
          title: 'Supply Chain Analytics',
          description: 'Market trends and distribution insights',
          color: 'blue',
        };
      case 'retailer':
        return {
          title: 'Purchasing Insights',
          description: 'Best prices and sourcing recommendations',
          color: 'orange',
        };
    }
  };

  const insights = getRoleSpecificInsights();

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{insights.title}</h2>
            <p className="text-gray-600 text-sm mt-1">{insights.description}</p>
          </div>
          <div className={`p-3 bg-${insights.color}-100 rounded-xl`}>
            <BarChart3 className={`w-6 h-6 text-${insights.color}-600`} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {Object.entries(categoryStats).map(([category, data]) => (
            <div key={category} className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900">{category}</h3>
                <PieChart className="w-5 h-5 text-gray-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900 mb-1">¥{data.avg.toFixed(2)}</p>
              <p className="text-sm text-gray-600">{data.count} market listings</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Top Cities by Average Price
            </h3>
            <div className="space-y-3">
              {topCities.map((city, index) => (
                <div key={city.city} className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-900">{city.city}</span>
                      <span className="text-lg font-bold text-gray-900">¥{city.avgPrice.toFixed(2)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${(city.avgPrice / topCities[0].avgPrice) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-red-600" />
              Price Volatility Analysis
            </h3>
            <div className="space-y-3">
              {priceTrends.map((trend) => (
                <div key={trend.product} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">{trend.product}</span>
                    <span className={`text-sm font-bold ${trend.volatility > 20 ? 'text-red-600' : 'text-green-600'}`}>
                      {trend.volatility}% volatility
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>Min: ¥{trend.min.toFixed(2)}</span>
                    <span>Avg: ¥{trend.avg.toFixed(2)}</span>
                    <span>Max: ¥{trend.max.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {userRole === 'farmer' && (
        <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-xl shadow-sm p-6 border-l-4 border-green-500">
          <h3 className="text-lg font-bold text-gray-900 mb-2">Recommended Action</h3>
          <p className="text-gray-700">
            Consider selling in <strong>{topCities[0]?.city}</strong> where prices are highest.
            Focus on <strong>{priceTrends[priceTrends.length - 1]?.product}</strong> for stable returns.
          </p>
        </div>
      )}

      {userRole === 'retailer' && (
        <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl shadow-sm p-6 border-l-4 border-orange-500">
          <h3 className="text-lg font-bold text-gray-900 mb-2">Purchasing Recommendation</h3>
          <p className="text-gray-700">
            Best prices found in <strong>{topCities[topCities.length - 1]?.city}</strong>.
            Stock up on <strong>{priceTrends[priceTrends.length - 1]?.product}</strong> for consistent pricing.
          </p>
        </div>
      )}

      {userRole === 'manager' && (
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl shadow-sm p-6 border-l-4 border-blue-500">
          <h3 className="text-lg font-bold text-gray-900 mb-2">Supply Chain Insight</h3>
          <p className="text-gray-700">
            Price variance across cities suggests opportunities for regional distribution optimization.
            Monitor <strong>{priceTrends[0]?.product}</strong> closely due to high volatility.
          </p>
        </div>
      )}

      {predictions.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-purple-100 rounded-xl">
              <Sparkles className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">AI Price Predictions</h2>
              <p className="text-gray-600 text-sm mt-1">XGBoost machine learning forecasts for next 3 days</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {predictions.map((pred) => (
              <div key={pred.id} className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-bold text-gray-900">{pred.product_name}</h4>
                    <p className="text-sm text-gray-600">{pred.city}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">{new Date(pred.predict_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold text-purple-600">¥{pred.predicted_price.toFixed(2)}</p>
                  <p className="text-sm text-gray-500">/kg</p>
                </div>
                <div className="mt-3 pt-3 border-t border-purple-200">
                  <p className="text-xs text-gray-500">Model: {pred.model_version}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
            <p className="text-sm text-gray-700">
              <strong>Note:</strong> These predictions are generated using historical price data and machine learning algorithms.
              Actual prices may vary based on market conditions, weather, and supply chain factors.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
