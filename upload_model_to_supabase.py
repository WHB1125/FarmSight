"""
Upload ONNX model to Supabase Storage
"""

import os
from supabase import create_client

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://qhnztjjepgewzmimlhkn.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFobnp0amplcGdld3ptaW1saGtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4NjI1NTYsImV4cCI6MjA3NjQzODU1Nn0.2AvQyCWZlhRNDnqRcAY-gcO4qfUICYsEf_mLPS5bRO8")

MODEL_FILE = "price_prediction_model.onnx"
BUCKET_NAME = "models"
STORAGE_PATH = "price_prediction_model.onnx"


def upload_model():
    """Upload ONNX model to Supabase Storage"""
    print("=" * 60)
    print("Upload ONNX Model to Supabase Storage")
    print("=" * 60)

    if not os.path.exists(MODEL_FILE):
        print(f"✗ Error: Model file '{MODEL_FILE}' not found")
        print("Please run 'python convert_to_onnx.py' first")
        return

    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    try:
        # Check if bucket exists
        print(f"Checking bucket '{BUCKET_NAME}'...")
        buckets = supabase.storage.list_buckets()
        bucket_exists = any(b.name == BUCKET_NAME for b in buckets)

        if not bucket_exists:
            print(f"Creating bucket '{BUCKET_NAME}'...")
            supabase.storage.create_bucket(BUCKET_NAME, options={"public": False})
            print("✓ Bucket created")
        else:
            print("✓ Bucket exists")

        # Upload model
        print(f"Uploading model to '{STORAGE_PATH}'...")
        with open(MODEL_FILE, "rb") as f:
            supabase.storage.from_(BUCKET_NAME).upload(
                STORAGE_PATH,
                f,
                file_options={"content-type": "application/octet-stream", "upsert": "true"}
            )

        print("✓ Model uploaded successfully")

        # Get file size
        file_size = os.path.getsize(MODEL_FILE) / 1024
        print(f"✓ Model size: {file_size:.2f} KB")

        # Get public URL (for reference)
        url = supabase.storage.from_(BUCKET_NAME).get_public_url(STORAGE_PATH)
        print(f"✓ Storage path: {BUCKET_NAME}/{STORAGE_PATH}")

        print("\n" + "=" * 60)
        print("Upload completed successfully!")
        print("=" * 60)

    except Exception as e:
        print(f"✗ Error: {str(e)}")
        raise


if __name__ == "__main__":
    upload_model()
