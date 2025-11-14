import { config } from './config';

export interface ExtractResponse {
  success: boolean;
  audioUrl?: string;
  videoUrl?: string;
  title?: string;
  thumbnail?: string;
  duration?: number;
  channel?: string;
  error?: string;
}

export class APIService {
  static async extractStream(videoUrl: string): Promise<ExtractResponse> {
    try {
      const response = await fetch(config.endpoints.extract, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: videoUrl }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error extracting stream:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  static async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(config.endpoints.health);
      return response.ok;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }
}
