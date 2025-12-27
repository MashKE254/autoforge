/**
 * Replicate Integration Client
 *
 * API key-based integration for Replicate AI models
 */

import { APIKeyClient } from '../base-client';
import { IntegrationsDemoMode } from '@/lib/demo-mode/integrations-demo';
import Replicate from 'replicate';

export class ReplicateClient extends APIKeyClient {
  private client?: Replicate;

  constructor(options: { userId?: string }) {
    super('replicate', options);
  }

  async initialize(): Promise<void> {
    await this.loadCredentials();
    if (this.apiKey && !this.isDemoMode) {
      this.client = new Replicate({ auth: this.apiKey });
    }
  }

  /**
   * Run a model prediction
   */
  async runPrediction(model: string, input: any): Promise<any> {
    return this.executeWithFallback(
      async () => {
        const output = await this.client!.run(model as any, { input });

        return {
          success: true,
          output,
          model,
        };
      },
      async () => IntegrationsDemoMode.replicate_runPrediction(model, input),
      'run_prediction'
    );
  }

  /**
   * Generate an image with Stable Diffusion
   */
  async generateImage(prompt: string, negativePrompt?: string, width: number = 1024, height: number = 1024): Promise<any> {
    return this.executeWithFallback(
      async () => {
        const output = await this.client!.run(
          'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b',
          {
            input: {
              prompt,
              negative_prompt: negativePrompt,
              width,
              height,
            },
          }
        );

        return {
          success: true,
          images: Array.isArray(output) ? output : [output],
          prompt,
        };
      },
      async () => IntegrationsDemoMode.replicate_generateImage(prompt),
      'generate_image'
    );
  }

  /**
   * Remove background from image
   */
  async removeBackground(imageUrl: string): Promise<any> {
    return this.executeWithFallback(
      async () => {
        const output = await this.client!.run(
          'cjwbw/rembg:fb8af171cfa1616ddcf1242c093f9c46bcada5ad4cf6f2fbe8b81b330ec5c003',
          {
            input: {
              image: imageUrl,
            },
          }
        );

        return {
          success: true,
          output,
        };
      },
      async () => IntegrationsDemoMode.replicate_removeBackground(imageUrl),
      'remove_background'
    );
  }

  /**
   * Upscale an image
   */
  async upscaleImage(imageUrl: string, scale: number = 4): Promise<any> {
    return this.executeWithFallback(
      async () => {
        const output = await this.client!.run(
          'nightmareai/real-esrgan:42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b',
          {
            input: {
              image: imageUrl,
              scale,
            },
          }
        );

        return {
          success: true,
          output,
          scale,
        };
      },
      async () => IntegrationsDemoMode.replicate_upscaleImage(imageUrl, scale),
      'upscale_image'
    );
  }

  /**
   * Generate music
   */
  async generateMusic(prompt: string, duration: number = 8): Promise<any> {
    return this.executeWithFallback(
      async () => {
        const output = await this.client!.run(
          'meta/musicgen:671ac645ce5e552cc63a54a2bbff63fcf798043055d2dac5fc9e36a837eedcfb',
          {
            input: {
              prompt,
              duration,
            },
          }
        );

        return {
          success: true,
          output,
          prompt,
          duration,
        };
      },
      async () => IntegrationsDemoMode.replicate_generateMusic(prompt, duration),
      'generate_music'
    );
  }

  /**
   * Transcribe audio
   */
  async transcribeAudio(audioUrl: string): Promise<any> {
    return this.executeWithFallback(
      async () => {
        const output = await this.client!.run(
          'openai/whisper:4d50797290df275329f202e48c76360b3f22b08d28c196cbc54600319435f8d2',
          {
            input: {
              audio: audioUrl,
            },
          }
        );

        return {
          success: true,
          transcription: output,
        };
      },
      async () => IntegrationsDemoMode.replicate_transcribeAudio(audioUrl),
      'transcribe_audio'
    );
  }

  /**
   * Get prediction status
   */
  async getPrediction(predictionId: string): Promise<any> {
    return this.executeWithFallback(
      async () => {
        const prediction = await this.client!.predictions.get(predictionId);

        return {
          id: prediction.id,
          status: prediction.status,
          output: prediction.output,
          error: prediction.error,
          logs: prediction.logs,
        };
      },
      async () => IntegrationsDemoMode.replicate_getPrediction(predictionId),
      'get_prediction'
    );
  }

  /**
   * Cancel a prediction
   */
  async cancelPrediction(predictionId: string): Promise<any> {
    return this.executeWithFallback(
      async () => {
        const prediction = await this.client!.predictions.cancel(predictionId);

        return {
          id: prediction.id,
          status: prediction.status,
          canceled: true,
        };
      },
      async () => IntegrationsDemoMode.replicate_cancelPrediction(predictionId),
      'cancel_prediction'
    );
  }
}
