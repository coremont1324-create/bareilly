export const APPLICATION_STATUSES = ['open', 'closed', 'year_round', 'tbc'] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const PUBLICATION_STATUSES = ['draft', 'published', 'archived'] as const;
export type PublicationStatus = (typeof PUBLICATION_STATUSES)[number];

export const ADMIN_ROLES = ['super_admin', 'editor'] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

/** Fields an administrator may explicitly flag as "To be confirmed". */
export const TBC_FIELDS = [
  'eligibility',
  'benefits',
  'required_documents',
  'application_steps',
  'deadline',
  'official_link',
  'application_link',
  'help_contact',
] as const;
export type TbcField = (typeof TBC_FIELDS)[number];

export const SORT_OPTIONS = ['newest', 'name', 'deadline', 'verified', 'relevance'] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];

export const DEFAULT_PAGE_SIZE = 6;
export const MAX_PAGE_SIZE = 50;

/**
 * Domains accepted as "official" for scheme and application links by default.
 * Administrators can extend this list in Settings. A host matches when it equals
 * an entry or is a subdomain of it.
 */
export const DEFAULT_OFFICIAL_DOMAINS = ['gov.in', 'nic.in'];

/** Number of days after which a verification is considered stale if no review date was set. */
export const DEFAULT_REVIEW_INTERVAL_DAYS = 90;

/** Window for "upcoming deadline" metrics and badges. */
export const UPCOMING_DEADLINE_DAYS = 30;
