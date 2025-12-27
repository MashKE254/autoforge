/**
 * OpenAI Integration Client
 *
 * Official OpenAI API client with demo mode support
 */

import { APIKeyClient, ClientOptions } from '../base-client';
import { IntegrationsDemoMode } from '@/lib/demo-mode/integrations-demo';
import OpenAI from 'openai';

export class OpenAIClient extends APIKeyClient {
  private client?: OpenAI;

  constructor(options: ClientOptions & { apiKey?: string }) {
    super({ ...options, integrationId: 'openai' });
  }

  /**
   * Initialize client (loads credentials or uses provided API key)
   */
  async initialize(): Promise<void> {
    await this.loadCredentials();

    if (this.apiKey && !this.isDemoMode) {
      this.client = new OpenAI({
        apiKey: this.apiKey,
      });
    }
  }

  /**
   * Chat completion (GPT-4, GPT-3.5)
   */
  async chatCompletion(messages: any[], model: string = 'gpt-4-turbo-preview'): Promise<any> {
    return this.executeWithFallback(
      async () => {
        if (!this.client) {
          throw new Error('OpenAI client not initialized');
        }

        const completion = await this.client.chat.completions.create({
          model,
          messages,
        });

        return {
          text: completion.choices[0].message.content,
          model: completion.model,
          tokensUsed: completion.usage?.total_tokens || 0,
        };
      },
      async () => IntegrationsDemoMode.openai_chatCompletion(messages),
      'chat_completion'
    );
  }

  /**
   * Generate image with DALL-E
   */
  async generateImage(prompt: string, size: '1024x1024' | '512x512' | '256x256' = '1024x1024'): Promise<any> {
    return this.executeWithFallback(
      async () => {
        if (!this.client) {
          throw new Error('OpenAI client not initialized');
        }

        const response = await this.client.images.generate({
          model: 'dall-e-3',
          prompt,
          n: 1,
          size,
        });

        return {
          success: true,
          images: response.data.map((img) => ({
            url: img.url,
            prompt,
          })),
        };
      },
      async () => IntegrationsDemoMode.openai_generateImage(prompt),
      'generate_image'
    );
  }

  /**
   * Create embeddings
   */
  async createEmbeddings(input: string | string[], model: string = 'text-embedding-3-small'): Promise<any> {
    return this.executeWithFallback(
      async () => {
        if (!this.client) {
          throw new Error('OpenAI client not initialized');
        }

        const response = await this.client.embeddings.create({
          model,
          input,
        });

        return {
          embeddings: response.data.map((item) => item.embedding),
          model: response.model,
          tokensUsed: response.usage.total_tokens,
        };
      },
      async () => ({
        embeddings: Array.isArray(input) ? input.map(() => Array(1536).fill(0)) : [Array(1536).fill(0)],
        model,
        tokensUsed: 100,
      }),
      'create_embeddings'
    );
  }
}
