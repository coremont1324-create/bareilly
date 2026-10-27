import { describe, expect, it } from 'vitest';
import {
  checkOfficialLink,
  compactText,
  effectiveStatus,
  evaluateChecklist,
  normalizeQuery,
  schemeInputSchema,
  slugify,
  tokenize,
  verificationState,
  type ChecklistInput,
} from '../src';

const complete: ChecklistInput = {
  name: 'PM-KISAN Samman Nidhi',
  shortDescription: 'Income support to eligible landholding farmer families.',
  categoryId: 1,
  departmentId: 1,
  eligibility: ['Landholding farmer families'],
  benefits: ['Rs 6,000 per year'],
  requiredDocuments: ['Aadhaar'],
  applicationSteps: ['Register on the portal'],
  applicationStatus: 'year_round',
  deadline: null,
  officialUrl: 'https://pmkisan.gov.in',
  applicationUrl: null,
  helpPhone: null,
  helpEmail: null,
  helpNotes: 'Raise a grievance on the official portal',
  availableAllMandals: true,
  mandalIds: [],
  tbcFields: [],
  verificationSource: 'Official guidelines',
  lastVerifiedOn: '2026-10-01',
};

describe('text helpers', () => {
  it('normalizes case and whitespace', () => {
    expect(normalizeQuery('  PM    Kisan ')).toBe('pm kisan');
  });
  it('compacts punctuation and spacing so variants compare equal', () => {
    expect(compactText('PM-KISAN')).toBe(compactText('pm kisan'));
    expect(compactText('PMKisan')).toBe('pmkisan');
  });
  it('tokenizes', () => {
    expect(tokenize('Post-matric  scholarship')).toEqual(['post', 'matric', 'scholarship']);
  });
  it('slugifies', () => {
    expect(slugify('PM-KISAN Samman Nidhi!')).toBe('pm-kisan-samman-nidhi');
    expect(slugify('***')).toBe('scheme');
  });
});

describe('official link checks', () => {
  it('accepts https gov.in and subdomains', () => {
    expect(checkOfficialLink('https://pmkisan.gov.in/').ok).toBe(true);
    expect(checkOfficialLink('https://pmayg.nic.in/x').ok).toBe(true);
  });
  it('rejects http, other domains, look-alikes and garbage', () => {
    expect(checkOfficialLink('http://pmkisan.gov.in')).toEqual({ ok: false, reason: 'not_https' });
    expect(checkOfficialLink('https://pmkisan-gov.in.example.com')).toEqual({ ok: false, reason: 'not_official_domain' });
    expect(checkOfficialLink('https://evilgov.in')).toEqual({ ok: false, reason: 'not_official_domain' });
    expect(checkOfficialLink('javascript:alert(1)')).toEqual({ ok: false, reason: 'not_https' });
    expect(checkOfficialLink('not a url')).toEqual({ ok: false, reason: 'invalid' });
    expect(checkOfficialLink('')).toEqual({ ok: false, reason: 'empty' });
  });
  it('honours a custom allowlist', () => {
    expect(checkOfficialLink('https://example.org', ['example.org']).ok).toBe(true);
  });
});

describe('status helpers', () => {
  it('shows an open scheme with a past deadline as closed', () => {
    expect(effectiveStatus('open', '2026-01-01', '2026-02-01')).toBe('closed');
    expect(effectiveStatus('open', '2026-03-01', '2026-02-01')).toBe('open');
    expect(effectiveStatus('year_round', null)).toBe('year_round');
  });
  it('derives verification state', () => {
    expect(verificationState(null, null)).toBe('unverified');
    expect(verificationState('2026-01-01', '2026-02-01', '2026-03-01')).toBe('review_due');
    expect(verificationState('2026-01-01', '2026-12-01', '2026-03-01')).toBe('verified');
  });
});

describe('publishing checklist', () => {
  it('allows a complete scheme', () => {
    const r = evaluateChecklist(complete, undefined, '2026-10-27');
    expect(r.canPublish).toBe(true);
    expect(r.missing).toHaveLength(0);
  });
  it('blocks a scheme missing required details', () => {
    const r = evaluateChecklist({ ...complete, eligibility: [], verificationSource: '', lastVerifiedOn: null }, undefined, '2026-10-27');
    expect(r.canPublish).toBe(false);
    expect(r.missing.map((m) => m.key).sort()).toEqual(['eligibility', 'last_verified', 'verification_source']);
  });
  it('accepts explicit To be confirmed flags', () => {
    const r = evaluateChecklist({ ...complete, requiredDocuments: [], tbcFields: ['required_documents'] }, undefined, '2026-10-27');
    expect(r.canPublish).toBe(true);
    expect(r.tbc.map((t) => t.key)).toEqual(['required_documents']);
  });
  it('requires a deadline (or TBC) for open schemes', () => {
    expect(evaluateChecklist({ ...complete, applicationStatus: 'open' }, undefined, '2026-10-27').canPublish).toBe(false);
    expect(evaluateChecklist({ ...complete, applicationStatus: 'open', deadline: '2026-12-31' }, undefined, '2026-10-27').canPublish).toBe(true);
  });
  it('rejects non-official links and future verification dates', () => {
    expect(evaluateChecklist({ ...complete, officialUrl: 'https://example.com' }, undefined, '2026-10-27').canPublish).toBe(false);
    expect(evaluateChecklist({ ...complete, lastVerifiedOn: '2027-01-01' }, undefined, '2026-10-27').canPublish).toBe(false);
  });
});

describe('scheme input schema', () => {
  it('rejects javascript URLs and bad dates', () => {
    expect(schemeInputSchema.safeParse({ name: 'Test scheme', officialUrl: 'javascript:alert(1)' }).success).toBe(false);
    expect(schemeInputSchema.safeParse({ name: 'Test scheme', deadline: '2026-02-30' }).success).toBe(false);
  });
  it('cleans list fields and applies defaults', () => {
    const r = schemeInputSchema.parse({ name: 'Test scheme', eligibility: [' a ', '', '  '] });
    expect(r.eligibility).toEqual(['a']);
    expect(r.applicationStatus).toBe('tbc');
    expect(r.officialUrl).toBeNull();
  });
});
