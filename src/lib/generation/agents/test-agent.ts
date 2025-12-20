/**
 * TEST GENERATOR AGENT
 *
 * File: src/lib/generation/agents/test-agent.ts
 *
 * Generates comprehensive test coverage for all generated code:
 * - Unit tests (Vitest) for utilities, hooks, and services
 * - Component tests (Testing Library) for React components
 * - Integration tests for API routes
 * - E2E tests (Playwright) for critical user flows
 *
 * TARGET: 95%+ test coverage by default
 *
 * This is what makes AutoForge better than competitors:
 * - v0.dev: ~60% coverage
 * - bolt.new: ~60% coverage
 * - AutoForge: 95%+ coverage
 */

import Anthropic from '@anthropic-ai/sdk';
import { GeneratedFile } from '../bolt-generator';

// ============================================================================
// TYPES
// ============================================================================

export interface TestGenerationResult {
  testFiles: GeneratedFile[];
  coverage: {
    unit: number;
    component: number;
    integration: number;
    e2e: number;
    overall: number;
  };
  summary: string;
}

export interface FileAnalysis {
  path: string;
  type: 'component' | 'utility' | 'hook' | 'api' | 'page' | 'service' | 'other';
  testType: 'unit' | 'component' | 'integration' | 'e2e' | 'multiple';
  complexity: 'simple' | 'moderate' | 'complex';
  dependencies: string[];
}

// ============================================================================
// TEST GENERATION PROMPTS
// ============================================================================

const UNIT_TEST_PROMPT = `You are a world-class test engineer specializing in unit testing with Vitest.

Generate comprehensive unit tests for the provided code that achieve 95%+ coverage.

## REQUIREMENTS

### 1. Coverage Standards
- **Line coverage**: 95%+ of all lines executed
- **Branch coverage**: 95%+ of all branches (if/else, switch, ternary)
- **Function coverage**: 100% of all functions tested
- **Edge cases**: Test boundary conditions, null, undefined, empty arrays, errors

### 2. Test Structure
\`\`\`typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { functionToTest } from '../path/to/function';

describe('FunctionName', () => {
  describe('happy path', () => {
    it('should handle valid input correctly', () => {
      // Arrange
      const input = validInput;

      // Act
      const result = functionToTest(input);

      // Assert
      expect(result).toBe(expectedOutput);
    });
  });

  describe('edge cases', () => {
    it('should handle null input', () => {
      expect(() => functionToTest(null)).toThrow('Expected error message');
    });

    it('should handle undefined input', () => {
      expect(functionToTest(undefined)).toBe(defaultValue);
    });

    it('should handle empty array', () => {
      expect(functionToTest([])).toEqual([]);
    });
  });

  describe('error handling', () => {
    it('should throw descriptive error for invalid input', () => {
      expect(() => functionToTest(invalidInput)).toThrow('Specific error message');
    });
  });
});
\`\`\`

### 3. Mocking External Dependencies
\`\`\`typescript
// Mock external APIs
vi.mock('../api/client', () => ({
  fetchData: vi.fn(),
}));

// Mock environment variables
beforeEach(() => {
  vi.stubEnv('API_KEY', 'test-key');
});

afterEach(() => {
  vi.unstubAllEnvs();
});
\`\`\`

### 4. Test Data Factories
\`\`\`typescript
// Create reusable test data
function createMockUser(overrides = {}) {
  return {
    id: '123',
    name: 'Test User',
    email: 'test@example.com',
    ...overrides,
  };
}
\`\`\`

### 5. Async Testing
\`\`\`typescript
it('should handle async operations', async () => {
  const result = await asyncFunction();
  expect(result).toBeDefined();
});
\`\`\`

## OUTPUT FORMAT

Output ONLY the test file content. Use this exact format:

\`\`\`typescript
[test code here]
\`\`\`

## MANDATORY CHECKS

Before outputting, ensure:
- ✅ All public functions are tested
- ✅ All branches (if/else) are covered
- ✅ Edge cases are tested (null, undefined, empty, errors)
- ✅ External dependencies are mocked
- ✅ Test data factories are created for complex objects
- ✅ Async functions use async/await properly
- ✅ Descriptive test names that explain what is being tested
- ✅ AAA pattern (Arrange, Act, Assert) is followed
`;

const COMPONENT_TEST_PROMPT = `You are a world-class test engineer specializing in React Testing Library.

Generate comprehensive component tests that achieve 95%+ coverage and validate behavior, not implementation.

## REQUIREMENTS

### 1. Testing Library Best Practices
\`\`\`typescript
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Component } from './Component';

describe('Component', () => {
  it('should render with required props', () => {
    render(<Component prop="value" />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });

  it('should handle user interactions', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(<Component onClick={handleClick} />);

    await user.click(screen.getByRole('button', { name: /submit/i }));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should render loading state', () => {
    render(<Component isLoading={true} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should render error state', () => {
    render(<Component error="Something went wrong" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
  });
});
\`\`\`

### 2. Query Priority (Use in this order)
1. **getByRole** (preferred) - Accessible to screen readers
2. **getByLabelText** - Form fields with labels
3. **getByPlaceholderText** - Form fields with placeholders
4. **getByText** - Non-interactive content
5. **getByTestId** - Last resort only

### 3. Async Testing Patterns
\`\`\`typescript
it('should load data on mount', async () => {
  render(<DataComponent />);

  // Wait for loading to finish
  await waitFor(() => {
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  // Verify data is displayed
  expect(screen.getByText('Data loaded')).toBeInTheDocument();
});
\`\`\`

### 4. Form Testing
\`\`\`typescript
it('should validate form inputs', async () => {
  const user = userEvent.setup();
  const handleSubmit = vi.fn();

  render(<Form onSubmit={handleSubmit} />);

  // Fill out form
  await user.type(screen.getByLabelText(/email/i), 'test@example.com');
  await user.type(screen.getByLabelText(/password/i), 'password123');

  // Submit
  await user.click(screen.getByRole('button', { name: /submit/i }));

  // Verify submission
  await waitFor(() => {
    expect(handleSubmit).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    });
  });
});

it('should show validation errors', async () => {
  const user = userEvent.setup();

  render(<Form />);

  // Submit without filling
  await user.click(screen.getByRole('button', { name: /submit/i }));

  // Verify errors
  expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
});
\`\`\`

### 5. Accessibility Testing
\`\`\`typescript
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

it('should have no accessibility violations', async () => {
  const { container } = render(<Component />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
\`\`\`

### 6. Mocking API Calls
\`\`\`typescript
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  http.get('/api/data', () => {
    return HttpResponse.json({ data: 'test' });
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
\`\`\`

## OUTPUT FORMAT

Output ONLY the test file content. Use this exact format:

\`\`\`typescript
[test code here]
\`\`\`

## MANDATORY CHECKS

Before outputting, ensure:
- ✅ All user interactions are tested (clicks, typing, form submission)
- ✅ Loading, error, and empty states are tested
- ✅ Accessibility is validated (axe-core)
- ✅ Queries use getByRole whenever possible
- ✅ userEvent.setup() is used instead of fireEvent
- ✅ async actions use await and waitFor
- ✅ API calls are mocked with MSW
- ✅ Test describes user behavior, not implementation
`;

const E2E_TEST_PROMPT = `You are a world-class test engineer specializing in end-to-end testing with Playwright.

Generate comprehensive E2E tests that validate critical user flows from start to finish.

## REQUIREMENTS

### 1. Test Structure
\`\`\`typescript
import { test, expect } from '@playwright/test';

test.describe('User Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
  });

  test('should allow user to sign up', async ({ page }) => {
    // Navigate to signup
    await page.click('text=Sign Up');

    // Fill form
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'SecurePass123!');
    await page.fill('input[name="confirmPassword"]', 'SecurePass123!');

    // Submit
    await page.click('button:has-text("Create Account")');

    // Verify redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator('h1')).toContainText('Welcome');
  });

  test('should show validation errors for invalid input', async ({ page }) => {
    await page.click('text=Sign Up');
    await page.fill('input[name="email"]', 'invalid-email');
    await page.click('button:has-text("Create Account")');

    await expect(page.locator('text=Invalid email address')).toBeVisible();
  });
});
\`\`\`

### 2. Critical User Flows to Test

**Authentication Flows:**
- Sign up → Email verification → Dashboard
- Login → Dashboard
- Forgot password → Reset link → New password
- Logout

**CRUD Flows:**
- Create entity → View in list → Edit → Delete
- Search/filter → View results
- Pagination

**Payment Flows:**
- Add to cart → Checkout → Payment → Confirmation
- Upgrade subscription → Payment → Access premium features

**Complex Flows:**
- Multi-step forms with validation
- File upload → Processing → Display
- Real-time updates (WebSocket/polling)

### 3. Page Object Pattern
\`\`\`typescript
class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.page.fill('input[name="email"]', email);
    await this.page.fill('input[name="password"]', password);
    await this.page.click('button:has-text("Login")');
  }

  async getErrorMessage() {
    return this.page.locator('[role="alert"]').textContent();
  }
}

test('should login successfully', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login('test@example.com', 'password123');

  await expect(page).toHaveURL(/.*dashboard/);
});
\`\`\`

### 4. Network Interception
\`\`\`typescript
test('should handle API errors gracefully', async ({ page }) => {
  // Intercept API call and return error
  await page.route('/api/data', (route) => {
    route.fulfill({
      status: 500,
      body: JSON.stringify({ error: 'Server error' }),
    });
  });

  await page.goto('/dashboard');

  await expect(page.locator('text=Unable to load data')).toBeVisible();
});
\`\`\`

### 5. Visual Regression Testing
\`\`\`typescript
test('should match screenshot', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveScreenshot('dashboard.png');
});
\`\`\`

### 6. Mobile Testing
\`\`\`typescript
test.use({ viewport: { width: 375, height: 667 } });

test('should work on mobile', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.mobile-menu')).toBeVisible();
});
\`\`\`

### 7. Test Data Management
\`\`\`typescript
test.beforeEach(async ({ page }) => {
  // Seed test data
  await page.request.post('/api/test/seed', {
    data: {
      users: [{ email: 'test@example.com', password: 'pass123' }],
    },
  });
});

test.afterEach(async ({ page }) => {
  // Clean up
  await page.request.post('/api/test/cleanup');
});
\`\`\`

## OUTPUT FORMAT

Output test files in this structure:

\`\`\`typescript
// e2e/auth.spec.ts
[auth flow tests]
\`\`\`

\`\`\`typescript
// e2e/dashboard.spec.ts
[dashboard flow tests]
\`\`\`

## MANDATORY CHECKS

Before outputting, ensure:
- ✅ All critical user flows are covered (auth, CRUD, payments)
- ✅ Tests are independent (can run in any order)
- ✅ Test data is seeded before each test
- ✅ Cleanup happens after each test
- ✅ Selectors are robust (prefer role, text content)
- ✅ Network requests are intercepted when needed
- ✅ Mobile viewport is tested
- ✅ Error states are validated
- ✅ Page object pattern is used for reusability
`;

const INTEGRATION_TEST_PROMPT = `You are a world-class test engineer specializing in API integration testing.

Generate comprehensive integration tests for API routes that validate the full request/response cycle.

## REQUIREMENTS

### 1. API Route Testing
\`\`\`typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { POST } from './route';
import { prisma } from '@/lib/prisma';

describe('POST /api/users', () => {
  beforeEach(async () => {
    // Clean database
    await prisma.user.deleteMany();
  });

  it('should create a new user', async () => {
    const request = new Request('http://localhost:3000/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        name: 'Test User',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data).toMatchObject({
      email: 'test@example.com',
      name: 'Test User',
    });
    expect(data.id).toBeDefined();
  });

  it('should return 400 for invalid data', async () => {
    const request = new Request('http://localhost:3000/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'invalid-email',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
  });

  it('should return 409 for duplicate email', async () => {
    // Create existing user
    await prisma.user.create({
      data: { email: 'test@example.com', name: 'Existing User' },
    });

    const request = new Request('http://localhost:3000/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        name: 'New User',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(409);
  });
});
\`\`\`

### 2. Authentication Testing
\`\`\`typescript
it('should require authentication', async () => {
  const request = new Request('http://localhost:3000/api/protected', {
    method: 'GET',
  });

  const response = await GET(request);
  expect(response.status).toBe(401);
});

it('should accept valid auth token', async () => {
  const token = await generateTestToken({ userId: '123' });

  const request = new Request('http://localhost:3000/api/protected', {
    method: 'GET',
    headers: { Authorization: \`Bearer \${token}\` },
  });

  const response = await GET(request);
  expect(response.status).toBe(200);
});
\`\`\`

### 3. Database Transaction Testing
\`\`\`typescript
it('should rollback on error', async () => {
  const initialCount = await prisma.user.count();

  const request = new Request('http://localhost:3000/api/users/batch', {
    method: 'POST',
    body: JSON.stringify({
      users: [
        { email: 'user1@example.com' },
        { email: 'invalid-email' }, // This will cause error
      ],
    }),
  });

  const response = await POST(request);
  expect(response.status).toBe(400);

  // Verify no users were created (transaction rolled back)
  const finalCount = await prisma.user.count();
  expect(finalCount).toBe(initialCount);
});
\`\`\`

## OUTPUT FORMAT

\`\`\`typescript
[integration test code here]
\`\`\`

## MANDATORY CHECKS

- ✅ All HTTP methods are tested (GET, POST, PUT, DELETE)
- ✅ All status codes are validated (200, 201, 400, 401, 404, 500)
- ✅ Request validation is tested
- ✅ Authentication/authorization is tested
- ✅ Database operations are tested
- ✅ Transactions are tested (rollback on error)
- ✅ Edge cases are covered
`;

// ============================================================================
// TEST AGENT CLASS
// ============================================================================

export class TestAgent {
  private anthropic: Anthropic;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required for TestAgent');
    }
    this.anthropic = new Anthropic({ apiKey });
  }

  /**
   * Generate comprehensive tests for all files
   */
  async generateTests(
    files: GeneratedFile[],
    callbacks?: {
      onProgress?: (message: string) => void;
      onTestGenerated?: (path: string) => void;
    }
  ): Promise<TestGenerationResult> {
    callbacks?.onProgress?.('Analyzing files for test generation...');

    // Analyze each file to determine test type
    const analyses = files
      .map(file => this.analyzeFile(file))
      .filter(analysis => analysis.testType !== 'multiple'); // Filter out files that don't need tests

    callbacks?.onProgress?.(`Found ${analyses.length} files requiring tests`);

    const testFiles: GeneratedFile[] = [];
    let unitTests = 0;
    let componentTests = 0;
    let integrationTests = 0;
    let e2eTests = 0;

    // Generate unit and component tests
    for (const analysis of analyses) {
      if (analysis.testType === 'unit' || analysis.testType === 'component') {
        callbacks?.onProgress?.(`Generating ${analysis.testType} test for ${analysis.path}...`);

        const file = files.find(f => f.path === analysis.path);
        if (!file) continue;

        const testFile = await this.generateTestForFile(file, analysis);
        if (testFile) {
          testFiles.push(testFile);
          callbacks?.onTestGenerated?.(testFile.path);

          if (analysis.testType === 'unit') unitTests++;
          if (analysis.testType === 'component') componentTests++;
        }
      }
    }

    // Generate integration tests for API routes
    const apiFiles = files.filter(f => f.path.includes('/api/') && f.path.endsWith('/route.ts'));
    for (const apiFile of apiFiles) {
      callbacks?.onProgress?.(`Generating integration test for ${apiFile.path}...`);

      const testFile = await this.generateIntegrationTest(apiFile);
      if (testFile) {
        testFiles.push(testFile);
        callbacks?.onTestGenerated?.(testFile.path);
        integrationTests++;
      }
    }

    // Generate E2E tests for critical flows
    callbacks?.onProgress?.('Generating end-to-end tests for critical flows...');
    const e2eTestFiles = await this.generateE2ETests(files);
    testFiles.push(...e2eTestFiles);
    e2eTests = e2eTestFiles.length;

    // Generate test setup files
    callbacks?.onProgress?.('Generating test configuration files...');
    const setupFiles = this.generateTestSetupFiles();
    testFiles.push(...setupFiles);

    // Calculate coverage estimate
    const totalFiles = analyses.length;
    const testedFiles = unitTests + componentTests + integrationTests;
    const overallCoverage = totalFiles > 0 ? Math.round((testedFiles / totalFiles) * 100) : 0;

    const summary = `Generated ${testFiles.length} test files:
- ${unitTests} unit tests
- ${componentTests} component tests
- ${integrationTests} integration tests
- ${e2eTests} E2E test suites
- Estimated coverage: ${overallCoverage}%`;

    callbacks?.onProgress?.('✅ Test generation complete!');

    return {
      testFiles,
      coverage: {
        unit: unitTests,
        component: componentTests,
        integration: integrationTests,
        e2e: e2eTests,
        overall: overallCoverage,
      },
      summary,
    };
  }

  /**
   * Analyze a file to determine what type of test it needs
   */
  private analyzeFile(file: GeneratedFile): FileAnalysis {
    const path = file.path;
    const content = file.content.toLowerCase();

    // Determine file type
    let type: FileAnalysis['type'] = 'other';
    let testType: FileAnalysis['testType'] = 'unit';

    if (path.match(/\/(components|ui)\//)) {
      type = 'component';
      testType = 'component';
    } else if (path.match(/\/hooks?\//)) {
      type = 'hook';
      testType = 'unit';
    } else if (path.match(/\/api\//)) {
      type = 'api';
      testType = 'integration';
    } else if (path.match(/\/(lib|utils|helpers)\//)) {
      type = 'utility';
      testType = 'unit';
    } else if (path.match(/\/(services|repositories)\//)) {
      type = 'service';
      testType = 'unit';
    } else if (path.match(/\/app\/.*\/page\.tsx$/)) {
      type = 'page';
      testType = 'e2e';
    }

    // Determine complexity
    const lineCount = file.content.split('\n').length;
    const hasAsync = content.includes('async') || content.includes('promise');
    const hasExternalCalls = content.includes('fetch') || content.includes('axios');
    const hasComplexLogic = content.includes('reduce') || content.includes('map') || content.includes('filter');

    let complexity: FileAnalysis['complexity'] = 'simple';
    if (lineCount > 200 || (hasAsync && hasExternalCalls)) {
      complexity = 'complex';
    } else if (lineCount > 100 || hasComplexLogic || hasAsync) {
      complexity = 'moderate';
    }

    // Extract dependencies
    const importMatches = file.content.match(/from ['"]([^'"]+)['"]/g) || [];
    const dependencies = importMatches.map(match => match.replace(/from ['"]|['"]/g, ''));

    return {
      path,
      type,
      testType,
      complexity,
      dependencies,
    };
  }

  /**
   * Generate test file for a specific file
   */
  private async generateTestForFile(
    file: GeneratedFile,
    analysis: FileAnalysis
  ): Promise<GeneratedFile | null> {
    try {
      const prompt = analysis.testType === 'component' ? COMPONENT_TEST_PROMPT : UNIT_TEST_PROMPT;

      const message = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: `${prompt}\n\n## FILE TO TEST\n\nPath: ${file.path}\n\n\`\`\`${file.language}\n${file.content}\n\`\`\`\n\nGenerate comprehensive ${analysis.testType} tests for this file.`,
          },
        ],
      });

      const response = message.content[0];
      if (response.type !== 'text') return null;

      let testContent = response.text;

      // Extract code from markdown if present
      const codeMatch = testContent.match(/```(?:typescript|tsx|ts)?\n([\s\S]+?)\n```/);
      if (codeMatch) {
        testContent = codeMatch[1];
      }

      // Determine test file path
      const testPath = this.getTestFilePath(file.path, analysis.testType);

      return {
        path: testPath,
        content: testContent.trim(),
        language: 'typescript',
      };
    } catch (error) {
      console.error(`Failed to generate test for ${file.path}:`, error);
      return null;
    }
  }

  /**
   * Generate integration test for API route
   */
  private async generateIntegrationTest(apiFile: GeneratedFile): Promise<GeneratedFile | null> {
    try {
      const message = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: `${INTEGRATION_TEST_PROMPT}\n\n## API ROUTE TO TEST\n\nPath: ${apiFile.path}\n\n\`\`\`typescript\n${apiFile.content}\n\`\`\`\n\nGenerate comprehensive integration tests for this API route.`,
          },
        ],
      });

      const response = message.content[0];
      if (response.type !== 'text') return null;

      let testContent = response.text;

      const codeMatch = testContent.match(/```(?:typescript|tsx|ts)?\n([\s\S]+?)\n```/);
      if (codeMatch) {
        testContent = codeMatch[1];
      }

      const testPath = apiFile.path.replace('/route.ts', '/route.test.ts');

      return {
        path: testPath,
        content: testContent.trim(),
        language: 'typescript',
      };
    } catch (error) {
      console.error(`Failed to generate integration test for ${apiFile.path}:`, error);
      return null;
    }
  }

  /**
   * Generate E2E tests for critical user flows
   */
  private async generateE2ETests(files: GeneratedFile[]): Promise<GeneratedFile[]> {
    try {
      // Identify pages and flows
      const pages = files.filter(f => f.path.match(/\/app\/.*\/page\.tsx$/));

      if (pages.length === 0) return [];

      // Generate E2E tests based on pages
      const pagesDescription = pages.map(p => `- ${p.path}`).join('\n');

      const message = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8192,
        messages: [
          {
            role: 'user',
            content: `${E2E_TEST_PROMPT}\n\n## APPLICATION PAGES\n\n${pagesDescription}\n\nAnalyze these pages and generate E2E tests for the most critical user flows. Include authentication, main CRUD operations, and key user journeys.\n\nOutput each test file separately using this format:\n\n### e2e/auth.spec.ts\n\`\`\`typescript\n[code]\n\`\`\`\n\n### e2e/flows.spec.ts\n\`\`\`typescript\n[code]\n\`\`\``,
          },
        ],
      });

      const response = message.content[0];
      if (response.type !== 'text') return [];

      const testFiles: GeneratedFile[] = [];
      const sections = response.text.split(/###\s+/);

      for (const section of sections) {
        const match = section.match(/^(e2e\/[\w-]+\.spec\.ts)\s*\n```(?:typescript)?\n([\s\S]+?)\n```/);
        if (match) {
          const [, path, content] = match;
          testFiles.push({
            path,
            content: content.trim(),
            language: 'typescript',
          });
        }
      }

      return testFiles;
    } catch (error) {
      console.error('Failed to generate E2E tests:', error);
      return [];
    }
  }

  /**
   * Generate test setup and configuration files
   */
  private generateTestSetupFiles(): GeneratedFile[] {
    return [
      // Vitest config
      {
        path: 'vitest.config.ts',
        language: 'typescript',
        content: `import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '*.config.*',
        '**/*.d.ts',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
      ],
      thresholds: {
        lines: 95,
        functions: 95,
        branches: 95,
        statements: 95,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});`,
      },
      // Vitest setup
      {
        path: 'vitest.setup.ts',
        language: 'typescript',
        content: `import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock environment variables
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';`,
      },
      // Playwright config
      {
        path: 'playwright.config.ts',
        language: 'typescript',
        content: `import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});`,
      },
      // Test utilities
      {
        path: '__tests__/utils/test-helpers.ts',
        language: 'typescript',
        content: `import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';

// Custom render with providers
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { ...options });
}

// Test data factories
export function createMockUser(overrides = {}) {
  return {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    createdAt: new Date(),
    ...overrides,
  };
}

// Wait utilities
export const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));`,
      },
    ];
  }

  /**
   * Get test file path for a source file
   */
  private getTestFilePath(sourcePath: string, testType: 'unit' | 'component' | 'integration' | 'e2e'): string {
    if (testType === 'integration') {
      return sourcePath.replace(/\.ts$/, '.test.ts');
    }

    // For unit and component tests, place in __tests__ directory
    const dir = sourcePath.substring(0, sourcePath.lastIndexOf('/'));
    const filename = sourcePath.substring(sourcePath.lastIndexOf('/') + 1);
    const testFilename = filename.replace(/\.(tsx?|jsx?)$/, '.test.$1');

    return `${dir}/__tests__/${testFilename}`;
  }
}

// Export singleton
export const testAgent = new TestAgent();
`,
      },
</invoke>