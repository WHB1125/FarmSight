import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, BarChart3, PieChart, Sparkles, Search } from 'lucide-react';
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
  const [predictionsLoading, setPredictionsLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState('all');
  const [sortBy, setSortBy] = useState<'date-asc' | 'date-desc' | 'price-asc' | 'price-desc' | 'product-az'>('date-asc');

  const [allCities, setAllCities] = useState<string[]>([]);
  const [allProducts, setAllProducts] = useState<string[]>([]);

  useEffect(() => {
    loadPrices();
    loadPredictionsMetadata();
  }, []);

  useEffect(() => {
    loadPredictions();
  }, [selectedCity, selectedProduct, searchQuery, sortBy]);

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

  async function loadPredictionsMetadata() {
    try {
      const { data, error } = await supabase
        .from('price_predictions')
        .select('city, product_name');

      if (error) throw error;

      const cities = [...new Set((data || []).map(p => p.city))].sort();
      const products = [...new Set((data || []).map(p => p.product_name))].sort();

      setAllCities(cities);
      setAllProducts(products);
    } catch (error) {
      console.error('Error loading predictions metadata:', error);
    }
  }

  async function loadPredictions() {
    try {
      setPredictionsLoading(true);
      let query = supabase
        .from('price_predictions')
        .select('*');

      if (selectedCity !== 'all') {
        query = query.eq('city', selectedCity);
      }

      if (selectedProduct !== 'all') {
        query = query.eq('product_name', selectedProduct);
      }

      if (searchQuery.trim()) {
        query = query.or(`product_name.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      let sortedData = data || [];

      switch (sortBy) {
        case 'date-asc':
          sortedData.sort((a, b) => new Date(a.predict_date).getTime() - new Date(b.predict_date).getTime());
          break;
        case 'date-desc':
          sortedData.sort((a, b) => new Date(b.predict_date).getTime() - new Date(a.predict_date).getTime());
          break;
        case 'price-asc':
          sortedData.sort((a, b) => a.predicted_price - b.predicted_price);
          break;
        case 'price-desc':
          sortedData.sort((a, b) => b.predicted_price - a.predicted_price);
          break;
        case 'product-az':
          sortedData.sort((a, b) => a.product_name.localeCompare(b.product_name));
          break;
      }

      setPredictions(sortedData);
    } catch (error) {
      console.error('Error loading predictions:', error);
    } finally {
      setPredictionsLoading(false);
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

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCity('all');
    setSelectedProduct('all');
    setSortBy('date-asc');
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

      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-purple-100 rounded-xl">
            <Sparkles className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">AI Price Predictions</h2>
            <p className="text-gray-600 text-sm mt-1">XGBoost machine learning forecasts</p>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search product or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
            />
          </div>

          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
          >
            <option value="all">All Cities</option>
            {allCities.map((city) => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>

          <select
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
            className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
          >
            <option value="all">All Products</option>
            {allProducts.map((product) => (
              <option key={product} value={product}>{product}</option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
          >
            <option value="date-asc">Date (Oldest First)</option>
            <option value="date-desc">Date (Newest First)</option>
            <option value="price-asc">Price (Low to High)</option>
            <option value="price-desc">Price (High to Low)</option>
            <option value="product-az">Product (A→Z)</option>
          </select>
        </div>

        {(searchQuery || selectedCity !== 'all' || selectedProduct !== 'all' || sortBy !== 'date-asc') && (
          <div className="mb-4 flex items-center gap-2">
            <button
              onClick={handleResetFilters}
              className="text-sm text-purple-600 hover:text-purple-700 font-medium"
            >
              Reset Filters
            </button>
            <span className="text-sm text-gray-500">• {predictions.length} result{predictions.length !== 1 ? 's' : ''}</span>
          </div>
        )}

        {predictionsLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading predictions...</p>
            </div>
          </div>
        ) : predictions.length === 0 ? (
          <div className="text-center py-12">
            <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Predictions Found</h3>
            <p className="text-gray-600">Try adjusting your filters or run the prediction script to generate forecasts.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Product</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">City</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Date</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Predicted Price (¥)</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Model Version</th>
                  </tr>
                </thead>
                <tbody>
                  {predictions.map((pred) => (
                    <tr key={pred.id} className="border-b border-gray-100 hover:bg-purple-50 transition-colors">
                      <td className="py-3 px-4 font-medium text-gray-900">{pred.product_name}</td>
                      <td className="py-3 px-4 text-gray-700">{pred.city}</td>
                      <td className="py-3 px-4 text-gray-700">
                        {new Date(pred.predict_date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </td>
                      <td className="py-3 px-4 font-bold text-purple-600">¥{pred.predicted_price.toFixed(2)}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{pred.model_version}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
              <p className="text-sm text-gray-700">
                <strong>Note:</strong> These predictions are generated using historical price data and machine learning algorithms.
                Actual prices may vary based on market conditions, weather, and supply chain factors.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
