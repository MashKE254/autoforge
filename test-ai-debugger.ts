/**
 * Test the AI Debugger
 *
 * Run this with: tsx test-ai-debugger.ts
 */

import { aiDebugger } from './src/lib/generation';

async function testAIDebugger() {
  console.log('🔧 Testing AI Debugger\n');
  console.log('='.repeat(60));

  // Start a debug session
  const sessionId = 'test-session-' + Date.now();
  const session = aiDebugger.startSession(sessionId);

  console.log('✅ Debug session started:', sessionId);

  // Simulate some common errors
  const testErrors = [
    {
      type: 'runtime' as const,
      message: "Cannot read property 'user' of undefined",
      file: 'app/dashboard/page.tsx',
      line: 42,
      stack: `TypeError: Cannot read property 'user' of undefined
    at DashboardPage (app/dashboard/page.tsx:42:15)
    at renderComponent (react-dom:1234:56)`,
      timestamp: Date.now(),
    },
    {
      type: 'type' as const,
      message: "Property 'name' does not exist on type '{}'",
      file: 'components/UserCard.tsx',
      line: 28,
      timestamp: Date.now(),
    },
  ];

  // Mock files for context
  const mockFiles = [
    {
      path: 'app/dashboard/page.tsx',
      language: 'typescript',
      content: `export default function DashboardPage() {
  const session = useSession();
  const userName = session.user.name; // Line 42 - ERROR HERE
  return <div>Welcome {userName}</div>;
}`,
    },
    {
      path: 'components/UserCard.tsx',
      language: 'typescript',
      content: `export function UserCard({ user }: { user: {} }) {
  return <div>{user.name}</div>; // Line 28 - ERROR HERE
}`,
    },
  ];

  try {
    // Test error analysis and fix proposals
    for (let i = 0; i < testErrors.length; i++) {
      const error = testErrors[i];
      console.log(`\n📍 Error ${i + 1}: ${error.message}`);
      console.log(`   File: ${error.file}:${error.line}`);

      const fix = await aiDebugger.reportError(sessionId, error, mockFiles);

      if (fix) {
        console.log('\n🤖 AI Analysis:');
        console.log('   Confidence:', fix.confidence);
        console.log('   Description:', fix.description);
        console.log('\n   Proposed Changes:');
        fix.changes.forEach((change, idx) => {
          console.log(`     ${idx + 1}. ${change.file}`);
          console.log(`        Before: ${change.before}`);
          console.log(`        After:  ${change.after}`);
          console.log(`        Why:    ${change.explanation}`);
        });

        if (fix.alternativeFixes && fix.alternativeFixes.length > 0) {
          console.log('\n   Alternative Fixes:');
          fix.alternativeFixes.forEach((alt, idx) => {
            console.log(`     ${idx + 1}. ${alt}`);
          });
        }
      }
    }

    // Get proactive suggestions
    console.log('\n💡 Proactive Suggestions:');
    const suggestions = await aiDebugger.getProactiveSuggestions(mockFiles);
    suggestions.forEach((suggestion, idx) => {
      console.log(`   ${idx + 1}. ${suggestion}`);
    });

    // Get session stats
    console.log('\n📊 Debug Session Stats:');
    const stats = aiDebugger.getSessionStats(sessionId);
    console.log('   Total Errors:', stats.totalErrors);
    console.log('   Fixes Proposed:', stats.fixesProposed);
    console.log('   Fixes Applied:', stats.fixesApplied);
    console.log('   Success Rate:', stats.successRate.toFixed(1), '%');

    console.log('\n✅ AI Debugger test complete!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    // Clean up
    aiDebugger.endSession(sessionId);
  }
}

// Run the test
testAIDebugger();
