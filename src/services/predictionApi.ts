export interface PredictionRequest {
  product: string;
  city: string;
  days?: number;
}

export interface PredictionResponse {
  success: boolean;
  product: string;
  city: string;
  predictions: Array<{
    date: string;
    price: number;
  }>;
  model_version: string;
  error?: string;
}

const API_BASE_URL = import.meta.env.VITE_PREDICTION_API_URL || 'http://localhost:5000';

export const predictionApi = {
  async predictPrices(request: PredictionRequest): Promise<PredictionResponse> {
    const response = await fetch(`${API_BASE_URL}/api/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch predictions');
    }

    return response.json();
  },

  async getProducts(): Promise<{ success: boolean; products: Array<{ name: string; category: string }> }> {
    const response = await fetch(`${API_BASE_URL}/api/products`);

    if (!response.ok) {
      throw new Error('Failed to fetch products');
    }

    return response.json();
  },

  async healthCheck(): Promise<{ status: string; message: string }> {
    const response = await fetch(`${API_BASE_URL}/`);
    return response.json();
  },
};
