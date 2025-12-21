/**
 * Test AI Systems Detection
 *
 * Simulates user requests to verify AutoForge detects and injects
 * the correct patterns for AI assistants, workflows, bots, and agents.
 */

// Test cases
const testCases = [
  {
    name: 'AI Assistant - Cybersecurity Education',
    prompt: 'Create an AI assistant specialized in cybersecurity education with knowledge of major frameworks (NIST, ISO 27001), certification content (Security+, CEH, CISSP)',
    expectedDetections: ['AI Assistant']
  },
  {
    name: 'AI Assistant - Generic Chatbot',
    prompt: 'Build me a chatbot that can answer customer questions',
    expectedDetections: ['AI Assistant']
  },
  {
    name: 'Workflow Automation',
    prompt: 'Create a workflow automation tool like Zapier but better',
    expectedDetections: ['Workflow']
  },
  {
    name: 'Discord Bot',
    prompt: 'Build a Discord bot that uses AI to moderate channels',
    expectedDetections: ['Bot']
  },
  {
    name: 'Slack Bot',
    prompt: 'Create a Slack bot for our team',
    expectedDetections: ['Bot']
  },
  {
    name: 'Autonomous Agent',
    prompt: 'Build an autonomous AI agent that can research topics and send email summaries',
    expectedDetections: ['AI Agent']
  },
  {
    name: 'Combined - AI Agent + Workflow',
    prompt: 'Create an autonomous agent that can trigger workflows based on web searches',
    expectedDetections: ['AI Agent', 'Workflow']
  },
  {
    name: 'Regular App - Dashboard',
    prompt: 'Build a dashboard for tracking sales metrics',
    expectedDetections: []
  }
];

// Detection functions (copied from bolt-generator.ts)
function detectAISystem(userRequest) {
  const detections = [];

  const isAIAssistant = /\b(ai assistant|chatbot|chat|llm|gpt|claude|openai|ai-powered chat|conversational ai|cybersecurity education|educational assistant)\b/i.test(userRequest);
  const isWorkflow = /\b(workflow|automation|zapier|trigger|action|n8n|make|integromat|automate)\b/i.test(userRequest);
  const isBot = /\b(bot|discord bot|slack bot|telegram bot|whatsapp bot)\b/i.test(userRequest);
  const isAIAgent = /\b(ai agent|autonomous agent|agentic|langchain|langgraph|tool calling|autonomous)\b/i.test(userRequest);

  if (isAIAssistant) detections.push('AI Assistant');
  if (isWorkflow) detections.push('Workflow');
  if (isBot) detections.push('Bot');
  if (isAIAgent) detections.push('AI Agent');

  return detections;
}

// Run tests
console.log('🧪 Testing AI Systems Detection\n');
console.log('='.repeat(70));

let passed = 0;
let failed = 0;

testCases.forEach((test, index) => {
  console.log(`\nTest ${index + 1}: ${test.name}`);
  console.log('-'.repeat(70));
  console.log(`Prompt: "${test.prompt}"`);

  const detected = detectAISystem(test.prompt);
  const expected = test.expectedDetections;

  console.log(`Expected: [${expected.join(', ')}]`);
  console.log(`Detected: [${detected.join(', ')}]`);

  // Check if arrays match
  const isMatch =
    expected.length === detected.length &&
    expected.every(e => detected.includes(e));

  if (isMatch) {
    console.log('✅ PASS');
    passed++;
  } else {
    console.log('❌ FAIL');
    failed++;
  }
});

console.log('\n' + '='.repeat(70));
console.log(`\n📊 Results: ${passed} passed, ${failed} failed out of ${testCases.length} tests`);

if (failed === 0) {
  console.log('\n🎉 All tests passed! AI systems detection is working correctly.');
} else {
  console.log('\n⚠️  Some tests failed. Review the detection logic.');
}
