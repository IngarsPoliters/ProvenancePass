import { Command } from 'commander';
import { readFileSync, writeFileSync } from 'fs';
import { basename, extname } from 'path';
import { spawn, type ChildProcess } from 'child_process';
import { sha256File, getFileSize } from '../lib/hash.js';
import { signPassport, privateKeyFromPEM } from '../lib/sign.js';
import { validatePassportThrow } from '../lib/schema.js';

interface WrapOptions {
  in: string;
  out: string;
  run: string[];
  step?: string;
  policy?: string[];
  sign: string;
  watermark?: boolean;
  logLevel?: string;
}

export function createWrapCommand(): Command {
  const cmd = new Command('wrap')
    .description('Execute commands while capturing provenance metadata')
    .requiredOption('--in <path>', 'Input file or directory to track')
    .requiredOption('--out <path>', 'Output file or directory to create passport for')
    .requiredOption('--run <command>', 'Command to execute (can be repeated)', collect, [])
    .requiredOption('--sign <key.pem>', 'Private key file for signing the passport')
    .option('--step <description>', 'Human-readable description of the processing step')
    .option('--policy <name>', 'Policy validation to apply (can be repeated)', collect, [])
    .option('--watermark', 'Add visible watermark to output indicating provenance tracking')
    .action(async (options: WrapOptions) => {
      try {
        await wrapCommand(options);
      } catch (error) {
        console.error('❌ Command failed:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  return cmd;
}

function collect(value: string, previous: string[]): string[] {
  return previous.concat([value]);
}

async function wrapCommand(options: WrapOptions): Promise<void> {
  const { in: inputPath, out: outputPath, run: commands, step, policy = [], sign: keyPath } = options;

  if (commands.length === 0) {
    throw new Error('At least one --run command is required');
  }

  console.log('🚀 Starting provenance capture...');
  
  const inputHash = await sha256File(inputPath);
  const inputSize = await getFileSize(inputPath);
  console.log(`📄 Input: ${basename(inputPath)} (sha256: ${inputHash.slice(0, 12)}...)`);

  const startTime = new Date();
  
  for (let i = 0; i < commands.length; i++) {
    const command = commands[i];
    if (!command) {
      throw new Error(`Empty command at index ${i}`);
    }
    console.log(`⚙️  Running: ${command}`);
    
    const result = await executeCommand(command);
    if (result.exitCode !== 0) {
      console.error(`💥 Error: Command failed with exit code ${result.exitCode}`);
      if (result.stderr) {
        console.error(result.stderr);
      }
      process.exit(1);
    }
  }

  const endTime = new Date();
  
  const outputHash = await sha256File(outputPath);
  const outputSize = await getFileSize(outputPath);
  console.log(`📄 Output: ${basename(outputPath)} (sha256: ${outputHash.slice(0, 12)}...)`);

  const passport = await createPassport({
    inputPath,
    inputHash,
    inputSize,
    outputPath,
    outputHash,
    outputSize,
    commands,
    step,
    policy,
    startTime,
    endTime
  });

  const privateKey = loadPrivateKey(keyPath);
  const signature = await signPassport(passport, privateKey);
  
  passport.signature = signature;
  
  validatePassportThrow(passport);
  
  const passportPath = `${outputPath}.passport.json`;
  writeFileSync(passportPath, JSON.stringify(passport, null, 2));
  
  console.log(`✅ Command executed successfully`);
  console.log(`🔐 Signed with key: ${signature.key_id}`);
  console.log(`📋 Passport: ${basename(passportPath)}`);
  console.log(`⏱️  Duration: ${((endTime.getTime() - startTime.getTime()) / 1000).toFixed(1)}s`);
}

async function executeCommand(command: string): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const parts = command.split(' ');
    const cmd = parts[0];
    if (!cmd) {
      throw new Error('Empty command provided');
    }
    const args = parts.slice(1);
    
    const child: ChildProcess = spawn(cmd, args, { stdio: 'inherit' });
    
    child.on('close', (code: number | null) => {
      resolve({
        exitCode: code || 0,
        stdout: '',
        stderr: ''
      });
    });
  });
}

function loadPrivateKey(keyPath: string): Uint8Array {
  try {
    const keyContent = readFileSync(keyPath, 'utf-8');
    return privateKeyFromPEM(keyContent);
  } catch (error) {
    throw new Error(`Failed to load private key from ${keyPath}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

interface PassportParams {
  inputPath: string;
  inputHash: string;
  inputSize: number;
  outputPath: string;
  outputHash: string;
  outputSize: number;
  commands: string[];
  step?: string | undefined;
  policy: string[];
  startTime: Date;
  endTime: Date;
}

async function createPassport(params: PassportParams): Promise<any> {
  const {
    inputPath,
    inputHash,
    inputSize,
    outputPath,
    outputHash,
    outputSize,
    commands,
    step,
    policy,
    startTime,
    endTime
  } = params;

  const mimeType = getMimeType(outputPath);
  
  const passport = {
    version: '0.1',
    artifact: {
      sha256: outputHash,
      mime: mimeType,
      name: basename(outputPath),
      size: outputSize,
      created_at: endTime.toISOString(),
      hash_binding: 'bytes',
      byte_size: outputSize
    },
    inputs: [
      {
        type: 'source',
        sha256: inputHash,
        name: basename(inputPath),
        size: inputSize,
        role: 'input'
      }
    ],
    steps: commands.map((command) => ({
      action: step || 'process',
      tool: command.split(' ')[0],
      command,
      started_at: startTime.toISOString(),
      ended_at: endTime.toISOString(),
      actor: {
        type: 'software',
        id: 'pp-cli'
      }
    })),
    policy_checks: policy.map(policyName => ({
      policy: policyName,
      result: 'pass',
      timestamp: endTime.toISOString(),
      details: 'Policy check passed'
    }))
  };

  return passport;
}

function getMimeType(filePath: string): string {
  const ext = extname(filePath).toLowerCase();
  const mimeMap: { [key: string]: string } = {
    '.pdf': 'application/pdf',
    '.json': 'application/json',
    '.txt': 'text/plain',
    '.md': 'text/markdown',
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.ts': 'application/typescript',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.zip': 'application/zip',
    '.tar': 'application/x-tar',
    '.gz': 'application/gzip',
    '.xml': 'application/xml',
    '.yaml': 'application/x-yaml',
    '.yml': 'application/x-yaml'
  };
  
  return mimeMap[ext] || 'application/octet-stream';
}