"""
XGBoost Price Prediction Script
Predicts agricultural product prices for the next 3 days using historical data
"""

import os
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from supabase import create_client, Client
from xgboost import XGBRegressor

# Configuration
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://qhnztjjepgewzmimlhkn.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFobnp0amplcGdld3ptaW1saGtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4NjI1NTYsImV4cCI6MjA3NjQzODU1Nn0.2AvQyCWZlhRNDnqRcAY-gcO4qfUICYsEf_mLPS5bRO8")

# Product and city to predict
TARGET_PRODUCT = "Potatoes"
TARGET_CITY = "Nanjing"
MODEL_VERSION = "XGBoost-v1.0"


def connect_to_supabase() -> Client:
    """Connect to Supabase database"""
    return create_client(SUPABASE_URL, SUPABASE_KEY)


def load_historical_data(supabase: Client, product_name: str, city: str) -> pd.DataFrame:
    """Load historical price data for a specific product and city"""
    print(f"Loading historical data for {product_name} in {city}...")

    # Query to get product ID
    product_response = supabase.table("products").select("id").eq("name", product_name).execute()

    if not product_response.data:
        raise ValueError(f"Product '{product_name}' not found in database")

    product_id = product_response.data[0]["id"]

    # Query to get historical prices
    prices_response = supabase.table("market_prices")\
        .select("date, price")\
        .eq("product_id", product_id)\
        .eq("city", city)\
        .order("date", desc=False)\
        .execute()

    if not prices_response.data:
        raise ValueError(f"No historical data found for {product_name} in {city}")

    # Convert to DataFrame
    df = pd.DataFrame(prices_response.data)
    df["date"] = pd.to_datetime(df["date"])
    df["price"] = df["price"].astype(float)

    # Group by date and calculate average price per day
    df = df.groupby("date").agg({"price": "mean"}).reset_index()
    df.rename(columns={"price": "avg_price"}, inplace=True)

    print(f"Loaded {len(df)} days of historical data")
    return df, product_id


def create_features(df: pd.DataFrame) -> pd.DataFrame:
    """Create time-based features for model training"""
    print("Creating time-based features...")

    # Extract date features
    df["year"] = df["date"].dt.year
    df["month"] = df["date"].dt.month
    df["dayofweek"] = df["date"].dt.dayofweek  # Monday=0, Sunday=6
    df["day"] = df["date"].dt.day

    # Create lag features (previous days' prices)
    df["price_lag_1"] = df["avg_price"].shift(1)
    df["price_lag_2"] = df["avg_price"].shift(2)
    df["price_lag_3"] = df["avg_price"].shift(3)

    # Create rolling average features
    df["price_rolling_7"] = df["avg_price"].rolling(window=7, min_periods=1).mean()
    df["price_rolling_14"] = df["avg_price"].rolling(window=14, min_periods=1).mean()

    # Drop rows with NaN values from lag features
    df = df.dropna()

    print(f"Created features. Dataset has {len(df)} samples")
    return df


def train_model(df: pd.DataFrame) -> XGBRegressor:
    """Train XGBoost regression model"""
    print("Training XGBoost model...")

    # Define features and target
    feature_columns = [
        "year", "month", "dayofweek", "day",
        "price_lag_1", "price_lag_2", "price_lag_3",
        "price_rolling_7", "price_rolling_14"
    ]

    X = df[feature_columns]
    y = df["avg_price"]

    # Train XGBoost model
    model = XGBRegressor(
        n_estimators=100,
        max_depth=5,
        learning_rate=0.1,
        random_state=42
    )

    model.fit(X, y)

    print("Model training completed")
    return model, feature_columns


def predict_next_days(model: XGBRegressor, df: pd.DataFrame, feature_columns: list, days: int = 3) -> pd.DataFrame:
    """Predict prices for the next N days"""
    print(f"Predicting prices for next {days} days...")

    predictions = []
    last_date = df["date"].max()

    # Use the most recent data for prediction
    recent_data = df.tail(14).copy()  # Use last 14 days for rolling averages

    for day_offset in range(1, days + 1):
        predict_date = last_date + timedelta(days=day_offset)

        # Create features for prediction date
        features = {
            "year": predict_date.year,
            "month": predict_date.month,
            "dayofweek": predict_date.dayofweek,
            "day": predict_date.day,
        }

        # Use recent prices for lag features
        if day_offset == 1:
            features["price_lag_1"] = recent_data["avg_price"].iloc[-1]
            features["price_lag_2"] = recent_data["avg_price"].iloc[-2]
            features["price_lag_3"] = recent_data["avg_price"].iloc[-3]
        else:
            # For days 2 and 3, use predicted prices
            features["price_lag_1"] = predictions[-1]["predicted_price"] if predictions else recent_data["avg_price"].iloc[-1]
            features["price_lag_2"] = predictions[-2]["predicted_price"] if len(predictions) >= 2 else recent_data["avg_price"].iloc[-2]
            features["price_lag_3"] = predictions[-3]["predicted_price"] if len(predictions) >= 3 else recent_data["avg_price"].iloc[-3]

        # Calculate rolling averages
        features["price_rolling_7"] = recent_data["avg_price"].tail(7).mean()
        features["price_rolling_14"] = recent_data["avg_price"].tail(14).mean()

        # Make prediction
        X_pred = pd.DataFrame([features])[feature_columns]
        predicted_price = model.predict(X_pred)[0]

        predictions.append({
            "predict_date": predict_date.date(),
            "predicted_price": round(float(predicted_price), 2)
        })

        # Add prediction to recent_data for next iteration
        new_row = pd.DataFrame({
            "date": [predict_date],
            "avg_price": [predicted_price]
        })
        recent_data = pd.concat([recent_data, new_row], ignore_index=True)

    print(f"Predicted {len(predictions)} days")
    return pd.DataFrame(predictions)


def save_predictions(supabase: Client, predictions_df: pd.DataFrame, product_id: str,
                     product_name: str, city: str, model_version: str):
    """Save predictions to Supabase price_predictions table"""
    print("Saving predictions to database...")

    # Prepare data for insertion
    records = []
    for _, row in predictions_df.iterrows():
        records.append({
            "product_id": product_id,
            "product_name": product_name,
            "city": city,
            "predict_date": str(row["predict_date"]),
            "predicted_price": row["predicted_price"],
            "model_version": model_version,
            "created_at": datetime.now().isoformat()
        })

    # Insert predictions
    response = supabase.table("price_predictions").insert(records).execute()

    print(f"Saved {len(records)} predictions to database")
    return response


def main():
    """Main execution function"""
    print("=" * 60)
    print("Agricultural Price Prediction System")
    print("=" * 60)

    try:
        # Step 1: Connect to Supabase
        supabase = connect_to_supabase()
        print("✓ Connected to Supabase")

        # Step 2: Load historical data
        df, product_id = load_historical_data(supabase, TARGET_PRODUCT, TARGET_CITY)
        print(f"✓ Loaded historical data ({len(df)} records)")

        # Step 3: Create features
        df = create_features(df)
        print(f"✓ Created features ({df.shape[1]} features)")

        # Step 4: Train model
        model, feature_columns = train_model(df)
        print("✓ Trained XGBoost model")

        # Step 5: Predict next 3 days
        predictions_df = predict_next_days(model, df, feature_columns, days=3)
        print("✓ Generated predictions")

        # Step 6: Display predictions
        print("\n" + "=" * 60)
        print("PREDICTIONS")
        print("=" * 60)
        print(f"Product: {TARGET_PRODUCT}")
        print(f"City: {TARGET_CITY}")
        print(f"Model: {MODEL_VERSION}")
        print("-" * 60)
        for _, row in predictions_df.iterrows():
            print(f"{row['predict_date']}: ¥{row['predicted_price']:.2f}/kg")
        print("=" * 60)

        # Step 7: Save predictions to database
        save_predictions(supabase, predictions_df, product_id, TARGET_PRODUCT,
                        TARGET_CITY, MODEL_VERSION)
        print("✓ Saved predictions to database")

        print("\n✓ Process completed successfully!")

    except Exception as e:
        print(f"\n✗ Error: {str(e)}")
        raise


if __name__ == "__main__":
    main()
