/**
 * Anthropic Integration Client
 *
 * API key-based integration for Anthropic Claude API
 */

import { APIKeyClient } from '../base-client';
import { IntegrationsDemoMode } from '@/lib/demo-mode/integrations-demo';
import Anthropic from '@anthropic-ai/sdk';

export class AnthropicClient extends APIKeyClient {
  private client?: Anthropic;

  constructor(options: { userId?: string }) {
    super('anthropic', options);
  }

  async initialize(): Promise<void> {
    await this.loadCredentials();
    if (this.apiKey && !this.isDemoMode) {
      this.client = new Anthropic({ apiKey: this.apiKey });
    }
  }

  /**
   * Create a message completion
   */
  async createMessage(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    options?: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
      system?: string;
    }
  ): Promise<any> {
    return this.executeWithFallback(
      async () => {
        const response = await this.client!.messages.create({
          model: options?.model || 'claude-3-5-sonnet-20241022',
          max_tokens: options?.maxTokens || 4096,
          temperature: options?.temperature,
          system: options?.system,
          messages,
        });

        return {
          text: response.content[0].type === 'text' ? response.content[0].text : '',
          model: response.model,
          stopReason: response.stop_reason,
          usage: {
            inputTokens: response.usage.input_tokens,
            outputTokens: response.usage.output_tokens,
          },
        };
      },
      async () => IntegrationsDemoMode.anthropic_createMessage(messages),
      'create_message'
    );
  }

  /**
   * Stream a message completion
   */
  async streamMessage(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    options?: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
      system?: string;
    }
  ): Promise<AsyncIterable<any>> {
    return this.executeWithFallback(
      async () => {
        const stream = await this.client!.messages.stream({
          model: options?.model || 'claude-3-5-sonnet-20241022',
          max_tokens: options?.maxTokens || 4096,
          temperature: options?.temperature,
          system: options?.system,
          messages,
        });

        return stream;
      },
      async () => IntegrationsDemoMode.anthropic_streamMessage(messages),
      'stream_message'
    );
  }

  /**
   * Count tokens in text
   */
  async countTokens(text: string): Promise<any> {
    return this.executeWithFallback(
      async () => {
        // Anthropic doesn't have a direct token counting API
        // Use approximation: ~4 characters per token
        const estimatedTokens = Math.ceil(text.length / 4);
        return { tokens: estimatedTokens, method: 'estimated' };
      },
      async () => IntegrationsDemoMode.anthropic_countTokens(text),
      'count_tokens'
    );
  }
}
