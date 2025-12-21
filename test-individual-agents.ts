/**
 * Test Individual Agents
 *
 * Run this with: tsx test-individual-agents.ts
 */

import {
  testAgent,
  accessibilityAgent,
  typeSafetyAgent,
  securityAgent,
  performanceAgent,
} from './src/lib/generation';

// Mock files for testing
const mockFiles = [
  {
    path: 'lib/utils/format.ts',
    language: 'typescript',
    content: `export function formatDate(date: Date): string {
  return date.toLocaleDateString();
}

export function formatCurrency(amount: number): string {
  return '$' + amount.toFixed(2);
}`,
  },
  {
    path: 'components/Button.tsx',
    language: 'typescript',
    content: `export function Button({ onClick, children }) {
  return (
    <button onClick={onClick} className="bg-blue-500 text-white px-4 py-2">
      {children}
    </button>
  );
}`,
  },
  {
    path: 'app/api/users/route.ts',
    language: 'typescript',
    content: `export async function GET(request: Request) {
  const users = await db.query('SELECT * FROM users');
  return Response.json(users);
}`,
  },
];

async function testIndividualAgents() {
  console.log('🤖 Testing Individual Agents\n');
  console.log('='.repeat(60));

  try {
    // Test 1: Test Generator Agent
    console.log('\n1️⃣  Testing Test Generator Agent...');
    const testResult = await testAgent.generateTests(mockFiles, {
      onProgress: (msg) => console.log('   ', msg),
      onTestGenerated: (path) => console.log('   ✅', path),
    });

    console.log('\n   Results:');
    console.log('   - Test Files:', testResult.testFiles.length);
    console.log('   - Unit Tests:', testResult.coverage.unit);
    console.log('   - Component Tests:', testResult.coverage.component);
    console.log('   - E2E Tests:', testResult.coverage.e2e);
    console.log('   - Overall Coverage:', testResult.coverage.overall, '%');

    // Test 2: Accessibility Agent
    console.log('\n2️⃣  Testing Accessibility Agent...');
    const a11yResult = await accessibilityAgent.enhanceAccessibility(mockFiles, {
      onProgress: (msg) => console.log('   ', msg),
      onFileProcessed: (path, score) => console.log(`   ${path}: ${score}/100`),
    });

    console.log('\n   Results:');
    console.log('   - Overall Score:', a11yResult.overallScore, '/100');
    console.log('   - Passes WCAG 2.1 AA:', a11yResult.passesWCAG ? '✅' : '❌');
    console.log('   - Components Analyzed:', a11yResult.reports.length);
    console.log('   - Issues Found:', a11yResult.reports.reduce((sum, r) => sum + r.issues.length, 0));

    // Test 3: Type Safety Agent
    console.log('\n3️⃣  Testing Type Safety Agent...');
    const typeResult = await typeSafetyAgent.enhanceTypeSafety(mockFiles, {
      onProgress: (msg) => console.log('   ', msg),
      onRouterGenerated: (name) => console.log('   ✅ Router:', name),
    });

    console.log('\n   Results:');
    console.log('   - tRPC Routers:', typeResult.tRPCRouters.length);
    console.log('   - Zod Schemas:', typeResult.zodSchemas.length);
    console.log('   - Type Safety Score:', typeResult.typeSafetyScore, '/100');

    // Test 4: Security Agent
    console.log('\n4️⃣  Testing Security Agent...');
    const securityResult = await securityAgent.scan(mockFiles);

    console.log('\n   Results:');
    console.log('   - Security Score:', securityResult.score, '/100');
    console.log('   - Passes OWASP:', securityResult.passesOWASP ? '✅' : '❌');
    console.log('   - Issues Found:', securityResult.issues.length);

    if (securityResult.issues.length > 0) {
      console.log('\n   Issues:');
      securityResult.issues.forEach((issue, idx) => {
        console.log(`     ${idx + 1}. [${issue.severity}] ${issue.description}`);
        console.log(`        Fix: ${issue.fix}`);
      });
    }

    // Test 5: Performance Agent
    console.log('\n5️⃣  Testing Performance Agent...');
    const perfResult = await performanceAgent.optimize(mockFiles);

    console.log('\n   Results:');
    console.log('   - Optimizations Applied:', perfResult.optimizations.length);
    console.log('   - Est. Lighthouse Score:', perfResult.estimatedLighthouseScore, '/100');
    console.log('   - Est. Bundle Reduction:', perfResult.estimatedBundleReduction);

    console.log('\n' + '='.repeat(60));
    console.log('✅ All individual agent tests complete!\n');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the test
testIndividualAgents();
