/**
 * ARCHITECT AGENT
 *
 * Designs the high-level application architecture before any code is generated.
 * Makes critical architectural decisions about:
 * - Project structure and file organization
 * - Technology stack selections
 * - Database schema design
 * - API architecture (REST vs GraphQL vs tRPC)
 * - State management approach
 * - Authentication strategy
 * - Deployment architecture
 */

import Anthropic from '@anthropic-ai/sdk';

export interface ArchitectureDesign {
  projectStructure: {
    directories: string[];
    description: string;
  };
  techStack: {
    framework: string;
    database: string;
    auth: string;
    styling: string;
    stateManagement: string;
    apiLayer: string;
    testing: string;
  };
  databaseSchema: {
    models: Array<{
      name: string;
      fields: Array<{
        name: string;
        type: string;
        required: boolean;
      }>;
      relations: string[];
    }>;
  };
  apiArchitecture: {
    type: 'REST' | 'GraphQL' | 'tRPC';
    endpoints: Array<{
      name: string;
      method: string;
      path: string;
      description: string;
    }>;
  };
  components: Array<{
    name: string;
    type: 'page' | 'layout' | 'component' | 'utility';
    path: string;
    dependencies: string[];
  }>;
  deploymentPlan: {
    platform: string;
    environment: string[];
    cicd: boolean;
  };
}

export class ArchitectAgent {
  private anthropic: Anthropic;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY required');
    this.anthropic = new Anthropic({ apiKey });
  }

  async design(prompt: string): Promise<ArchitectureDesign> {
    const message = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      messages: [
        {
          role: 'user',
          content: `You are a senior software architect. Design a comprehensive application architecture for:

"${prompt}"

Provide a complete architectural blueprint including:
1. Project structure and organization
2. Technology stack recommendations
3. Database schema design
4. API architecture
5. Component hierarchy
6. Deployment strategy

Output as JSON matching this structure:
{
  "projectStructure": { "directories": [...], "description": "..." },
  "techStack": { "framework": "...", "database": "...", ... },
  "databaseSchema": { "models": [...] },
  "apiArchitecture": { "type": "...", "endpoints": [...] },
  "components": [...],
  "deploymentPlan": { ... }
}`,
        },
      ],
    });

    const response = message.content[0];
    if (response.type !== 'text') throw new Error('Invalid response');

    const jsonMatch = response.text.match(/```json\n([\s\S]+?)\n```/) || response.text.match(/\{[\s\S]+\}/);
    if (!jsonMatch) throw new Error('No JSON found in response');

    return JSON.parse(jsonMatch[1] || jsonMatch[0]);
  }
}

export const architectAgent = new ArchitectAgent();
