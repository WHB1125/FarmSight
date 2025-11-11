import { useState } from 'react';
import { Sparkles, TrendingUp, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Product {
  id: string;
  name: string;
  category: string;
}

interface PredictionResult {
  date: string;
  price: number;
}

export function ONNXPredictor() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cities] = useState(['Nanjing', 'Shanghai', 'Beijing', 'Guangzhou', 'Shenzhen']);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedCity, setSelectedCity] = useState('Nanjing');
  const [predictionDays, setPredictionDays] = useState(3);
  const [predictions, setPredictions] = useState<PredictionResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useState(() => {
    loadProducts();
  });

  async function loadProducts() {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, category')
        .order('name');

      if (error) throw error;
      setProducts(data || []);
      if (data && data.length > 0) {
        setSelectedProduct(data[0].id);
      }
    } catch (err) {
      console.error('Error loading products:', err);
    }
  }

  async function generatePredictions() {
    if (!selectedProduct || !selectedCity) {
      setError('Please select a product and city');
      return;
    }

    setLoading(true);
    setError('');
    setPredictions([]);

    try {
      const product = products.find(p => p.id === selectedProduct);
      if (!product) throw new Error('Product not found');

      const { data: historicalData, error: histError } = await supabase
        .from('market_prices')
        .select('date, price')
        .eq('product_id', selectedProduct)
        .eq('city', selectedCity)
        .order('date', { ascending: false })
        .limit(30);

      if (histError) throw histError;

      if (!historicalData || historicalData.length < 14) {
        setError('Insufficient historical data. Need at least 14 days of data.');
        setLoading(false);
        return;
      }

      const sortedData = [...historicalData].reverse();
      const prices = sortedData.map(d => d.price);

      const features: number[][] = [];
      const today = new Date();

      for (let i = 0; i < predictionDays; i++) {
        const predictDate = new Date(today);
        predictDate.setDate(today.getDate() + i + 1);

        const priceData = i === 0 ? prices : [...prices, ...predictions.map(p => p.price)];
        const lag1 = priceData[priceData.length - 1];
        const lag2 = priceData[priceData.length - 2];
        const lag3 = priceData[priceData.length - 3];
        const rolling7 = priceData.slice(-7).reduce((a, b) => a + b, 0) / 7;
        const rolling14 = priceData.slice(-14).reduce((a, b) => a + b, 0) / 14;

        features.push([
          predictDate.getFullYear(),
          predictDate.getMonth() + 1,
          predictDate.getDay(),
          predictDate.getDate(),
          lag1,
          lag2,
          lag3,
          rolling7,
          rolling14,
        ]);
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/predict-with-onnx`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          features,
          productName: product.name,
          city: selectedCity,
        }),
      });

      if (!response.ok) {
        throw new Error(`Prediction failed: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Prediction failed');
      }

      const predictedResults: PredictionResult[] = result.predictions.map((price: number, idx: number) => {
        const date = new Date(today);
        date.setDate(today.getDate() + idx + 1);
        return {
          date: date.toISOString().split('T')[0],
          price,
        };
      });

      setPredictions(predictedResults);

      const recordsToSave = predictedResults.map(pred => ({
        product_id: selectedProduct,
        product_name: product.name,
        city: selectedCity,
        predict_date: pred.date,
        predicted_price: pred.price,
        model_version: result.modelVersion || 'ONNX-XGBoost-v1.0',
      }));

      await supabase.from('price_predictions').insert(recordsToSave);

    } catch (err) {
      console.error('Prediction error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate predictions');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-purple-100 rounded-xl">
          <Sparkles className="w-6 h-6 text-purple-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">ONNX Price Predictor</h2>
          <p className="text-gray-600 text-sm mt-1">Generate AI-powered price forecasts using XGBoost</p>
        </div>
      </div>

      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Product
          </label>
          <select
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
          >
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} ({product.category})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            City
          </label>
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
          >
            {cities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Prediction Days
          </label>
          <input
            type="number"
            min="1"
            max="7"
            value={predictionDays}
            onChange={(e) => setPredictionDays(parseInt(e.target.value) || 3)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
          />
        </div>

        <button
          onClick={generatePredictions}
          disabled={loading}
          className="w-full bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Generating Predictions...
            </>
          ) : (
            <>
              <TrendingUp className="w-5 h-5" />
              Generate Predictions
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {predictions.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-600" />
            Predicted Prices
          </h3>
          <div className="space-y-3">
            {predictions.map((pred, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg border border-purple-200"
              >
                <div>
                  <p className="font-medium text-gray-900">
                    {new Date(pred.date).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                  <p className="text-sm text-gray-600">Day {idx + 1}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-purple-600">¥{pred.price.toFixed(2)}</p>
                  <p className="text-sm text-gray-600">per kg</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              Predictions saved to database and will appear in the analytics view.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
