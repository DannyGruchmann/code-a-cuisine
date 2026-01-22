import { BehaviorSubject } from 'rxjs';

export interface QuotaStatus {
  remainingIp: number;
  remainingGlobal: number;
  dateKey: string;
  timeZone: string;
}

export interface WebhookResult {
  ok: boolean;
  message?: string;
  quota?: QuotaStatus;
}

export async function parseJson(response: Response): Promise<unknown> {
  return response.json().catch(() => null);
}

export function buildWebhookResult(response: Response, data: unknown): WebhookResult {
  const quota = extractQuota(data);
  if (!response.ok) {
    const message = extractMessage(data, 'All requests used. Please try again tomorrow.');
    return { ok: false, message, quota };
  }
  return { ok: true, quota };
}

export function extractMessage(data: unknown, fallback: string): string {
  if (data && typeof data === 'object' && 'message' in data) {
    return String((data as { message?: string }).message);
  }
  return fallback;
}

export function beginQuotaLoad(
  quotaLoadingSubject: BehaviorSubject<boolean>,
  quotaErrorSubject: BehaviorSubject<string | null>
): void {
  quotaLoadingSubject.next(true);
  quotaErrorSubject.next(null);
}

export function handleQuotaResponse(
  quotaSubject: BehaviorSubject<QuotaStatus | null>,
  quotaErrorSubject: BehaviorSubject<string | null>,
  response: Response,
  data: unknown
): void {
  if (!response.ok) {
    const message = extractMessage(data, 'Unable to load quota.');
    quotaErrorSubject.next(message);
    return;
  }
  if (data && typeof data === 'object') {
    quotaSubject.next(data as QuotaStatus);
  }
}

export function handleQuotaFailure(
  quotaErrorSubject: BehaviorSubject<string | null>,
  error: unknown
): void {
  console.error('Failed to load quota', error);
  quotaErrorSubject.next('Unable to load quota.');
}

export function logWebhookError(error: unknown): void {
  console.error('Failed to trigger n8n webhook', error);
}

function extractQuota(data: unknown): QuotaStatus | undefined {
  if (data && typeof data === 'object' && 'quota' in data) {
    return (data as { quota?: QuotaStatus }).quota;
  }
  return undefined;
}
