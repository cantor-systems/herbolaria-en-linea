import 'server-only';
import { notFound } from 'next/navigation';
import { requireDispatchAdminSession } from '@/lib/dispatch/auth';

// Independent of the persistence flag. Production cannot open this demonstration.
export function isManualDemoEnabled() {
  return process.env.MANUAL_ORDERS_DEMO_ENABLED === 'true' && process.env.VERCEL_ENV !== 'production';
}

export async function requireManualDemoAccess() {
  await requireDispatchAdminSession();
  if (!isManualDemoEnabled()) notFound();
}
