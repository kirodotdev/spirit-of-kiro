
import { spawn } from 'child_process';
import { join } from 'path';

// Helper to create a process with proper output handling
function spawnProcess(command: string, args: string[], name: string, cwd: string) {
  const proc = spawn(command, args, {
    stdio: 'pipe',
    shell: true,
    cwd // Set working directory for the process
  });

  // Prefix output with component name
  proc.stdout.on('data', (data) => {
    const lines = data.toString().split('\n');
    lines.forEach((line: string) => {
      if (line.trim()) {
        console.log(`[${name}] ${line}`);
      }
    });
  });

  proc.stderr.on('data', (data) => {
    const lines = data.toString().split('\n');
    lines.forEach((line: string) => {
      if (line.trim()) {
        console.error(`[${name}] ${line}`);
      }
    });
  });

  proc.on('error', (error) => {
    console.error(`[${name}] Process error:`, error);
  });

  return proc;
}

// Array to track child processes
const processes: any[] = [];

// Get absolute paths for client and server directories
const clientDir = join(process.cwd(), 'client');
const serverDir = join(process.cwd(), 'server');

console.log('Starting client and server...');

// Start server (in server directory)
const server = spawnProcess('bun', ['--watch', 'server.ts'], 'server', serverDir);
processes.push(server);

// Start client (in client directory)
const client = spawnProcess('bun', ['run', 'dev'], 'client', clientDir);
processes.push(client);

// Handle process termination
function cleanup() {
  console.log('\nShutting down processes...');
  processes.forEach(proc => {
    if (!proc.killed) {
      proc.kill();
    }
  });
  process.exit(0);
}

// Handle termination signals
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Handle process errors and exits
processes.forEach(proc => {
  proc.on('exit', (code: number) => {
    if (code !== 0) {
      console.error(`Process exited with code ${code}`);
      cleanup(); // Kill all processes if one fails
    }
  });
});

console.log('\nBoth processes started! Press Ctrl+C to stop both.\n');
