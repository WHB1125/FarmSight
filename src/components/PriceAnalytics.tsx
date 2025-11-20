import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, BarChart3, PieChart, Calendar, MapPin, Loader, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import * as ort from 'onnxruntime-web';

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

interface PriceAnalyticsProps {
  userRole: 'farmer' | 'manager' | 'retailer';
}

interface PredictionResult {
  date: string;
  price: number;
}

export function PriceAnalytics({ userRole }: PriceAnalyticsProps) {
  const [prices, setPrices] = useState<MarketPrice[]>([]);
  const [loading, setLoading] = useState(true);

  const [product, setProduct] = useState('Beef');
  const [city, setCity] = useState('Nanjing');
  const [predicting, setPredicting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [predictions, setPredictions] = useState<PredictionResult[]>([]);

  const products = ['Pork', 'Beef', 'Chicken', 'Rice', 'Cabbage', 'Apples', 'Wheat', 'Tomatoes', 'Cucumbers', 'Potatoes', 'Carrots', 'Corn', 'Pears'];
  const cities = ['Nanjing', 'Suzhou', 'Wuxi', 'Changzhou', 'Xuzhou', 'Nantong', 'Yangzhou', 'Taizhou'];

  useEffect(() => {
    loadPrices();
    ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.23.2/dist/';
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

  const handlePredict = async () => {
    setPredicting(true);
    setError(null);
    setPredictions([]);

    try {
      console.log('🔍 Fetching feature vector...');

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const featureResponse = await fetch(
        `${supabaseUrl}/functions/v1/predict-onnx`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ product, city }),
        }
      );

      if (!featureResponse.ok) {
        const errorData = await featureResponse.json();
        throw new Error(errorData.error || 'Failed to fetch features');
      }

      const { feature_vector, schema } = await featureResponse.json();
      console.log(`✅ Feature vector received: ${feature_vector.length} dimensions`);

      console.log('🔄 Loading ONNX model...');
      const modelUrl = 'https://qhnztjjepgewzmimlhkn.supabase.co/storage/v1/object/public/model/model.onnx';
      const session = await ort.InferenceSession.create(modelUrl);
      console.log('✅ Model loaded successfully');

      const inputName = session.inputNames[0];
      const outputName = session.outputNames[0];

      const results: PredictionResult[] = [];
      let currentFeatures = [...feature_vector];
      const today = new Date();

      const numericFeaturesCount = 9;
      const productOneHotStart = 9;
      const cityOneHotStart = 22;

      for (let i = 1; i <= 7; i++) {
        const inputTensor = new ort.Tensor('float32', new Float32Array(currentFeatures), [1, schema.transformed_dim]);
        const feeds = { [inputName]: inputTensor };
        const output = await session.run(feeds);
        const predictedPrice = output[outputName].data[0] as number;

        const predDate = new Date(today);
        predDate.setDate(predDate.getDate() + i);

        results.push({
          date: predDate.toISOString().split('T')[0],
          price: Math.max(0, predictedPrice),
        });

        const newNumericFeatures = [
          predictedPrice,
          currentFeatures[0],
          currentFeatures[1],
          (currentFeatures[3] * 6 + predictedPrice) / 7,
          currentFeatures[4],
          (currentFeatures[5] * 9 + predictedPrice) / 10,
          predDate.getDay(),
          predDate.getDate(),
          predDate.getMonth() + 1,
        ];

        currentFeatures = [
          ...newNumericFeatures,
          ...currentFeatures.slice(productOneHotStart, cityOneHotStart),
          ...currentFeatures.slice(cityOneHotStart),
        ];
      }

      console.log('✅ Predictions generated:', results);
      setPredictions(results);

    } catch (err: any) {
      console.error('❌ Prediction error:', err);
      setError(err.message || 'Failed to generate predictions');
    } finally {
      setPredicting(false);
    }
  };

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

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-green-600" />
          AI Price Prediction
        </h2>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-green-600" />
              Agricultural Product
            </label>
            <select
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
              disabled={predicting}
            >
              {products.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-green-600" />
              City / Market
            </label>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
              disabled={predicting}
            >
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handlePredict}
          disabled={predicting}
          className="w-full md:w-auto px-8 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 mb-6"
        >
          {predicting ? (
            <>
              <Loader className="w-5 h-5 animate-spin" />
              Predicting...
            </>
          ) : (
            <>
              <TrendingUp className="w-5 h-5" />
              Generate 7-Day Prediction
            </>
          )}
        </button>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900">Prediction Failed</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        )}

        {predictions.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              7-Day Price Forecast for {product} in {city}
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Date</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Predicted Price</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {predictions.map((pred, idx) => {
                    const prevPrice = idx > 0 ? predictions[idx - 1].price : pred.price;
                    const change = pred.price - prevPrice;
                    const changePercent = prevPrice > 0 ? (change / prevPrice) * 100 : 0;

                    return (
                      <tr key={pred.date} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4 text-sm text-gray-900 font-medium">
                          {new Date(pred.date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </td>
                        <td className="py-3 px-4 text-lg font-semibold text-green-700">
                          ¥{pred.price.toFixed(2)}/kg
                        </td>
                        <td className="py-3 px-4">
                          {idx > 0 && (
                            <span
                              className={`inline-flex items-center gap-1 text-sm font-medium ${
                                change > 0
                                  ? 'text-red-600'
                                  : change < 0
                                  ? 'text-green-600'
                                  : 'text-gray-600'
                              }`}
                            >
                              {change > 0 ? '↑' : change < 0 ? '↓' : '→'}
                              {Math.abs(changePercent).toFixed(1)}%
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

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
    </div>
  );
}
