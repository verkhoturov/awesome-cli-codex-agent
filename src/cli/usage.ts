import { DEFAULT_MODEL } from '../config.js';

export function usage(): string {
  return `Usage: custom-codex-agent [options]

Options:
  -C, --cwd <path>        Working directory (default: current directory)
  --login                 Choose and replace saved Codex authentication
  -m, --model <model>     Primary agent model (default: ${DEFAULT_MODEL})
  -r, --reasoning-effort <effort>  Primary agent effort override
  --resume <thread-id>    Resume an agent thread
  -s, --sandbox <mode>    Primary agent sandbox: read-only or workspace-write
  -h, --help              Show this help

Run /help inside the CLI to list interactive commands.`;
}
