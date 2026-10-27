import type { AdminRole, ApplicationStatus, PublicationStatus, TbcField } from './constants';
import type { ChecklistResult } from './checklist';

export interface Category {
  id: number;
  slug: string;
  name: string;
  icon: string;
  color: string;
  count?: number;
}

export interface Department {
  id: number;
  name: string;
  level: string;
}

export interface BeneficiaryGroup {
  id: number;
  slug: string;
  name: string;
}

export interface MandalOption {
  id: number;
  slug: string;
  name: string;
  district: string;
  state: string;
}

export interface PublicLink {
  url: string;
  host: string;
}

export interface SchemeSummary {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  category: Pick<Category, 'slug' | 'name' | 'icon' | 'color'> | null;
  department: string | null;
  targetGroup: string;
  eligibilitySummary: string;
  benefitsSummary: string;
  applicationStatus: ApplicationStatus;
  deadline: string | null;
  deadlineTbc: boolean;
  applicationLink: PublicLink | null;
  officialLink: PublicLink | null;
  lastVerifiedOn: string | null;
  isDemo: boolean;
  isFeatured: boolean;
  updatedAt: string;
}

export interface SchemeDetail extends SchemeSummary {
  overview: string;
  eligibility: string[];
  benefits: string[];
  requiredDocuments: string[];
  applicationSteps: string[];
  guidelinesLink: PublicLink | null;
  helpPhone: string | null;
  helpEmail: string | null;
  helpNotes: string;
  availableAllMandals: boolean;
  mandals: { slug: string; name: string; district: string }[];
  beneficiaryGroups: BeneficiaryGroup[];
  tbcFields: TbcField[];
  verificationSource: string;
  verificationSourceUrl: string | null;
  reviewDueOn: string | null;
  publishedAt: string | null;
  createdAt: string;
  availableInMandal?: boolean | null;
  notices: NoticeSummary[];
}

export interface NoticeSummary {
  id: string;
  title: string;
  summary: string;
  publishedOn: string;
  deadline: string | null;
  officialLink: PublicLink | null;
  scheme: { slug: string; name: string } | null;
  isDemo: boolean;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface AdminScheme {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  overview: string;
  keywords: string;
  categoryId: number | null;
  departmentId: number | null;
  targetGroup: string;
  eligibilitySummary: string;
  benefitsSummary: string;
  eligibility: string[];
  benefits: string[];
  requiredDocuments: string[];
  applicationSteps: string[];
  applicationStatus: ApplicationStatus;
  deadline: string | null;
  officialUrl: string | null;
  applicationUrl: string | null;
  guidelinesUrl: string | null;
  helpPhone: string | null;
  helpEmail: string | null;
  helpNotes: string;
  availableAllMandals: boolean;
  mandalIds: number[];
  beneficiaryGroupIds: number[];
  tbcFields: TbcField[];
  verificationSource: string;
  verificationSourceUrl: string | null;
  lastVerifiedOn: string | null;
  reviewDueOn: string | null;
  notes: string;
  isFeatured: boolean;
  isDemo: boolean;
  publicationStatus: PublicationStatus;
  publishedAt: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  createdBy: { id: string; name: string } | null;
  updatedBy: { id: string; name: string } | null;
  categoryName?: string | null;
  departmentName?: string | null;
  checklist?: ChecklistResult;
}

export interface AdminNotice {
  id: string;
  title: string;
  summary: string;
  publishedOn: string;
  deadline: string | null;
  schemeId: string | null;
  schemeName: string | null;
  officialUrl: string | null;
  isDemo: boolean;
  publicationStatus: PublicationStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
}

export interface AuditEntry {
  id: number;
  entityType: string;
  entityId: string;
  action: string;
  actorName: string | null;
  actorEmail: string | null;
  changes: Record<string, unknown> | null;
  createdAt: string;
}

export interface VerificationRecord {
  id: number;
  source: string;
  sourceUrl: string | null;
  verifiedOn: string;
  verifiedBy: string | null;
  notes: string;
  createdAt: string;
}

export interface DashboardMetrics {
  totals: {
    total: number;
    published: number;
    draft: number;
    archived: number;
    upcomingDeadlines: number;
    awaitingVerification: number;
    publishedNotices: number;
  };
  upcoming: { id: string; name: string; deadline: string }[];
  awaiting: { id: string; name: string; reason: string; publicationStatus: PublicationStatus }[];
  recentActivity: AuditEntry[];
}

export interface PublicHelpdesk {
  phone: string | null;
  email: string | null;
  hours: string;
  supportUrl: string | null;
}

export interface MetaResponse {
  categories: Category[];
  departments: Department[];
  beneficiaryGroups: BeneficiaryGroup[];
  mandals: MandalOption[];
  defaultMandalSlug: string | null;
  helpdesk: PublicHelpdesk | null;
}

export interface MandalOffice {
  mandalId: number;
  mandalName: string;
  officeName: string;
  address: string;
  phone: string | null;
  email: string | null;
  hours: string;
  isVerified: boolean;
  source: string;
  updatedAt: string | null;
}
