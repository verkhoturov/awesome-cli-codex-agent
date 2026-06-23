import { DEFAULT_AGENT_MODE, DEFAULT_MODEL } from '../config.js';

export function usage(): string {
  return `Usage: custom-codex-agent [options]

Options:
  -C, --cwd <path>        Working directory (default: current directory)
  --agent-mode <mode>     Agent mode: multi or single (default: ${DEFAULT_AGENT_MODE})
  --login                 Choose and replace saved Codex authentication
  -m, --model <model>     Primary agent model (default: ${DEFAULT_MODEL})
  -r, --reasoning-effort <effort>  Primary agent effort override
  --resume <thread-id>    Resume a thread in the selected agent mode
  -s, --sandbox <mode>    Primary agent sandbox: read-only or workspace-write
  --ui-debug              Show Ink component and case labels around Box/Text
  -h, --help              Show this help

Run /help inside the CLI to list interactive commands.`;
}
