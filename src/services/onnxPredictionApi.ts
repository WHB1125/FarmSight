import { supabase } from '../lib/supabase';

export interface OnnxPredictionRequest {
  product: string;
  city: string;
  days?: number;
}

export interface OnnxPredictionResponse {
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

export const onnxPredictionApi = {
  async predictPrices(request: OnnxPredictionRequest): Promise<OnnxPredictionResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('simple-predict', {
        body: request,
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.success) {
        throw new Error(data.error || 'Prediction failed');
      }

      return data;
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : 'Failed to get predictions'
      );
    }
  },

  async healthCheck(): Promise<boolean> {
    try {
      const { data, error } = await supabase.functions.invoke('simple-predict', {
        body: { product: 'Potatoes', city: 'Nanjing', days: 1 },
      });

      return !error && data?.success;
    } catch {
      return false;
    }
  },
};
