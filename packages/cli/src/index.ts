#!/usr/bin/env node

import { Command } from 'commander';
import { createWrapCommand } from './cmd/wrap.js';
import { createVerifyCommand } from './cmd/verify.js';

const program = new Command();

program
  .name('pp')
  .description('Provenance Passport CLI - Create and verify cryptographic provenance for digital artifacts')
  .version('0.1.0')
  .option('--log-level <level>', 'Set logging verbosity (error, warn, info, debug, trace)', 'info')
  .option('--revocations <url>', 'Override revocation list URL')
  .option('--fail-on-missing', 'Exit with error if passport is missing during verification');

program.addCommand(createWrapCommand());
program.addCommand(createVerifyCommand());

program.parse();