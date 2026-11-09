'use server';
import { requireManualDemoAccess } from '@/lib/manual-orders/demo-access';
import { calculateDemoQuote } from '@/lib/manual-orders/demo-quote';
import type { DemoQuoteState } from '@/lib/manual-orders/demo-types';

export async function quoteManualDemoAction(_previous: DemoQuoteState, form: FormData): Promise<DemoQuoteState> {
  await requireManualDemoAccess();
  return calculateDemoQuote(form);
}
