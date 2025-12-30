/**
 * Base Generation API Route - UPGRADED TO USE ENHANCED UNIFIED GENERATOR
 *
 * File: src/app/api/generate/route.ts
 *
 * Now uses:
 * - EnhancedUnifiedGenerator (supports all 6 generator types)
 * - UnifiedGenerator (fallback for PERSONAL/SAAS mode)
 * - DynamicModuleGenerator (AI-powered integration generation)
 * - Production-grade prompts (30-50+ files)
 *
 * IMPORTANT: Now respects recommender's generator type!
 * - UI Apps → BoltGenerator
 * - SaaS Products → SaaSGenerator
 * - Workflow Automation → WorkflowGenerator
 * - AI Assistants → AgentGenerator
 * - API Backends → APIGenerator
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { unifiedGenerator } from '@/lib/generation/unified-generator';
import { EnhancedUnifiedGenerator } from '@/lib/generation/enhanced-unified-generator';
import type { EnhancedGenerationType } from '@/lib/generation/enhanced-prompt-classifier';
import { getCachedGeneration, cacheGeneration } from '@/lib/generation-cache';

// Create enhanced generator instance
const enhancedGenerator = new EnhancedUnifiedGenerator();

// ============================================================================
// GET: Info about generation endpoints
// ============================================================================

export async function GET() {
  return NextResponse.json({
    endpoints: {
      '/api/generate': 'POST - Production-grade generation with EnhancedUnifiedGenerator',
      '/api/generate/stream': 'POST - Streaming generation with SSE',
    },
    usage: {
      method: 'POST',
      body: {
        prompt: 'string (required) - Description of what to build',
        mode: 'string (optional) - PREVIEW | PERSONAL | SINGLE_USER | SAAS | AUTO (default: AUTO → PREVIEW)',
        generatorType: 'string (optional) - bolt | saas | workflow | agent | api | orchestrated',
      },
    },
    features: [
      'Supports all 6 generator types (UI, SaaS, Workflow, AI Agent, API, Orchestrated)',
      'Automatic complexity analysis',
      'Dynamic module generation (any API/integration)',
      'Smart routing based on generator type',
      '30-50+ files for complex apps',
      'Production-grade code quality',
      'Respects recommender generator type',
    ],
    generatorTypes: {
      'bolt': 'UI Applications (dashboards, CRMs, tools)',
      'saas': 'SaaS Products (Stripe billing, multi-tenant)',
      'workflow': 'Workflow Automation (Inngest, triggers, actions)',
      'agent': 'AI Assistants (LangGraph agents, tool calling)',
      'api': 'API Backends (REST, webhooks, API-only)',
      'orchestrated': 'Complex Apps (multi-pass orchestration)',
    },
  });
}

// ============================================================================
// POST: Main generation endpoint with UnifiedGenerator
// ============================================================================

export async function POST(request: NextRequest) {
  let jobId: string | null = null;

  try {
    // 1. Authenticate
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in.' },
        { status: 401 }
      );
    }

    // 2. Get user from database by email
    let user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      console.log(`Creating user for email: ${session.user.email}`);
      user = await prisma.user.create({
        data: {
          email: session.user.email,
          name: session.user.name || null,
          image: session.user.image || null,
        },
      });
    }

    // 3. Parse request
    const body = await request.json();
    const { prompt, mode = 'AUTO', generatorType } = body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 3) {
      return NextResponse.json(
        { error: 'Valid prompt is required (minimum 3 characters)' },
        { status: 400 }
      );
    }

    // Validate mode
    if (!['PREVIEW', 'PERSONAL', 'SINGLE_USER', 'SAAS', 'AUTO'].includes(mode)) {
      return NextResponse.json(
        { error: 'Invalid mode. Must be PREVIEW, PERSONAL, SINGLE_USER, SAAS, or AUTO' },
        { status: 400 }
      );
    }

    // Validate generator type if provided
    const validGeneratorTypes = ['bolt', 'saas', 'workflow', 'agent', 'api', 'orchestrated'];
    if (generatorType && !validGeneratorTypes.includes(generatorType)) {
      return NextResponse.json(
        { error: `Invalid generator type. Must be one of: ${validGeneratorTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Map recommender generator type to EnhancedGenerationType
    const generatorTypeMap: Record<string, EnhancedGenerationType> = {
      'bolt': 'ui-application',
      'saas': 'full-saas',
      'workflow': 'workflow-automation',
      'agent': 'ai-agent-network',
      'api': 'api-backend',
      'orchestrated': 'ui-application', // Use Bolt's ui-application for now
    };

    const forceType = generatorType ? generatorTypeMap[generatorType] : undefined;

    const trimmedPrompt = prompt.trim();
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🚀 AUTOFORGE GENERATION`);
    console.log(`${'='.repeat(80)}`);
    console.log(`   User: ${user.email} (${user.id})`);
    console.log(`   Mode: ${mode}`);
    console.log(`   Generator Type: ${generatorType || 'AUTO'}`);
    if (forceType) {
      console.log(`   → Forcing: ${forceType}`);
    }
    console.log(`   Prompt: "${trimmedPrompt.slice(0, 100)}..."`);

    // 4. Create job record with generation mode
    const job = await prisma.generationJob.create({
      data: {
        userId: user.id,
        prompt: trimmedPrompt,
        status: 'RUNNING',
        generationMode: mode === 'AUTO' ? 'PREVIEW' : mode, // Default to PREVIEW for AUTO (free try-before-buy)
        generationStartedAt: new Date(),
      },
    });
    jobId = job.id;

    console.log(`   Job ID: ${job.id}`);
    console.log(`${'='.repeat(80)}\n`);

    // 5. Check cache before generating
    const cachedResult = await getCachedGeneration(trimmedPrompt, mode, forceType);
    let result: any;

    if (cachedResult) {
      // Use cached result - instant response!
      console.log(`♻️ Using cached generation result`);
      result = {
        success: true,
        files: cachedResult.files,
        tokensUsed: cachedResult.tokensUsed,
        classificationType: cachedResult.classificationType,
        generatorsUsed: cachedResult.generatorsUsed,
      };
    } else {
      // Generate fresh (cache miss or expired)
      console.log(`🎨 Cache miss - generating fresh...`);

    if (forceType) {
      // Use EnhancedUnifiedGenerator when generator type is specified (from recommender)
      console.log(`\n🎯 Using ENHANCED UNIFIED GENERATOR with forced type: ${forceType}`);

      result = await enhancedGenerator.generate(trimmedPrompt, {
        jobId: job.id,
        forceType,
        callbacks: {
          onProgress: (message) => {
            console.log(`   📝 ${message}`);
          },
        },
      });
    } else {
      // Use UnifiedGenerator for legacy PERSONAL/SAAS mode flow
      console.log(`\n🎯 Using UNIFIED GENERATOR with mode: ${mode}`);

      result = await unifiedGenerator.generate(
        trimmedPrompt,
        mode as 'PREVIEW' | 'PERSONAL' | 'SINGLE_USER' | 'SAAS' | 'AUTO',
        job.id,
        {
          onProgress: (message) => {
            console.log(`   📝 ${message}`);
          },
          onModeSelected: (selectedMode) => {
            console.log(`\n🎯 Final Mode: ${selectedMode}`);

            // Update job with actual mode if AUTO was used
            if (mode === 'AUTO') {
              prisma.generationJob.update({
                where: { id: job.id },
                data: { generationMode: selectedMode },
              }).catch(err => console.error('Failed to update job mode:', err));
            }
          },
          onComplexityAnalysis: (analysis) => {
            console.log(`\n📊 Complexity Analysis:`);
            console.log(`   Score: ${analysis.score}/100`);
            console.log(`   Is Complex: ${analysis.isComplex}`);
            console.log(`   Reasons: ${analysis.reasons.join(', ')}`);
          },
          onStrategySelected: (strategy) => {
            const strategyName = strategy === 'personal'
              ? 'PERSONAL TOOL'
              : strategy === 'simple'
              ? 'SINGLE-PASS SAAS'
              : 'MULTI-PASS ORCHESTRATED SAAS';
            console.log(`\n🎯 Strategy: ${strategyName}`);
          },
          onModulesDetected: (modules) => {
            if (modules.length > 0) {
              console.log(`\n🔌 Dynamic Modules Generated:`);
              modules.forEach(m => {
                console.log(`   - ${m.name}: ${m.description}`);
                console.log(`     Files: ${m.files.length}, Deps: ${m.dependencies.length}`);
              });
            }
          },
        }
      );

      // Cache the result for future requests
      if (result.success && result.files && result.files.length > 0) {
        await cacheGeneration(
          trimmedPrompt,
          mode,
          result.files,
          forceType,
          result.tokensUsed,
          result.classificationType,
          result.generatorsUsed
        );
      }
    }

    if (!result.success || !result.files || result.files.length === 0) {
      throw new Error(result.error || 'No files were generated');
    }

    console.log(`\n${'='.repeat(80)}`);
    console.log(`✅ GENERATION COMPLETE`);
    console.log(`${'='.repeat(80)}`);
    console.log(`   Total Files: ${result.files.length}`);

    // Log quality metrics if available (from Multi-Agent Orchestrator)
    if ('qualityMetrics' in result) {
      console.log(`\n   🎯 QUALITY METRICS:`);
      console.log(`      Overall: ${result.qualityMetrics.overallScore}/100 (${result.qualityMetrics.grade})`);
      console.log(`      Tests: ${result.qualityMetrics.testCoverage}%`);
      console.log(`      Accessibility: ${result.qualityMetrics.accessibilityScore}/100`);
      console.log(`      Type Safety: ${result.qualityMetrics.typeSafetyScore}/100`);
      console.log(`      Security: ${result.qualityMetrics.securityScore}/100`);
      console.log(`      Performance: ${result.qualityMetrics.performanceScore}/100`);
    }

    console.log(`\n   File List:`);
    result.files.forEach(f => console.log(`     - ${f.path}`));
    console.log(`${'='.repeat(80)}\n`);

    // 6. Save files to database (batch insert - 10x faster)
    await prisma.generatedFile.deleteMany({
      where: { generationJobId: job.id },
    });

    // Batch insert all files at once instead of one-by-one
    await prisma.generatedFile.createMany({
      data: result.files.map(file => ({
        generationJobId: job.id,
        path: file.path,
        content: file.content,
        language: file.language || 'typescript',
        size: file.content.length,
      })),
      skipDuplicates: true,
    });

    // 7. Update job status
    await prisma.generationJob.update({
      where: { id: job.id },
      data: {
        status: 'COMPLETED',
        generationCompletedAt: new Date(),
        filesJson: JSON.stringify(result.files),
        completedModules: result.files.length,
        totalModules: result.files.length,
      },
    });

    // 8. Return success response
    const response: any = {
      success: true,
      jobId: job.id,
      files: result.files,
      fileCount: result.files.length,
      message: `Generated ${result.files.length} production-grade files`,
      tokensUsed: result.tokensUsed,
      generatorUsed: forceType || (result.classificationType || 'auto'),
      generatorsUsed: result.generatorsUsed || [],
    };

    // Include quality metrics if available (from Multi-Agent Orchestrator)
    if ('qualityMetrics' in result) {
      response.qualityMetrics = result.qualityMetrics;
      response.message = `Generated ${result.files.length} production-grade files with ${result.qualityMetrics.grade} quality (${result.qualityMetrics.overallScore}/100)`;
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('\n❌ GENERATION ERROR:', error);

    if (jobId) {
      try {
        await prisma.generationJob.update({
          where: { id: jobId },
          data: {
            status: 'FAILED',
            errorLog: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      } catch (dbError) {
        console.error('Failed to update job status:', dbError);
      }
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Generation failed',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
