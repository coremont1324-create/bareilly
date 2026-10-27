import { z } from 'zod';
import { ADMIN_ROLES, APPLICATION_STATUSES, MAX_PAGE_SIZE, SORT_OPTIONS, TBC_FIELDS } from './constants';

const trimmed = (max: number) => z.string().trim().max(max);

export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the format YYYY-MM-DD')
  .refine((v) => {
    const d = new Date(`${v}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
  }, 'Not a valid calendar date');

const optionalDate = z.union([isoDate, z.literal(''), z.null()]).optional().transform((v) => (v ? v : null));

/** Accept only http(s) URLs so javascript:/data: links can never be stored. */
const optionalUrl = z
  .union([z.string().trim().max(500), z.null()])
  .optional()
  .transform((v) => (v ? v : null))
  .refine((v) => {
    if (v === null) return true;
    try {
      const u = new URL(v);
      return u.protocol === 'https:' || u.protocol === 'http:';
    } catch {
      return false;
    }
  }, 'Enter a complete URL starting with https://');

const listField = z
  .array(trimmed(600))
  .max(50, 'Too many items')
  .optional()
  .default([])
  .transform((items) => items.map((s) => s.trim()).filter((s) => s.length > 0));

const phone = z
  .union([z.string().trim().max(40), z.null()])
  .optional()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || /^[0-9+()\-\s/]{3,40}$/.test(v), 'Phone may contain digits, spaces, + - ( ) /');

const email = z
  .union([z.string().trim().max(200), z.null()])
  .optional()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || z.string().email().safeParse(v).success, 'Enter a valid email address');

const idList = z.array(z.number().int().positive()).max(500).optional().default([]);

export const schemeInputSchema = z.object({
  name: trimmed(160).min(3, 'Scheme name must be at least 3 characters'),
  shortDescription: trimmed(400).optional().default(''),
  overview: trimmed(5000).optional().default(''),
  keywords: trimmed(300).optional().default(''),
  categoryId: z.number().int().positive().nullable().optional().default(null),
  departmentId: z.number().int().positive().nullable().optional().default(null),
  targetGroup: trimmed(160).optional().default(''),
  eligibilitySummary: trimmed(300).optional().default(''),
  benefitsSummary: trimmed(300).optional().default(''),
  eligibility: listField,
  benefits: listField,
  requiredDocuments: listField,
  applicationSteps: listField,
  applicationStatus: z.enum(APPLICATION_STATUSES).optional().default('tbc'),
  deadline: optionalDate,
  officialUrl: optionalUrl,
  applicationUrl: optionalUrl,
  guidelinesUrl: optionalUrl,
  helpPhone: phone,
  helpEmail: email,
  helpNotes: trimmed(1000).optional().default(''),
  availableAllMandals: z.boolean().optional().default(false),
  mandalIds: idList,
  beneficiaryGroupIds: idList,
  tbcFields: z
    .array(z.enum(TBC_FIELDS))
    .optional()
    .default([])
    .transform((v) => Array.from(new Set(v))),
  verificationSource: trimmed(300).optional().default(''),
  verificationSourceUrl: optionalUrl,
  lastVerifiedOn: optionalDate,
  reviewDueOn: optionalDate,
  notes: trimmed(5000).optional().default(''),
  isFeatured: z.boolean().optional().default(false),
  isDemo: z.boolean().optional().default(false),
});
export type SchemeInput = z.infer<typeof schemeInputSchema>;
export type SchemeInputRaw = z.input<typeof schemeInputSchema>;

export const schemeUpdateSchema = schemeInputSchema.extend({
  version: z.number().int().positive(),
});

export const lifecycleSchema = z.object({
  version: z.number().int().positive(),
  acknowledgeTbc: z.boolean().optional().default(false),
});

export const schemeQuerySchema = z.object({
  q: z.string().max(120).optional().default(''),
  category: z.string().max(60).optional().default(''),
  department: z.coerce.number().int().positive().optional(),
  group: z.string().max(60).optional().default(''),
  status: z.union([z.enum(APPLICATION_STATUSES), z.literal('')]).optional().default(''),
  mandal: z.string().max(80).optional().default(''),
  availableOnly: z
    .union([z.literal('1'), z.literal('0'), z.literal('true'), z.literal('false'), z.literal('')])
    .optional()
    .transform((v) => v === '1' || v === 'true'),
  sort: z.union([z.enum(SORT_OPTIONS), z.literal('')]).optional().default(''),
  page: z.coerce.number().int().min(1).max(10000).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).optional(),
});
export type SchemeQuery = z.infer<typeof schemeQuerySchema>;

export const noticeInputSchema = z.object({
  title: trimmed(200).min(5, 'Title must be at least 5 characters'),
  summary: trimmed(600).optional().default(''),
  publishedOn: isoDate,
  deadline: optionalDate,
  schemeId: z.string().uuid().nullable().optional().default(null),
  officialUrl: optionalUrl,
  isDemo: z.boolean().optional().default(false),
});
export type NoticeInput = z.infer<typeof noticeInputSchema>;
export const noticeUpdateSchema = noticeInputSchema.extend({ version: z.number().int().positive() });

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(1).max(200),
});

export const passwordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters')
  .max(200)
  .refine((p) => /[A-Za-z]/.test(p) && /[0-9]/.test(p), 'Password must contain letters and numbers');

export const userCreateSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  name: trimmed(120).min(2),
  role: z.enum(ADMIN_ROLES),
  password: passwordSchema,
});

export const userUpdateSchema = z.object({
  name: trimmed(120).min(2).optional(),
  role: z.enum(ADMIN_ROLES).optional(),
  isActive: z.boolean().optional(),
  password: passwordSchema.optional(),
});

export const helpdeskSchema = z.object({
  phone: phone,
  email: email,
  hours: trimmed(120).optional().default(''),
  supportUrl: optionalUrl,
  verified: z.boolean().optional().default(false),
});
export type Helpdesk = z.infer<typeof helpdeskSchema>;

export const settingsSchema = z.object({
  helpdesk: helpdeskSchema,
  officialDomains: z
    .array(
      z
        .string()
        .trim()
        .toLowerCase()
        .regex(/^[a-z0-9.-]+\.[a-z]{2,}$/, 'Enter a domain such as gov.in'),
    )
    .min(1, 'At least one official domain is required')
    .max(50),
  defaultMandalSlug: z.string().max(80).nullable().optional().default(null),
});
export type PortalSettings = z.infer<typeof settingsSchema>;

export const officeSchema = z.object({
  officeName: trimmed(200).min(3),
  address: trimmed(500).optional().default(''),
  phone: phone,
  email: email,
  hours: trimmed(120).optional().default(''),
  isVerified: z.boolean().optional().default(false),
  source: trimmed(300).optional().default(''),
});
export type OfficeInput = z.infer<typeof officeSchema>;
