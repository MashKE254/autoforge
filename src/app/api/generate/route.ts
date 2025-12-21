/**
 * Base Generation API Route - UPGRADED TO USE UNIFIED GENERATOR
 *
 * File: src/app/api/generate/route.ts
 *
 * Now uses:
 * - UnifiedGenerator (complexity analysis + smart routing)
 * - DynamicModuleGenerator (AI-powered integration generation)
 * - Production-grade prompts (30-50+ files)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { unifiedGenerator } from '@/lib/generation/unified-generator';

// ============================================================================
// GET: Info about generation endpoints
// ============================================================================

export async function GET() {
  return NextResponse.json({
    endpoints: {
      '/api/generate': 'POST - Production-grade generation with UnifiedGenerator',
      '/api/generate/stream': 'POST - Streaming generation with SSE',
    },
    usage: {
      method: 'POST',
      body: {
        prompt: 'string (required) - Description of what to build',
      },
    },
    features: [
      'Automatic complexity analysis',
      'Dynamic module generation (any API/integration)',
      'Smart routing (simple vs orchestrated)',
      '30-50+ files for complex apps',
      'Production-grade code quality',
    ],
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
    const { prompt, mode = 'AUTO' } = body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 3) {
      return NextResponse.json(
        { error: 'Valid prompt is required (minimum 3 characters)' },
        { status: 400 }
      );
    }

    // Validate mode
    if (!['PERSONAL', 'SAAS', 'AUTO'].includes(mode)) {
      return NextResponse.json(
        { error: 'Invalid mode. Must be PERSONAL, SAAS, or AUTO' },
        { status: 400 }
      );
    }

    const trimmedPrompt = prompt.trim();
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🚀 AUTOFORGE GENERATION`);
    console.log(`${'='.repeat(80)}`);
    console.log(`   User: ${user.email} (${user.id})`);
    console.log(`   Mode: ${mode}`);
    console.log(`   Prompt: "${trimmedPrompt.slice(0, 100)}..."`);

    // 4. Create job record with generation mode
    const job = await prisma.generationJob.create({
      data: {
        userId: user.id,
        prompt: trimmedPrompt,
        status: 'RUNNING',
        generationMode: mode === 'AUTO' ? 'PERSONAL' : mode, // Default to PERSONAL for AUTO
        generationStartedAt: new Date(),
      },
    });
    jobId = job.id;

    console.log(`   Job ID: ${job.id}`);
    console.log(`${'='.repeat(80)}\n`);

    // 5. Generate using UnifiedGenerator (with mode, complexity analysis + dynamic modules)
    const result = await unifiedGenerator.generate(
      trimmedPrompt,
      mode as 'PERSONAL' | 'SAAS' | 'AUTO',
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

    // 6. Save files to database
    await prisma.generatedFile.deleteMany({
      where: { generationJobId: job.id },
    });

    for (const file of result.files) {
      await prisma.generatedFile.create({
        data: {
          generationJobId: job.id,
          path: file.path,
          content: file.content,
          language: file.language || 'typescript',
          size: file.content.length,
        },
      });
    }

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
