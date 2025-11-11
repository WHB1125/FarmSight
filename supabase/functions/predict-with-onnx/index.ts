import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PredictionRequest {
  features: number[][];
  productName: string;
  city: string;
}

interface FeatureInput {
  year: number;
  month: number;
  dayofweek: number;
  day: number;
  price_lag_1: number;
  price_lag_2: number;
  price_lag_3: number;
  price_rolling_7: number;
  price_rolling_14: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { features, productName, city }: PredictionRequest = await req.json();

    if (!features || !Array.isArray(features)) {
      return new Response(
        JSON.stringify({ error: "Invalid features array" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // TODO: Load and run ONNX model
    // For now, returning a placeholder
    // You need to:
    // 1. Upload your .onnx file to the function directory
    // 2. Use onnxruntime-web or onnxruntime-node to load the model
    // 3. Run inference with the features

    // Placeholder: Generate mock predictions
    const predictions = features.map((feature) => {
      // Simple weighted average simulation
      const basePrice = feature.reduce((sum, val, idx) => {
        const weight = idx < 4 ? 0.1 : 0.15; // Different weights for different features
        return sum + (val * weight);
      }, 0);
      return Number((basePrice * 1.05).toFixed(2));
    });

    const response = {
      success: true,
      predictions,
      productName,
      city,
      modelVersion: "ONNX-XGBoost-v1.0",
      timestamp: new Date().toISOString(),
      note: "ONNX model integration pending - using placeholder predictions"
    };

    return new Response(JSON.stringify(response), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Prediction error:", error);
    return new Response(
      JSON.stringify({ 
        error: "Failed to generate predictions",
        details: error instanceof Error ? error.message : "Unknown error"
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});