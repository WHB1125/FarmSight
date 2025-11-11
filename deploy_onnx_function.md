# Deploy ONNX Edge Function - Complete Guide

## 📋 Overview

This guide walks you through deploying an ONNX-based price prediction model to Supabase Edge Functions.

## 🎯 Architecture

```
ONNX Model (trained locally)
    ↓
Supabase Storage (model storage)
    ↓
Edge Function (ONNX Runtime)
    ↓
Frontend (API calls)
```

---

## ✅ Prerequisites

1. Python 3.8+ installed
2. Node.js installed
3. Supabase CLI installed (optional for local testing)
4. Trained ONNX model or ability to generate one

---

## 📝 Step-by-Step Instructions

### Step 1: Generate ONNX Model

```bash
# Install Python dependencies
pip install -r requirements.txt

# Convert XGBoost model to ONNX
python convert_to_onnx.py
```

**Expected output:**
```
✓ Model trained with 364 samples
✓ Model saved to price_prediction_model.onnx
✓ Model size: 125.45 KB
```

### Step 2: Upload Model to Supabase Storage

```bash
python upload_model_to_supabase.py
```

**What this does:**
- Creates a `models` bucket in Supabase Storage (if not exists)
- Uploads `price_prediction_model.onnx` to the bucket
- Sets proper permissions

**Expected output:**
```
✓ Bucket exists
✓ Model uploaded successfully
✓ Model size: 125.45 KB
✓ Storage path: models/price_prediction_model.onnx
```

### Step 3: Deploy Edge Function

The Edge Function is located at:
```
supabase/functions/predict-onnx/index.ts
```

**Deploy via Supabase Dashboard:**

1. Go to your Supabase Dashboard
2. Navigate to **Edge Functions**
3. Click **Deploy new function**
4. Name: `predict-onnx`
5. Copy the contents of `supabase/functions/predict-onnx/index.ts`
6. Click **Deploy**

**Environment Variables (automatically available):**
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### Step 4: Test the Edge Function

**Via curl:**
```bash
curl -X POST 'https://YOUR_PROJECT.supabase.co/functions/v1/predict-onnx' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "product": "Potatoes",
    "city": "Nanjing",
    "days": 3
  }'
```

**Expected response:**
```json
{
  "success": true,
  "product": "Potatoes",
  "city": "Nanjing",
  "predictions": [
    {"date": "2025-11-12", "price": 4.25},
    {"date": "2025-11-13", "price": 4.30},
    {"date": "2025-11-14", "price": 4.28}
  ],
  "model_version": "ONNX-XGBoost-v1.0"
}
```

### Step 5: Update Frontend

Update your `.env` file:
```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

Use the prediction service:
```typescript
import { supabase } from './lib/supabase';

const { data, error } = await supabase.functions.invoke('predict-onnx', {
  body: {
    product: 'Potatoes',
    city: 'Nanjing',
    days: 3
  }
});

console.log(data);
```

---

## 🔧 How It Works

### 1. Model Loading
- Edge Function downloads ONNX model from Supabase Storage
- Model is cached in memory for faster subsequent requests
- ONNX Runtime loads the model

### 2. Data Preparation
- Fetches historical prices from Supabase database
- Calculates features (lag prices, rolling averages, date features)
- Prepares input tensor for ONNX model

### 3. Prediction
- Runs ONNX inference for each future day
- Uses predicted prices as lag features for next day
- Returns formatted predictions

### 4. Response
- Returns JSON with predictions array
- Each prediction has date and price
- Includes metadata (product, city, model version)

---

## 🚀 Advantages

✅ **Serverless**: No server management needed
✅ **Fast**: Edge functions run close to users
✅ **Scalable**: Automatically scales with traffic
✅ **Cost-effective**: Pay per request
✅ **Model Caching**: Faster predictions after first load
✅ **Integrated**: Uses same Supabase database

---

## 🐛 Troubleshooting

### Error: "Model not found"
- Verify model uploaded to Supabase Storage
- Check bucket name is `models`
- Ensure file name is `price_prediction_model.onnx`

### Error: "Product not found"
- Verify product exists in database
- Check spelling matches exactly

### Error: "ONNX Runtime error"
- Verify ONNX model format is correct
- Check model input dimensions (should be [1, 9])
- Ensure model was exported with correct feature order

### Slow first request
- First request loads model (takes 2-3 seconds)
- Subsequent requests are fast (<500ms)
- This is normal behavior

---

## 📊 Performance

- **First request**: ~2-3 seconds (loads model)
- **Subsequent requests**: ~300-500ms
- **Model size**: ~100-200 KB
- **Memory usage**: ~50 MB per instance

---

## 🔄 Model Updates

To update the model:

1. Retrain model locally
2. Convert to ONNX
3. Upload to Supabase Storage (overwrites old model)
4. Restart Edge Function (or wait for cold start)

---

## 📚 Key Files

- `convert_to_onnx.py` - Trains and converts model to ONNX
- `upload_model_to_supabase.py` - Uploads model to Storage
- `supabase/functions/predict-onnx/index.ts` - Edge Function
- `src/services/onnxPredictionApi.ts` - Frontend service

---

## 💡 Tips

1. **Model versioning**: Include version in model filename
2. **Error handling**: Always check response.success
3. **Caching**: Model is cached, so restarts clear cache
4. **Monitoring**: Check Edge Function logs in dashboard
5. **Testing**: Test locally before deploying

---

## 🎓 Next Steps

1. Add more products to predictions
2. Implement confidence intervals
3. Add model performance metrics
4. Create admin dashboard for model management
5. Schedule automatic retraining
