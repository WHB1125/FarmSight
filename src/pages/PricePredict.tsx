import { useState } from "react";
import * as ort from "onnxruntime-web";

export default function PricePredict() {
  const [product, setProduct] = useState("Tomatoes");
  const [city, setCity] = useState("Nanjing");
  const [result, setResult] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  async function handlePredict() {
    setLoading(true);
    setResult(null);
    try {
      // 1️⃣ 获取特征向量
      const res = await fetch(
        `https://qhnztjjepgewzmimlhkn.supabase.co/functions/v1/predict-onnx>?action=features&product=${product}&city=${city}`
      );
      const j = await res.json();

      // 2️⃣ 加载 ONNX 模型
      const session = await ort.InferenceSession.create(
        "https://qhnztjjepgewzmimlhkn.supabase.co/storage/v1/object/public/model/model.onnx"
      );

      // 3️⃣ 构建输入张量并预测
      const inputTensor = new ort.Tensor(
        "float32",
        Float32Array.from(j.feature_vector),
        [1, j.schema.transformed_dim]
      );

      const output = await session.run({ input: inputTensor });
      const outName = Object.keys(output)[0];
      const pred = output[outName].data[0];
      setResult(pred);
    } catch (err) {
      console.error("Prediction error:", err);
      alert("预测失败，请检查 Edge Function 是否部署成功");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 bg-white rounded-xl shadow-lg max-w-xl mx-auto mt-10">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">
        🌾 AI 农产品价格预测
      </h2>

      <div className="flex flex-col gap-3 mb-4">
        <label className="text-gray-700 font-medium">选择商品：</label>
        <select
          value={product}
          onChange={(e) => setProduct(e.target.value)}
          className="border rounded-lg px-3 py-2"
        >
          <option>Tomatoes</option>
          <option>Cabbage</option>
          <option>Rice</option>
          <option>Pears</option>
          <option>Carrots</option>
        </select>

        <label className="text-gray-700 font-medium">选择城市：</label>
        <select
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="border rounded-lg px-3 py-2"
        >
          <option>Nanjing</option>
          <option>Suzhou</option>
          <option>Nantong</option>
          <option>Yangzhou</option>
          <option>Xuzhou</option>
        </select>
      </div>

      <button
        onClick={handlePredict}
        disabled={loading}
        className="bg-green-600 hover:bg-green-700 text-white font-semibold px-5 py-2 rounded-lg transition-all"
      >
        {loading ? "正在预测..." : "开始预测"}
      </button>

      {result !== null && (
        <div className="mt-6 p-4 bg-green-50 border border-green-300 rounded-lg">
          <p className="text-lg text-gray-800">
            ✅ 预测结果：<strong>¥{result.toFixed(2)}</strong>
          </p>
        </div>
      )}
    </div>
  );
}
