import { useState, useEffect } from 'react';
import { RefreshCw, Bell, Search, TrendingUp as ChartIcon, Heart } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PriceTrendChart } from './PriceTrendChart';
import { RegionalMarketMap } from './RegionalMarketMap';
import { useAuth } from '../contexts/AuthContext';

interface Product {
  id: string;
  name: string;
  category: string;
  unit: string;
  description: string | null;
  image_url: string | null;
}

interface MarketPrice {
  id: string;
  product_id: string;
  city: string;
  market_name: string | null;
  price: number;
  price_unit: string;
  date: string;
  source: string | null;
  product?: Product;
}

interface PriceMonitorProps {
  userRole: 'farmer' | 'manager' | 'retailer';
}

export function PriceMonitor({ userRole }: PriceMonitorProps) {
  const { profile } = useAuth();
  const [prices, setPrices] = useState<MarketPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'price-asc' | 'price-desc'>('name');
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [selectedProductData, setSelectedProductData] = useState<{ id: string; unit: string } | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [favoriteIds, setFavoriteIds] = useState<Map<string, string>>(new Map());

  const cities = [
    'Nanjing', 'Suzhou', 'Wuxi', 'Changzhou', 'Zhenjiang',
    'Nantong', 'Yangzhou', 'Taizhou', 'Xuzhou', "Huai'an",
    'Yancheng', 'Lianyungang', 'Suqian'
  ];

  const categories = ['Vegetables', 'Fruits', 'Grains', 'Meat'];

  useEffect(() => {
    loadData();
    loadFavorites();
  }, []);

  async function loadData() {
    try {
      setLoading(true);

      const { data: pricesData, error: pricesError } = await supabase
        .from('market_prices')
        .select(`
          *,
          product:products(*)
        `)
        .order('date', { ascending: false });

      if (pricesError) throw pricesError;
      setPrices(pricesData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadFavorites() {
    if (!profile?.id) return;

    try {
      const { data, error } = await supabase
        .from('user_favorites')
        .select('id, product_id');

      if (error) throw error;

      const favSet = new Set<string>();
      const favMap = new Map<string, string>();

      data?.forEach(fav => {
        favSet.add(fav.product_id);
        favMap.set(fav.product_id, fav.id);
      });

      setFavorites(favSet);
      setFavoriteIds(favMap);
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  }

  async function toggleFavorite(productId: string, productName: string) {
    if (!profile?.id) return;

    try {
      const isFavorited = favorites.has(productId);

      if (isFavorited) {
        const favoriteId = favoriteIds.get(productId);
        if (favoriteId) {
          const { error } = await supabase
            .from('user_favorites')
            .delete()
            .eq('id', favoriteId);

          if (error) throw error;

          const newFavorites = new Set(favorites);
          newFavorites.delete(productId);
          setFavorites(newFavorites);

          const newFavoriteIds = new Map(favoriteIds);
          newFavoriteIds.delete(productId);
          setFavoriteIds(newFavoriteIds);
        }
      } else {
        const { data, error } = await supabase
          .from('user_favorites')
          .insert({
            user_id: profile.id,
            product_id: productId,
          })
          .select()
          .single();

        if (error) throw error;

        const newFavorites = new Set(favorites);
        newFavorites.add(productId);
        setFavorites(newFavorites);

        const newFavoriteIds = new Map(favoriteIds);
        newFavoriteIds.set(productId, data.id);
        setFavoriteIds(newFavoriteIds);

        await supabase
          .from('user_history')
          .upsert({
            user_id: profile.id,
            product_id: productId,
            viewed_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id,product_id',
          });
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  }

  async function refreshPrices() {
    try {
      setRefreshing(true);
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-market-prices?action=generate-historical&days=30`,
        {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to refresh prices');

      await loadData();
    } catch (error) {
      console.error('Error refreshing prices:', error);
    } finally {
      setRefreshing(false);
    }
  }

  const filteredPrices = prices.filter((price) => {
    const matchesCity = selectedCity === 'all' || price.city === selectedCity;
    const matchesCategory = selectedCategory === 'all' || price.product?.category === selectedCategory;
    const matchesSearch = searchTerm === '' ||
      price.product?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      price.city.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesCity && matchesCategory && matchesSearch;
  });

  const groupedPrices = filteredPrices.reduce((acc, price) => {
    const key = price.product?.name || 'Unknown';
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(price);
    return acc;
  }, {} as Record<string, MarketPrice[]>);

  const sortedProducts = Object.keys(groupedPrices).sort((a, b) => {
    if (sortBy === 'name') return a.localeCompare(b);

    const avgPriceA = groupedPrices[a].reduce((sum, p) => sum + p.price, 0) / groupedPrices[a].length;
    const avgPriceB = groupedPrices[b].reduce((sum, p) => sum + p.price, 0) / groupedPrices[b].length;

    return sortBy === 'price-asc' ? avgPriceA - avgPriceB : avgPriceB - avgPriceA;
  });

  function getAveragePrice(productPrices: MarketPrice[]) {
    const sum = productPrices.reduce((acc, p) => acc + p.price, 0);
    return (sum / productPrices.length).toFixed(2);
  }

  function getPriceRange(productPrices: MarketPrice[]) {
    const prices = productPrices.map(p => p.price);
    return {
      min: Math.min(...prices).toFixed(2),
      max: Math.max(...prices).toFixed(2),
    };
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading market data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Market Price Monitor</h2>
            <p className="text-gray-600 text-sm mt-1">Real-time agricultural product prices across Jiangsu Province</p>
          </div>
          <button
            onClick={refreshPrices}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh Prices'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search products or cities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Cities</option>
            {cities.map(city => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="name">Sort by Name</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
          </select>
        </div>

        {selectedProduct ? (
          <div className="space-y-6">
            <button
              onClick={() => {
                setSelectedProduct(null);
                setSelectedProductData(null);
              }}
              className="mb-4 text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2"
            >
              ← Back to Products
            </button>
            <PriceTrendChart productName={selectedProduct} />
            {selectedProductData && (
              <RegionalMarketMap
                productId={selectedProductData.id}
                productName={selectedProduct}
                unit={selectedProductData.unit}
              />
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedProducts.map((productName) => {
              const productPrices = groupedPrices[productName];
              const avgPrice = getAveragePrice(productPrices);
              const range = getPriceRange(productPrices);
              const product = productPrices[0].product;

              return (
                <div key={productName} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                  {product?.image_url && (
                    <div className="relative h-40 w-full overflow-hidden bg-gray-100">
                      <img
                        src={product.image_url}
                        alt={productName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-gray-900 text-lg">{productName}</h3>
                        <p className="text-sm text-gray-500">{product?.category}</p>
                      </div>
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                        {product?.unit}
                      </span>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Average Price:</span>
                        <span className="text-xl font-bold text-gray-900">¥{avgPrice}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Range:</span>
                        <span className="text-gray-900">¥{range.min} - ¥{range.max}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Markets:</span>
                        <span className="text-gray-900">{productPrices.length}</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedProduct(productName);
                          setSelectedProductData({
                            id: product?.id || '',
                            unit: product?.unit || 'kg'
                          });
                        }}
                        className="flex-1 text-sm py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors font-medium flex items-center justify-center gap-2"
                      >
                        <ChartIcon className="w-4 h-4" />
                        View Trend
                      </button>
                      <button
                        onClick={() => toggleFavorite(product?.id || '', productName)}
                        className={`p-2 rounded-lg transition-colors ${
                          favorites.has(product?.id || '')
                            ? 'bg-red-100 text-red-600 hover:bg-red-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                        title={favorites.has(product?.id || '') ? 'Unfavorite' : 'Favorite'}
                      >
                        <Heart className={`w-4 h-4 ${favorites.has(product?.id || '') ? 'fill-current' : ''}`} />
                      </button>
                      {userRole !== 'manager' && (
                        <button className="p-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors">
                          <Bell className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!selectedProduct && sortedProducts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No products found matching your filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}
