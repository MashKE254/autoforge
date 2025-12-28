// src/lib/infrastructure/providers/clerk.ts

interface CreateInstanceResult {
  instanceId: string;
  publishableKey: string;
  secretKey: string;
}

export class ClerkProvisioner {
  private baseUrl = 'https://api.clerk.com/v1';
  private secretKey: string | null;
  private simulationMode: boolean;

  constructor() {
    this.simulationMode = process.env.SIMULATE_INFRASTRUCTURE === 'true';

    if (this.simulationMode) {
      console.log('🎭 [CLERK] Running in simulation mode - no real Clerk calls');
      this.secretKey = null;
      return;
    }

    const key = process.env.CLERK_PLATFORM_SECRET_KEY;
    if (!key) {
      console.warn('⚠️ CLERK_PLATFORM_SECRET_KEY not set - enabling simulation mode');
      this.simulationMode = true;
      this.secretKey = null;
      return;
    }

    this.secretKey = key;
  }

  async createInstance(options: {
    name: string;
  }): Promise<CreateInstanceResult> {
    // 🎭 SIMULATION MODE
    if (this.simulationMode || !this.secretKey) {
      console.log(`🎭 [CLERK] Simulating instance creation for: ${options.name}`);
      const timestamp = Date.now();
      return {
        instanceId: `ins_sim_${timestamp}`,
        publishableKey: `pk_test_simulated_${timestamp}`,
        secretKey: `sk_test_simulated_${timestamp}`,
      };
    }

    // Create a new Clerk instance via the Clerk Platform API
    const response = await fetch(`${this.baseUrl}/instances`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: options.name,
        // Configure default settings
        settings: {
          // Enable email/password by default
          authentication_strategies: ['email_code', 'password'],
          // Enable Google OAuth
          social_connections: ['oauth_google', 'oauth_github'],
          // Default session settings
          session_settings: {
            single_session_mode: false,
            maximum_session_age: 604800, // 7 days
          },
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Clerk instance creation failed: ${error.message}`);
    }

    const instance = await response.json();

    // Get API keys for the instance
    const keysResponse = await fetch(`${this.baseUrl}/instances/${instance.id}/api_keys`, {
      headers: {
        'Authorization': `Bearer ${this.secretKey}`,
      },
    });

    const keys = await keysResponse.json();

    return {
      instanceId: instance.id,
      publishableKey: keys.publishable_key,
      secretKey: keys.secret_key,
    };
  }

  async deleteInstance(instanceId: string): Promise<void> {
    await fetch(`${this.baseUrl}/instances/${instanceId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.secretKey}`,
      },
    });
  }
}