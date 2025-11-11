# Price Prediction API

Flask API for real-time agricultural product price predictions using XGBoost.

## Deploy to Render (Free)

### Step 1: Prepare Your Code

1. Push the `api/` folder to your GitHub repository
2. Make sure all files are committed:
   - `app.py`
   - `requirements.txt`
   - `render.yaml`

### Step 2: Deploy on Render

1. Go to [Render](https://render.com) and sign up (free account)
2. Click **New +** → **Web Service**
3. Connect your GitHub repository
4. Configure:
   - **Root Directory**: `api`
   - **Runtime**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn app:app`

### Step 3: Add Environment Variables

In Render dashboard, add these environment variables:

- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_KEY`: Your Supabase anon key

### Step 4: Deploy

Click **Create Web Service** - Render will automatically deploy your API.

Your API will be available at: `https://your-service-name.onrender.com`

## API Endpoints

### Health Check
```bash
GET /
```

### Predict Prices
```bash
POST /api/predict
Content-Type: application/json

{
  "product": "Potatoes",
  "city": "Nanjing",
  "days": 3
}
```

Response:
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
  "model_version": "XGBoost-v1.0"
}
```

### Get Products
```bash
GET /api/products
```

## Local Testing

```bash
cd api
pip install -r requirements.txt

# Set environment variables
export SUPABASE_URL="your-url"
export SUPABASE_KEY="your-key"

# Run locally
python app.py
```

Test with curl:
```bash
curl -X POST http://localhost:5000/api/predict \
  -H "Content-Type: application/json" \
  -d '{"product": "Potatoes", "city": "Nanjing", "days": 3}'
```

## Features

- Real-time price predictions using XGBoost
- Model caching for faster responses
- CORS enabled for frontend integration
- Automatic model training on first request
- Support for multiple products and cities
