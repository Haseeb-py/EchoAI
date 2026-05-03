import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const rootDir = process.cwd();
const backendDir = join(rootDir, 'echoai-backend');
const isWindows = process.platform === 'win32';
const npmCommand = 'npm';
const backendPython = isWindows
  ? join(backendDir, 'venv', 'Scripts', 'python.exe')
  : join(backendDir, 'venv', 'bin', 'python');

if (!existsSync(backendPython)) {
  console.error(`Backend virtual environment not found at ${backendPython}`);
  console.error('Create it first with: cd echoai-backend && python -m venv venv && pip install -r requirements.txt');
  process.exit(1);
}

console.log('[echoai] Seeding test users...');
const seedResult = spawnSync(backendPython, ['seed_test_users.py'], {
  cwd: backendDir,
  stdio: 'inherit',
});

if (seedResult.status !== 0) {
  process.exit(seedResult.status ?? 1);
}

console.log('[echoai] Starting backend on http://localhost:8000');
const backendProcess = spawn(
  backendPython,
  ['-m', 'uvicorn', 'app.main:app', '--reload', '--host', '127.0.0.1', '--port', '8000'],
  {
    cwd: backendDir,
    stdio: 'inherit',
    shell: false,
  }
);

console.log('[echoai] Starting frontend on http://localhost:3000');
const frontendProcess = spawn(npmCommand, ['run', 'dev:frontend'], {
  cwd: rootDir,
  stdio: 'inherit',
  shell: isWindows,
});

let exiting = false;

function shutdown(exitCode = 0) {
  if (exiting) {
    return;
  }

  exiting = true;
  backendProcess.kill();
  frontendProcess.kill();
  process.exit(exitCode);
}

backendProcess.on('exit', (code, signal) => {
  if (!exiting) {
    console.error(`[echoai] Backend exited with ${signal ?? code}`);
    shutdown(code ?? 1);
  }
});

frontendProcess.on('exit', (code, signal) => {
  if (!exiting) {
    console.error(`[echoai] Frontend exited with ${signal ?? code}`);
    shutdown(code ?? 1);
  }
});

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));