import type { ApplicationStatus, TbcField } from './constants';
import { checkOfficialLink, LINK_REASON_TEXT } from './links';
import { todayIST } from './status';

export type ChecklistState = 'complete' | 'tbc' | 'missing';

export interface ChecklistItem {
  key: ChecklistKey;
  label: string;
  state: ChecklistState;
  message?: string;
  /** Whether an administrator may satisfy this item by marking it "To be confirmed". */
  allowsTbc: boolean;
}

export const CHECKLIST_KEYS = [
  'name',
  'short_description',
  'category',
  'department',
  'eligibility',
  'benefits',
  'required_documents',
  'application_steps',
  'application_status',
  'deadline',
  'official_link',
  'help_contact',
  'last_verified',
  'mandal_availability',
  'verification_source',
] as const;
export type ChecklistKey = (typeof CHECKLIST_KEYS)[number];

export const CHECKLIST_LABELS: Record<ChecklistKey, string> = {
  name: 'Scheme name',
  short_description: 'Short description',
  category: 'Category',
  department: 'Department / office',
  eligibility: 'Who can apply (eligibility)',
  benefits: 'Benefits',
  required_documents: 'Required documents',
  application_steps: 'How to apply (online / in person)',
  application_status: 'Application status',
  deadline: 'Deadline',
  official_link: 'Official link',
  help_contact: 'Where to get help (office / phone / email)',
  last_verified: 'Last verified date',
  mandal_availability: 'Mandal availability',
  verification_source: 'Verification source',
};

/** The subset of scheme data the checklist needs. Shared by client form and server. */
export interface ChecklistInput {
  name: string;
  shortDescription: string;
  categoryId: number | null;
  departmentId: number | null;
  eligibility: string[];
  benefits: string[];
  requiredDocuments: string[];
  applicationSteps: string[];
  applicationStatus: ApplicationStatus;
  deadline: string | null;
  officialUrl: string | null;
  applicationUrl: string | null;
  helpPhone: string | null;
  helpEmail: string | null;
  helpNotes: string;
  availableAllMandals: boolean;
  mandalIds: number[];
  tbcFields: TbcField[];
  verificationSource: string;
  lastVerifiedOn: string | null;
}

export interface ChecklistResult {
  items: ChecklistItem[];
  canPublish: boolean;
  missing: ChecklistItem[];
  tbc: ChecklistItem[];
  completeCount: number;
}

const MIN_DESCRIPTION = 20;

/**
 * Publication rules (enforced on the server, mirrored in the admin form):
 *  - Every item must be "complete" or explicitly "To be confirmed" (where allowed).
 *  - Name, description, category, department, status, mandal availability,
 *    verification source and last-verified date can never be left "To be confirmed".
 *  - Links only count when they are HTTPS on an approved official domain.
 *  - A last-verified date in the future is rejected.
 */
export function evaluateChecklist(
  s: ChecklistInput,
  officialDomains?: readonly string[],
  today: string = todayIST(),
): ChecklistResult {
  const tbc = new Set(s.tbcFields);
  const items: ChecklistItem[] = [];
  const push = (key: ChecklistKey, state: ChecklistState, allowsTbc: boolean, message?: string) =>
    items.push({ key, label: CHECKLIST_LABELS[key], state, allowsTbc, message });

  push('name', s.name.trim().length >= 3 ? 'complete' : 'missing', false);
  push(
    'short_description',
    s.shortDescription.trim().length >= MIN_DESCRIPTION ? 'complete' : 'missing',
    false,
    s.shortDescription.trim().length >= MIN_DESCRIPTION ? undefined : `At least ${MIN_DESCRIPTION} characters`,
  );
  push('category', s.categoryId ? 'complete' : 'missing', false);
  push('department', s.departmentId ? 'complete' : 'missing', false);

  const listItem = (key: ChecklistKey, field: TbcField, values: string[]) => {
    if (tbc.has(field)) push(key, 'tbc', true);
    else push(key, values.length > 0 ? 'complete' : 'missing', true, values.length ? undefined : 'Add at least one item or mark To be confirmed');
  };
  listItem('eligibility', 'eligibility', s.eligibility);
  listItem('benefits', 'benefits', s.benefits);
  listItem('required_documents', 'required_documents', s.requiredDocuments);
  listItem('application_steps', 'application_steps', s.applicationSteps);

  push('application_status', s.applicationStatus === 'tbc' ? 'tbc' : 'complete', true);

  if (s.applicationStatus === 'year_round' || s.applicationStatus === 'closed') {
    push('deadline', 'complete', true, 'Not applicable for this status');
  } else if (tbc.has('deadline') || s.applicationStatus === 'tbc') {
    push('deadline', 'tbc', true);
  } else if (s.deadline) {
    push('deadline', 'complete', true);
  } else {
    push('deadline', 'missing', true, 'Enter the confirmed last date or mark To be confirmed');
  }

  const official = checkOfficialLink(s.officialUrl, officialDomains);
  const application = checkOfficialLink(s.applicationUrl, officialDomains);
  const badLink = [s.officialUrl && !official.ok ? official : null, s.applicationUrl && !application.ok ? application : null].find(
    (c) => c && !c.ok,
  );
  if (badLink && !badLink.ok) {
    push('official_link', 'missing', true, LINK_REASON_TEXT[badLink.reason]);
  } else if (official.ok || application.ok) {
    push('official_link', tbc.has('official_link') ? 'tbc' : 'complete', true);
  } else if (tbc.has('official_link')) {
    push('official_link', 'tbc', true);
  } else {
    push('official_link', 'missing', true, 'Add an official HTTPS link or mark To be confirmed');
  }

  const hasHelp = Boolean(s.helpPhone || s.helpEmail || s.helpNotes.trim());
  if (tbc.has('help_contact')) push('help_contact', 'tbc', true);
  else push('help_contact', hasHelp ? 'complete' : 'missing', true, hasHelp ? undefined : 'Add help details or mark To be confirmed');

  if (!s.lastVerifiedOn) push('last_verified', 'missing', false, 'Required before publishing');
  else if (s.lastVerifiedOn > today) push('last_verified', 'missing', false, 'Cannot be in the future');
  else push('last_verified', 'complete', false);

  push(
    'mandal_availability',
    s.availableAllMandals || s.mandalIds.length > 0 ? 'complete' : 'missing',
    false,
    s.availableAllMandals || s.mandalIds.length > 0 ? undefined : 'Choose all mandals or at least one mandal',
  );
  push('verification_source', s.verificationSource.trim().length >= 3 ? 'complete' : 'missing', false);

  const missing = items.filter((i) => i.state === 'missing');
  const tbcItems = items.filter((i) => i.state === 'tbc');
  return {
    items,
    canPublish: missing.length === 0,
    missing,
    tbc: tbcItems,
    completeCount: items.filter((i) => i.state === 'complete').length,
  };
}
