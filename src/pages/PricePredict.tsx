import { useState, useEffect } from 'react';
import { TrendingUp, Calendar, MapPin, Loader, AlertCircle } from 'lucide-react';
import * as ort from 'onnxruntime-web';

interface PredictionResult {
  date: string;
  price: number;
}

export default function PricePredict() {
  const [product, setProduct] = useState('Beef');
  const [city, setCity] = useState('Nanjing');
  const [predicting, setPredicting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [predictions, setPredictions] = useState<PredictionResult[]>([]);

  const products = ['Pork', 'Beef', 'Chicken', 'Rice', 'Cabbage', 'Apples', 'Wheat', 'Tomatoes', 'Cucumbers', 'Potatoes', 'Carrots', 'Corn', 'Pears'];
  const cities = ['Nanjing', 'Suzhou', 'Wuxi', 'Changzhou', 'Xuzhou', 'Nantong', 'Yangzhou', 'Taizhou'];

  useEffect(() => {
    ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.23.2/dist/';
  }, []);

  const handlePredict = async () => {
    setPredicting(true);
    setError(null);
    setPredictions([]);

    try {
      console.log('🔍 Fetching feature vector...');

      // 1. 调用 Edge Function 获取 35 维特征向量
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
      console.log('Schema:', schema);

      // 2. 加载 ONNX 模型
      console.log('🔄 Loading ONNX model...');
      const modelUrl = 'https://qhnztjjepgewzmimlhkn.supabase.co/storage/v1/object/public/model/model.onnx';
      const session = await ort.InferenceSession.create(modelUrl);
      console.log('✅ Model loaded successfully');

      // 获取模型的输入和输出名称
      const inputName = session.inputNames[0];
      const outputName = session.outputNames[0];
      console.log('Model input name:', inputName);
      console.log('Model output name:', outputName);

      // 3. 准备输入数据并运行推理（7天预测）
      const results: PredictionResult[] = [];
      let currentFeatures = [...feature_vector];
      const today = new Date();

      // 特征向量结构：[9个数值特征, 13个产品one-hot, 13个城市one-hot] = 35维
      const numericFeaturesCount = 9;
      const productOneHotStart = 9;
      const cityOneHotStart = 22;

      for (let i = 1; i <= 7; i++) {
        // 创建输入张量 - 使用 35 维特征
        const inputTensor = new ort.Tensor('float32', new Float32Array(currentFeatures), [1, schema.transformed_dim]);

        // 运行推理 - 使用动态检测到的输入名称
        const feeds = { [inputName]: inputTensor };
        const output = await session.run(feeds);

        // 获取预测价格 - 使用动态检测到的输出名称
        const predictedPrice = output[outputName].data[0] as number;

        // 计算预测日期
        const predDate = new Date(today);
        predDate.setDate(predDate.getDate() + i);

        results.push({
          date: predDate.toISOString().split('T')[0],
          price: Math.max(0, predictedPrice), // 确保价格非负
        });

        // 更新数值特征（前9个）用于下一次预测
        const newNumericFeatures = [
          predictedPrice,  // new lag_1
          currentFeatures[0],  // new lag_3 (previous lag_1)
          currentFeatures[1],  // new lag_7 (previous lag_3)
          (currentFeatures[3] * 6 + predictedPrice) / 7,  // update roll7_mean
          currentFeatures[4],  // keep roll7_std (简化)
          (currentFeatures[5] * 9 + predictedPrice) / 10,  // update roll10_mean
          predDate.getDay(),  // new dow
          predDate.getDate(),  // new dom
          predDate.getMonth() + 1,  // new month
        ];

        // 保持产品和城市的 one-hot 编码不变
        currentFeatures = [
          ...newNumericFeatures,
          ...currentFeatures.slice(productOneHotStart, cityOneHotStart),  // 产品 one-hot
          ...currentFeatures.slice(cityOneHotStart),  // 城市 one-hot
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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center">
            <img src="/image copy.png" alt="FarmSight Logo" className="w-12 h-12 mr-4" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">AI Price Prediction</h1>
              <p className="text-sm text-gray-600 mt-1">Powered by Machine Learning & ONNX Runtime</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 输入区域 */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-green-600" />
            Configure Prediction
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            {/* 产品选择 */}
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

            {/* 城市选择 */}
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

          {/* 预测按钮 */}
          <button
            onClick={handlePredict}
            disabled={predicting}
            className="mt-6 w-full md:w-auto px-8 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
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
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900">Prediction Failed</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* 预测结果 */}
        {predictions.length > 0 && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-green-600" />
              7-Day Price Forecast for {product} in {city}
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Date</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Predicted Price (¥/kg)</th>
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
                          ¥{pred.price.toFixed(2)}
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

        {/* 说明信息 */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-2">How It Works</h3>
          <ul className="text-sm text-blue-800 space-y-2">
            <li>• <strong>Step 1:</strong> Fetch historical price data and compute feature vectors (lag features, rolling statistics, time features)</li>
            <li>• <strong>Step 2:</strong> Load the ONNX machine learning model from Supabase Storage</li>
            <li>• <strong>Step 3:</strong> Run inference in your browser using ONNX Runtime Web</li>
            <li>• <strong>Step 4:</strong> Generate 7-day rolling predictions by updating features iteratively</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
