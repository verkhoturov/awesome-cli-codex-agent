export const NATIVE_AUTHENTICATION_METHODS = [
  'browser',
  'device-code',
  'api-key',
  'access-token',
] as const;

export type NativeAuthenticationMethod = (typeof NATIVE_AUTHENTICATION_METHODS)[number];

export interface NativeAuthenticationSelection {
  credential?: string;
  method: NativeAuthenticationMethod;
}

export function isNativeAuthenticationMethod(value: string): value is NativeAuthenticationMethod {
  return NATIVE_AUTHENTICATION_METHODS.some(method => method === value);
}
