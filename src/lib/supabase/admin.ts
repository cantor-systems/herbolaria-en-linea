import 'server-only';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export class SupabaseConfigurationError extends Error {}

let adminClient: SupabaseClient | undefined;

function requiredPrivateEnvironmentVariable(
  name: 'SUPABASE_URL' | 'SUPABASE_SERVICE_ROLE_KEY'
) {
  const value = process.env[name]?.trim();
  if (!value) throw new SupabaseConfigurationError(`Falta configurar ${name}.`);
  return value;
}

export function createSupabaseAdminClient() {
  if (adminClient) return adminClient;

  const url = requiredPrivateEnvironmentVariable('SUPABASE_URL');
  const serviceRoleKey = requiredPrivateEnvironmentVariable('SUPABASE_SERVICE_ROLE_KEY');

  try {
    const parsedUrl = new URL(url);
    const isLocalHttp =
      parsedUrl.protocol === 'http:' &&
      (parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1');
    if (parsedUrl.protocol !== 'https:' && !isLocalHttp) throw new Error('invalid_protocol');
  } catch {
    throw new SupabaseConfigurationError('SUPABASE_URL no es una URL HTTPS válida.');
  }

  adminClient = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });

  return adminClient;
}
