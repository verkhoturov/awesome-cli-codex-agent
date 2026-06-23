export function assertNever(value: never, title: string): never {
  throw new Error(`${title}: ${formatAssertNeverValue(value)}`);
}

function formatAssertNeverValue(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  const json = JSON.stringify(value);
  return json === undefined ? String(value) : json;
}
