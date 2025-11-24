/**
 * ActionRunner - Bolt.new Style Command Execution
 * 
 * File: src/lib/action-runner.ts
 * 
 * This is the core of the bolt.new architecture. It replaces shell scripts
 * with direct command spawning, which works reliably in WebContainer.
 * 
 * Key differences from shell scripts:
 * - Commands are spawned directly via webcontainer.spawn()
 * - No shell syntax issues (if/then, &&, etc.)
 * - Sequential execution with proper error handling
 * - Separate handling for one-shot commands vs long-running servers
 */

import { WebContainer } from '@webcontainer/api';

// ============================================================================
// TYPES
// ============================================================================

export interface FileAction {
  type: 'file';
  filePath: string;
  content: string;
}

export interface ShellAction {
  type: 'shell';
  content: string;
}

export interface StartAction {
  type: 'start';
  content: string;
}

export type Action = FileAction | ShellAction | StartAction;

export interface ActionRunnerOptions {
  onOutput?: (text: string) => void;
  onServerReady?: (url: string) => void;
  onError?: (error: Error) => void;
}

// ============================================================================
// ACTION RUNNER CLASS
// ============================================================================

export class ActionRunner {
  private webContainer: WebContainer;
  private output: (text: string) => void;
  private onServerReady?: (url: string) => void;
  private onError?: (error: Error) => void;
  private serverProcess: { kill: () => void } | null = null;
  private isRunning = false;
  private lastStartCommand: string = '';

  constructor(webContainer: WebContainer, options: ActionRunnerOptions = {}) {
    this.webContainer = webContainer;
    this.output = options.onOutput || console.log;
    this.onServerReady = options.onServerReady;
    this.onError = options.onError;
    
    // Listen for server-ready event from WebContainer
    this.webContainer.on('server-ready', (port: number, url: string) => {
      this.output(`✅ Server ready on port ${port}`);
      this.output(`🌐 ${url}`);
      if (this.onServerReady) {
        this.onServerReady(url);
      }
    });
  }

  // ==========================================================================
  // PUBLIC METHODS
  // ==========================================================================

  /**
   * Run multiple actions sequentially
   */
  async runActions(actions: Action[]): Promise<void> {
    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
      try {
        await this.runAction(action);
      } catch (error) {
        this.output(`❌ Action ${i + 1} failed: ${error}`);
        if (this.onError) {
          this.onError(error instanceof Error ? error : new Error(String(error)));
        }
        // Continue with next action - don't stop on failure
      }
    }
  }

  /**
   * Run a single action
   */
  async runAction(action: Action): Promise<void> {
    switch (action.type) {
      case 'file':
        await this.runFileAction(action);
        break;
      case 'shell':
        await this.runShellAction(action);
        break;
      case 'start':
        await this.runStartAction(action);
        break;
      default:
        const unknownType = (action as { type?: string } | unknown);
        const type = typeof unknownType === 'object' && unknownType && 'type' in unknownType
          ? (unknownType as { type?: string }).type
          : undefined;
        this.output(`⚠️ Unknown action type: ${type ?? 'undefined'}`);
    }
  }

  /**
   * Stop the running server
   */
  stopServer(): void {
    if (this.serverProcess) {
      try {
        this.serverProcess.kill();
        this.output('🛑 Server stopped');
      } catch (e) {
        // Process might already be dead
      }
      this.serverProcess = null;
      this.isRunning = false;
    }
  }

  /**
   * Restart the server with the last start command
   */
  async restartServer(command?: string): Promise<void> {
    const cmd = command || this.lastStartCommand || 'npm run dev -- --port 3000 --hostname 0.0.0.0';
    this.stopServer();
    await this.runStartAction({ type: 'start', content: cmd });
  }

  /**
   * Check if server is running
   */
  isServerRunning(): boolean {
    return this.isRunning;
  }

  // ==========================================================================
  // PRIVATE METHODS - Action Handlers
  // ==========================================================================

  /**
   * Create or update a file in WebContainer
   */
  private async runFileAction(action: FileAction): Promise<void> {
    const { filePath, content } = action;
    
    // Ensure parent directories exist
    const parts = filePath.split('/');
    if (parts.length > 1) {
      const dir = parts.slice(0, -1).join('/');
      try {
        await this.webContainer.fs.mkdir(dir, { recursive: true });
      } catch (e) {
        // Directory might already exist - that's fine
      }
    }
    
    // Write the file
    await this.webContainer.fs.writeFile(filePath, content);
    this.output(`📄 ${filePath}`);
  }

  /**
   * Run a shell command and wait for completion
   * Used for: npm install, build commands, etc.
   */
  private async runShellAction(action: ShellAction): Promise<void> {
    const command = action.content.trim();
    this.output(`\n$ ${command}`);
    
    const { executable, args } = this.parseCommand(command);
    
    const process = await this.webContainer.spawn(executable, args);
    
    // Stream output to terminal
    process.output.pipeTo(
      new WritableStream({
        write: (data) => {
          // Filter noisy output but keep important messages
          if (this.shouldShowOutput(data)) {
            this.output(data);
          }
        },
      })
    );
    
    // Wait for command to complete
    const exitCode = await process.exit;
    
    if (exitCode !== 0) {
      this.output(`⚠️ Command exited with code ${exitCode}`);
      
      // Auto-retry npm install with --force on failure
      if (command.includes('npm install') && !command.includes('--force')) {
        this.output(`🔄 Retrying with --force...`);
        await this.runShellAction({
          type: 'shell',
          content: command.replace('npm install', 'npm install --force')
        });
      }
    }
  }

  /**
   * Start a long-running process (like dev server)
   * Does NOT wait for completion - runs in background
   */
  private async runStartAction(action: StartAction): Promise<void> {
    const command = action.content.trim();
    this.lastStartCommand = command;
    
    this.output(`\n🚀 ${command}`);
    
    // Kill any existing server first
    this.stopServer();
    
    const { executable, args } = this.parseCommand(command);
    
    // Spawn the process
    const process = await this.webContainer.spawn(executable, args);
    this.serverProcess = process;
    this.isRunning = true;
    
    // Stream output but don't await completion
    process.output.pipeTo(
      new WritableStream({
        write: (data) => {
          this.output(data);
        },
      })
    );
    
    // Handle process exit (but don't block)
    process.exit.then((code) => {
      this.isRunning = false;
      this.serverProcess = null;
      if (code !== 0) {
        this.output(`❌ Server exited with code ${code}`);
      }
    });
  }

  // ==========================================================================
  // PRIVATE METHODS - Utilities
  // ==========================================================================

  /**
   * Parse a command string into executable and arguments
   * 
   * This handles the common patterns used in JavaScript projects:
   * - npm install, npm run dev
   * - npx create-next-app
   * - node script.js
   * - pnpm, yarn variants
   */
  private parseCommand(command: string): { executable: string; args: string[] } {
    // Handle chained commands (cmd1 && cmd2)
    // We only run the first one; the rest should be separate actions
    if (command.includes(' && ')) {
      const firstCommand = command.split(' && ')[0].trim();
      this.output(`⚠️ Chained command detected, running first part only`);
      return this.parseCommand(firstCommand);
    }
    
    // npm commands
    if (command.startsWith('npm ')) {
      const rest = command.substring(4);
      
      // Handle 'npm run dev -- --port 3000' format
      if (rest.includes(' -- ')) {
        const [npmPart, extraArgs] = rest.split(' -- ');
        const npmArgs = npmPart.split(' ').filter(Boolean);
        const extra = extraArgs.split(' ').filter(Boolean);
        return { executable: 'npm', args: [...npmArgs, '--', ...extra] };
      }
      
      return { executable: 'npm', args: rest.split(' ').filter(Boolean) };
    }
    
    // npx commands - always add --yes to skip prompts
    if (command.startsWith('npx ')) {
      const rest = command.substring(4);
      const args = rest.split(' ').filter(Boolean);
      
      if (!args.includes('--yes') && !args.includes('-y')) {
        return { executable: 'npx', args: ['--yes', ...args] };
      }
      
      return { executable: 'npx', args };
    }
    
    // node commands
    if (command.startsWith('node ')) {
      return { 
        executable: 'node', 
        args: command.substring(5).split(' ').filter(Boolean) 
      };
    }
    
    // pnpm commands
    if (command.startsWith('pnpm ')) {
      return { 
        executable: 'pnpm', 
        args: command.substring(5).split(' ').filter(Boolean) 
      };
    }
    
    // yarn commands
    if (command.startsWith('yarn ')) {
      return { 
        executable: 'yarn', 
        args: command.substring(5).split(' ').filter(Boolean) 
      };
    }
    
    // Generic command parsing
    const parts = command.split(' ').filter(Boolean);
    return { executable: parts[0], args: parts.slice(1) };
  }

  /**
   * Filter noisy npm/node output
   * Returns true if the output should be shown
   */
  private shouldShowOutput(data: string): boolean {
    const lowerData = data.toLowerCase();
    
    // Always show errors
    if (lowerData.includes('error') || data.includes('Error') || data.includes('ERR!')) {
      return true;
    }
    
    // Always show success/ready indicators
    if (
      data.includes('✓') || 
      data.includes('✅') || 
      data.includes('ready') || 
      data.includes('compiled') ||
      data.includes('started') ||
      data.includes('listening')
    ) {
      return true;
    }
    
    // Always show URLs
    if (data.includes('http://') || data.includes('https://') || data.includes('localhost')) {
      return true;
    }
    
    // Always show package counts
    if (data.includes('added') && data.includes('packages')) {
      return true;
    }
    
    // Filter npm noise
    if (
      lowerData.includes('npm warn') || 
      lowerData.includes('npm notice') ||
      lowerData.includes('deprecated') ||
      lowerData.includes('peer dep') ||
      lowerData.includes('funding')
    ) {
      return false;
    }
    
    // Show everything else
    return true;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default ActionRunner;