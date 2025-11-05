import { useState, useEffect } from 'react';
import { User, MapPin, Heart, Clock, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface Product {
  id: string;
  name: string;
  category: string;
  image_url: string | null;
}

interface FavoriteProduct {
  id: string;
  product_id: string;
  created_at: string;
  products: Product;
}

interface HistoryItem {
  id: string;
  product_id: string;
  viewed_at: string;
  products: Product;
}

interface UserCenterProps {
  onViewProduct?: (productId: string) => void;
}

export function UserCenter({ onViewProduct }: UserCenterProps) {
  const { profile, signOut } = useAuth();
  const [city, setCity] = useState(profile?.city || '');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [favorites, setFavorites] = useState<FavoriteProduct[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loadingFavorites, setLoadingFavorites] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    fetchFavorites();
    fetchHistory();
  }, []);

  async function fetchFavorites() {
    try {
      setLoadingFavorites(true);
      const { data, error } = await supabase
        .from('user_favorites')
        .select(`
          id,
          product_id,
          created_at,
          products (
            id,
            name,
            category,
            image_url
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFavorites(data || []);
    } catch (error) {
      console.error('Error fetching favorites:', error);
    } finally {
      setLoadingFavorites(false);
    }
  }

  async function fetchHistory() {
    try {
      setLoadingHistory(true);
      const { data, error } = await supabase
        .from('user_history')
        .select(`
          id,
          product_id,
          viewed_at,
          products (
            id,
            name,
            category,
            image_url
          )
        `)
        .order('viewed_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoadingHistory(false);
    }
  }

  async function handleUpdateCity() {
    if (!profile?.id) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('profiles')
        .update({ city, updated_at: new Date().toISOString() })
        .eq('id', profile.id);

      if (error) throw error;
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating city:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleUnfavorite(favoriteId: string) {
    try {
      const { error } = await supabase
        .from('user_favorites')
        .delete()
        .eq('id', favoriteId);

      if (error) throw error;
      setFavorites(favorites.filter(f => f.id !== favoriteId));
    } catch (error) {
      console.error('Error removing favorite:', error);
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-blue-100 p-3 rounded-xl">
            <User className="w-6 h-6 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">User Information</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-600">Full Name</label>
            <p className="text-lg text-gray-900 mt-1">{profile?.full_name}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-600">Email</label>
            <p className="text-lg text-gray-900 mt-1">{profile?.email}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-600">Role</label>
            <p className="text-lg text-gray-900 mt-1 capitalize">{profile?.role}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              City
            </label>
            {isEditing ? (
              <div className="flex gap-2 mt-1">
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your city"
                />
                <button
                  onClick={handleUpdateCity}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400"
                >
                  {loading ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => {
                    setCity(profile?.city || '');
                    setIsEditing(false);
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-1">
                <p className="text-lg text-gray-900">{city || 'Not set'}</p>
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Edit
                </button>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-gray-200">
            <button
              onClick={signOut}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-pink-100 p-3 rounded-xl">
            <Heart className="w-6 h-6 text-pink-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Favorite Products</h2>
        </div>

        {loadingFavorites ? (
          <div className="text-center py-8 text-gray-600">Loading favorites...</div>
        ) : favorites.length === 0 ? (
          <div className="text-center py-8 text-gray-600">
            You have not favorited any products yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {favorites.map((favorite) => (
              <div
                key={favorite.id}
                className="bg-gray-50 rounded-lg p-4 hover:shadow-md transition-shadow relative"
              >
                <button
                  onClick={() => handleUnfavorite(favorite.id)}
                  className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-sm hover:bg-red-50 transition-colors"
                  title="Unfavorite"
                >
                  <X className="w-4 h-4 text-red-600" />
                </button>
                {favorite.products.image_url && (
                  <img
                    src={favorite.products.image_url}
                    alt={favorite.products.name}
                    className="w-full h-32 object-cover rounded-lg mb-3"
                  />
                )}
                <h3 className="font-semibold text-gray-900">{favorite.products.name}</h3>
                <p className="text-sm text-gray-600 capitalize">{favorite.products.category}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-purple-100 p-3 rounded-xl">
            <Clock className="w-6 h-6 text-purple-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Browsing History</h2>
        </div>

        {loadingHistory ? (
          <div className="text-center py-8 text-gray-600">Loading history...</div>
        ) : history.length === 0 ? (
          <div className="text-center py-8 text-gray-600">
            No browsing history yet.
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-4">
                  {item.products.image_url && (
                    <img
                      src={item.products.image_url}
                      alt={item.products.name}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                  )}
                  <div>
                    <h3 className="font-semibold text-gray-900">{item.products.name}</h3>
                    <p className="text-sm text-gray-600">
                      Viewed on {new Date(item.viewed_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onViewProduct?.(item.product_id)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                >
                  View Again
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
