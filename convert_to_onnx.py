"""
Convert trained XGBoost model to ONNX format for deployment
"""

import os
import pandas as pd
import numpy as np
from datetime import datetime
from supabase import create_client
from xgboost import XGBRegressor
import onnxmltools
from onnxmltools.convert.common.data_types import FloatTensorType

# Configuration
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://qhnztjjepgewzmimlhkn.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFobnp0amplcGdld3ptaW1saGtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4NjI1NTYsImV4cCI6MjA3NjQzODU1Nn0.2AvQyCWZlhRNDnqRcAY-gcO4qfUICYsEf_mLPS5bRO8")

TARGET_PRODUCT = "Potatoes"
TARGET_CITY = "Nanjing"


def load_and_train_model():
    """Load data and train model (same as predict_prices.py)"""
    print("Training model...")

    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    # Get product ID
    product_response = supabase.table("products").select("id").eq("name", TARGET_PRODUCT).execute()
    product_id = product_response.data[0]["id"]

    # Get historical prices
    prices_response = supabase.table("market_prices")\
        .select("date, price")\
        .eq("product_id", product_id)\
        .eq("city", TARGET_CITY)\
        .order("date", desc=False)\
        .execute()

    df = pd.DataFrame(prices_response.data)
    df["date"] = pd.to_datetime(df["date"])
    df["price"] = df["price"].astype(float)
    df = df.groupby("date").agg({"price": "mean"}).reset_index()
    df.rename(columns={"price": "avg_price"}, inplace=True)

    # Create features
    df["year"] = df["date"].dt.year
    df["month"] = df["date"].dt.month
    df["dayofweek"] = df["date"].dt.dayofweek
    df["day"] = df["date"].dt.day
    df["price_lag_1"] = df["avg_price"].shift(1)
    df["price_lag_2"] = df["avg_price"].shift(2)
    df["price_lag_3"] = df["avg_price"].shift(3)
    df["price_rolling_7"] = df["avg_price"].rolling(window=7, min_periods=1).mean()
    df["price_rolling_14"] = df["avg_price"].rolling(window=14, min_periods=1).mean()
    df = df.dropna()

    # Train model
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
    print(f"✓ Model trained with {len(X)} samples")

    return model, feature_columns


def convert_to_onnx(model, feature_columns):
    """Convert XGBoost model to ONNX format"""
    print("Converting to ONNX...")

    # Define input type (9 features, all float)
    initial_type = [('float_input', FloatTensorType([None, len(feature_columns)]))]

    # Convert to ONNX
    onnx_model = onnxmltools.convert_xgboost(model, initial_types=initial_type)

    # Save ONNX model
    output_path = "price_prediction_model.onnx"
    onnxmltools.utils.save_model(onnx_model, output_path)

    print(f"✓ Model saved to {output_path}")

    # Get file size
    file_size = os.path.getsize(output_path) / 1024  # KB
    print(f"✓ Model size: {file_size:.2f} KB")

    return output_path


def main():
    """Main conversion function"""
    print("=" * 60)
    print("XGBoost to ONNX Conversion")
    print("=" * 60)

    try:
        # Train model
        model, feature_columns = load_and_train_model()

        # Convert to ONNX
        onnx_path = convert_to_onnx(model, feature_columns)

        print("\n" + "=" * 60)
        print("Conversion completed successfully!")
        print(f"ONNX model saved to: {onnx_path}")
        print("=" * 60)

        print("\nNext steps:")
        print("1. Upload model to Supabase Storage")
        print("2. Create Edge Function to load and use the model")
        print("3. Call Edge Function from frontend")

    except Exception as e:
        print(f"\n✗ Error: {str(e)}")
        raise


if __name__ == "__main__":
    main()
