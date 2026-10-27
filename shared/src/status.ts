import type { ApplicationStatus } from './constants';
import { DEFAULT_REVIEW_INTERVAL_DAYS, UPCOMING_DEADLINE_DAYS } from './constants';

/** ISO date (YYYY-MM-DD) for "today" in Indian Standard Time, independent of server timezone. */
export function todayIST(now: Date = new Date()): string {
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().slice(0, 10);
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * The status a citizen should see. An "open" scheme whose confirmed deadline has
 * passed is shown as closed, so stale data never advertises an expired window.
 */
export function effectiveStatus(
  status: ApplicationStatus,
  deadline: string | null | undefined,
  today: string = todayIST(),
): ApplicationStatus {
  if (status === 'open' && deadline && deadline < today) return 'closed';
  return status;
}

export function isDeadlineUpcoming(deadline: string | null | undefined, today: string = todayIST()): boolean {
  if (!deadline) return false;
  return deadline >= today && deadline <= addDays(today, UPCOMING_DEADLINE_DAYS);
}

export type VerificationState = 'verified' | 'review_due' | 'unverified';

export function verificationState(
  lastVerifiedOn: string | null | undefined,
  reviewDueOn: string | null | undefined,
  today: string = todayIST(),
): VerificationState {
  if (!lastVerifiedOn) return 'unverified';
  const due = reviewDueOn ?? addDays(lastVerifiedOn, DEFAULT_REVIEW_INTERVAL_DAYS);
  return due < today ? 'review_due' : 'verified';
}
