/**
 * Test the Revolutionary Multi-Agent Orchestrator
 *
 * Run this with: tsx test-multi-agent.ts
 */

import { multiAgentOrchestrator } from './src/lib/generation';

async function testMultiAgent() {
  console.log('🚀 Testing Multi-Agent Orchestrator\n');
  console.log('='.repeat(60));

  try {
    // Test with a simple prompt
    const result = await multiAgentOrchestrator.generate(
      'Build a simple todo list app with authentication',
      'test-job-123',
      {
        onProgress: (message) => {
          console.log('📝', message);
        },
        onPhaseStart: (phase, agent) => {
          console.log(`\n🎯 ${agent} starting: ${phase}`);
        },
        onPhaseComplete: (phase, duration) => {
          console.log(`✅ ${phase} completed in ${(duration / 1000).toFixed(2)}s`);
        },
        onQualityMetrics: (metrics) => {
          console.log('\n📊 Quality Metrics:');
          console.log('  Overall Score:', metrics.overallScore, '/100');
          console.log('  Grade:', metrics.grade);
          console.log('  Test Coverage:', metrics.testCoverage, '%');
          console.log('  Accessibility:', metrics.accessibilityScore, '/100');
          console.log('  Type Safety:', metrics.typeSafetyScore, '/100');
          console.log('  Security:', metrics.securityScore, '/100');
          console.log('  Performance:', metrics.performanceScore, '/100');
          console.log('  Code Quality:', metrics.codeQualityScore, '/100');
        },
      }
    );

    console.log('\n' + '='.repeat(60));
    console.log('🎉 GENERATION COMPLETE!\n');
    console.log('Success:', result.success);
    console.log('Total Files:', result.files.length);
    console.log('Overall Grade:', result.qualityMetrics.grade);

    // Show first 5 files as sample
    console.log('\nFirst 5 files generated:');
    result.files.slice(0, 5).forEach((file, i) => {
      console.log(`  ${i + 1}. ${file.path} (${file.content.length} chars)`);
    });

    // Show agent reports
    console.log('\n📋 Agent Reports:');
    console.log('  Architecture:', result.agentReports.architecture);
    console.log('  Testing:', result.agentReports.testing);
    console.log('  Accessibility:', result.agentReports.accessibility);
    console.log('  Security:', result.agentReports.security);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the test
testMultiAgent();
