import type { CliInputRequest } from './contracts.js';

export function resolveInput(request: CliInputRequest, answer: string): string {
  if (request.type !== 'choice') {
    return answer;
  }

  const trimmed = answer.trim();
  if (!trimmed && request.defaultValue !== undefined) {
    return request.defaultValue;
  }

  const selectedIndex = Number.parseInt(trimmed, 10);
  if (!Number.isNaN(selectedIndex)) {
    const selected = request.options[selectedIndex - 1];
    if (selected) {
      return selected.value;
    }
  }

  const normalized = trimmed.toLowerCase();
  const selected = request.options.find(option =>
    [option.value, ...(option.aliases || [])].some(value => value.toLowerCase() === normalized),
  );
  return selected?.value || trimmed;
}
