import { useState } from 'react';
import { TrendingUp, AlertCircle, Loader2 } from 'lucide-react';
import { predictionApi, PredictionResponse } from '../services/predictionApi';

export default function RealtimePrediction() {
  const [product, setProduct] = useState('Potatoes');
  const [city, setCity] = useState('Nanjing');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [predictions, setPredictions] = useState<PredictionResponse | null>(null);

  const handlePredict = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await predictionApi.predictPrices({
        product,
        city,
        days: 3,
      });

      setPredictions(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch predictions');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center gap-2 mb-6">
        <TrendingUp className="text-blue-600" size={24} />
        <h2 className="text-2xl font-bold text-gray-800">Real-time Price Prediction</h2>
      </div>

      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Product
          </label>
          <input
            type="text"
            value={product}
            onChange={(e) => setProduct(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., Potatoes"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            City
          </label>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., Nanjing"
          />
        </div>

        <button
          onClick={handlePredict}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              Predicting...
            </>
          ) : (
            'Predict Prices'
          )}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <h3 className="font-semibold text-red-900">Error</h3>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      {predictions && predictions.success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="mb-4">
            <h3 className="font-bold text-green-900 text-lg">
              {predictions.product} in {predictions.city}
            </h3>
            <p className="text-sm text-green-700">Model: {predictions.model_version}</p>
          </div>

          <div className="space-y-3">
            {predictions.predictions.map((pred, index) => (
              <div
                key={index}
                className="flex justify-between items-center bg-white rounded-lg p-4 shadow-sm"
              >
                <span className="font-medium text-gray-700">{pred.date}</span>
                <span className="text-xl font-bold text-green-600">
                  ¥{pred.price.toFixed(2)}/kg
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
