/**
 * Test the Iteration Engine
 *
 * Run this with: tsx test-iteration-engine.ts
 */

import { iterationEngine } from './src/lib/generation';

async function testIterationEngine() {
  console.log('⚡ Testing Iteration Engine\n');
  console.log('='.repeat(60));

  // Mock some existing files
  const mockFiles = [
    {
      path: 'components/Header.tsx',
      language: 'typescript',
      content: `import { Logo } from './Logo';

export function Header() {
  return (
    <header className="bg-white shadow">
      <nav className="container mx-auto px-4 py-3">
        <Logo />
        <div className="flex gap-4">
          <a href="/login">Login</a>
          <a href="/signup">Sign Up</a>
        </div>
      </nav>
    </header>
  );
}`,
    },
    {
      path: 'app/layout.tsx',
      language: 'typescript',
      content: `import { Header } from '@/components/Header';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Header />
        <main>{children}</main>
      </body>
    </html>
  );
}`,
    },
  ];

  // User feedback examples
  const feedbackExamples = [
    'Add a dark mode toggle in the header',
    'Make the header sticky on scroll',
    'Add a user profile dropdown menu',
  ];

  try {
    // Test with first feedback
    const feedback = feedbackExamples[0];
    console.log(`💬 User Feedback: "${feedback}"\n`);

    // Step 1: Plan the iteration
    console.log('📋 Planning iteration...');
    const plan = await iterationEngine.planIteration({
      feedback,
      currentFiles: mockFiles,
    });

    console.log('\n✅ Iteration Plan:');
    console.log('   Summary:', plan.summary);
    console.log('   Complexity:', plan.estimatedComplexity);
    console.log('   Estimated Time:', plan.estimatedTime);
    console.log('\n   Files to Change:');
    plan.affectedFiles.forEach((file, idx) => {
      console.log(`     ${idx + 1}. [${file.changeType.toUpperCase()}] ${file.path}`);
      console.log(`        Reason: ${file.reason}`);
    });

    // Step 2: Execute the iteration
    console.log('\n🔄 Executing iteration...');
    const result = await iterationEngine.executeIteration(
      { feedback, currentFiles: mockFiles },
      plan,
      {
        onProgress: (message) => console.log('   ', message),
        onFileChanged: (path) => console.log('   ✅', path),
      }
    );

    console.log('\n✅ Iteration Complete!');
    console.log('   Success:', result.success);
    console.log('   Files Updated:', result.updatedFiles.length);
    console.log('   Changes Made:', result.changes.length);
    console.log('   Tests Preserved:', result.testsPreserved);
    console.log('   Summary:', result.summary);

    // Show the changes
    console.log('\n📝 Changes Made:');
    result.changes.forEach((change, idx) => {
      console.log(`\n   ${idx + 1}. ${change.file}`);
      console.log('      Description:', change.description);
      console.log('      Diff (first 200 chars):');
      console.log('      ' + change.diff.slice(0, 200).replace(/\n/g, '\n      '));
    });

    // Step 3: Validate changes
    console.log('\n🔍 Validating changes...');
    const validation = await iterationEngine.validateChanges(
      mockFiles,
      result.updatedFiles
    );

    console.log('   Validation:', validation.valid ? '✅ PASSED' : '❌ FAILED');
    if (!validation.valid) {
      console.log('   Issues:', validation.issues);
    }

    console.log('\n✅ Iteration Engine test complete!');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the test
testIterationEngine();
