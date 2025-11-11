"""
Flask API for Real-time Price Prediction
Provides REST endpoints for agricultural product price predictions
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from xgboost import XGBRegressor
import os

app = Flask(__name__)
CORS(app)

# Global model cache
models_cache = {}

def get_supabase_client():
    """Get Supabase client"""
    from supabase import create_client
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    return create_client(url, key)


def load_historical_data(product_name: str, city: str):
    """Load historical price data"""
    supabase = get_supabase_client()

    product_response = supabase.table("products").select("id").eq("name", product_name).execute()
    if not product_response.data:
        raise ValueError(f"Product '{product_name}' not found")

    product_id = product_response.data[0]["id"]

    prices_response = supabase.table("market_prices")\
        .select("date, price")\
        .eq("product_id", product_id)\
        .eq("city", city)\
        .order("date", desc=False)\
        .execute()

    if not prices_response.data:
        raise ValueError(f"No data found for {product_name} in {city}")

    df = pd.DataFrame(prices_response.data)
    df["date"] = pd.to_datetime(df["date"])
    df["price"] = df["price"].astype(float)
    df = df.groupby("date").agg({"price": "mean"}).reset_index()
    df.rename(columns={"price": "avg_price"}, inplace=True)

    return df, product_id


def create_features(df: pd.DataFrame):
    """Create time-based features"""
    df["year"] = df["date"].dt.year
    df["month"] = df["date"].dt.month
    df["dayofweek"] = df["date"].dt.dayofweek
    df["day"] = df["date"].dt.day
    df["price_lag_1"] = df["avg_price"].shift(1)
    df["price_lag_2"] = df["avg_price"].shift(2)
    df["price_lag_3"] = df["avg_price"].shift(3)
    df["price_rolling_7"] = df["avg_price"].rolling(window=7, min_periods=1).mean()
    df["price_rolling_14"] = df["avg_price"].rolling(window=14, min_periods=1).mean()
    return df.dropna()


def train_model(df: pd.DataFrame):
    """Train XGBoost model"""
    feature_columns = [
        "year", "month", "dayofweek", "day",
        "price_lag_1", "price_lag_2", "price_lag_3",
        "price_rolling_7", "price_rolling_14"
    ]

    X = df[feature_columns]
    y = df["avg_price"]

    model = XGBRegressor(
        n_estimators=100,
        max_depth=5,
        learning_rate=0.1,
        random_state=42
    )

    model.fit(X, y)
    return model, feature_columns


def predict_next_days(model, df: pd.DataFrame, feature_columns: list, days: int = 3):
    """Predict prices for next N days"""
    predictions = []
    last_date = df["date"].max()
    recent_data = df.tail(14).copy()

    for day_offset in range(1, days + 1):
        predict_date = last_date + timedelta(days=day_offset)

        features = {
            "year": predict_date.year,
            "month": predict_date.month,
            "dayofweek": predict_date.dayofweek,
            "day": predict_date.day,
        }

        if day_offset == 1:
            features["price_lag_1"] = recent_data["avg_price"].iloc[-1]
            features["price_lag_2"] = recent_data["avg_price"].iloc[-2]
            features["price_lag_3"] = recent_data["avg_price"].iloc[-3]
        else:
            features["price_lag_1"] = predictions[-1]["predicted_price"] if predictions else recent_data["avg_price"].iloc[-1]
            features["price_lag_2"] = predictions[-2]["predicted_price"] if len(predictions) >= 2 else recent_data["avg_price"].iloc[-2]
            features["price_lag_3"] = predictions[-3]["predicted_price"] if len(predictions) >= 3 else recent_data["avg_price"].iloc[-3]

        features["price_rolling_7"] = recent_data["avg_price"].tail(7).mean()
        features["price_rolling_14"] = recent_data["avg_price"].tail(14).mean()

        X_pred = pd.DataFrame([features])[feature_columns]
        predicted_price = model.predict(X_pred)[0]

        predictions.append({
            "date": predict_date.strftime("%Y-%m-%d"),
            "price": round(float(predicted_price), 2)
        })

        new_row = pd.DataFrame({
            "date": [predict_date],
            "avg_price": [predicted_price]
        })
        recent_data = pd.concat([recent_data, new_row], ignore_index=True)

    return predictions


@app.route("/")
def home():
    """Health check endpoint"""
    return jsonify({
        "status": "ok",
        "message": "Agricultural Price Prediction API",
        "version": "1.0.0"
    })


@app.route("/api/predict", methods=["POST"])
def predict():
    """
    Predict future prices for a product

    Request body:
    {
        "product": "Potatoes",
        "city": "Nanjing",
        "days": 3
    }
    """
    try:
        data = request.get_json()

        product = data.get("product")
        city = data.get("city")
        days = data.get("days", 3)

        if not product or not city:
            return jsonify({
                "error": "Missing required fields: product, city"
            }), 400

        cache_key = f"{product}_{city}"

        if cache_key not in models_cache:
            df, product_id = load_historical_data(product, city)
            df = create_features(df)
            model, feature_columns = train_model(df)
            models_cache[cache_key] = {
                "model": model,
                "feature_columns": feature_columns,
                "df": df,
                "last_updated": datetime.now()
            }

        cached_data = models_cache[cache_key]
        predictions = predict_next_days(
            cached_data["model"],
            cached_data["df"],
            cached_data["feature_columns"],
            days
        )

        return jsonify({
            "success": True,
            "product": product,
            "city": city,
            "predictions": predictions,
            "model_version": "XGBoost-v1.0"
        })

    except ValueError as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 404

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route("/api/products", methods=["GET"])
def get_products():
    """Get list of available products"""
    try:
        supabase = get_supabase_client()
        response = supabase.table("products").select("name, category").execute()

        return jsonify({
            "success": True,
            "products": response.data
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
