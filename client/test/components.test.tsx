import { render, screen } from '@testing-library/react';
import type { SchemeSummary } from '@mandal/shared';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { SchemeCard, SchemeListCard } from '../src/components/SchemeCards';
import { StatusBadge } from '../src/components/ui';
import { I18nProvider, translate, type Language } from '../src/i18n';
import { en } from '../src/i18n/en';
import { hi } from '../src/i18n/hi';
import { te } from '../src/i18n/te';

const base: SchemeSummary = {
  id: '1',
  slug: 'test-scheme',
  name: 'Test Scheme',
  shortDescription: 'A test scheme description.',
  category: { slug: 'agriculture', name: 'Agriculture', icon: 'sprout', color: 'green' },
  department: 'Test Department',
  targetGroup: 'Farmers',
  eligibilitySummary: 'Farmers with land',
  benefitsSummary: '₹100',
  applicationStatus: 'open',
  deadline: '2099-12-31',
  deadlineTbc: false,
  applicationLink: { url: 'https://example.gov.in/apply', host: 'example.gov.in' },
  officialLink: { url: 'https://example.gov.in/', host: 'example.gov.in' },
  lastVerifiedOn: '2026-10-01',
  isDemo: false,
  isFeatured: false,
  updatedAt: '2026-10-01T00:00:00Z',
};

function renderWith(ui: React.ReactNode, lang: Language = 'en') {
  return render(
    <MemoryRouter>
      <I18nProvider initial={lang}>{ui}</I18nProvider>
    </MemoryRouter>,
  );
}

describe('SchemeListCard', () => {
  it('shows apply button for a verified application link, opening safely in a new tab', () => {
    renderWith(<SchemeListCard scheme={base} />);
    const link = screen.getByRole('link', { name: /Apply on official site/ });
    expect(link).toHaveAttribute('href', 'https://example.gov.in/apply');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
    expect(screen.getByText(/31 Dec 2099/)).toBeInTheDocument();
  });

  it('never fabricates an apply link when only the official site is verified', () => {
    renderWith(<SchemeListCard scheme={{ ...base, applicationLink: null }} />);
    expect(screen.queryByRole('link', { name: /Apply on official site/ })).toBeNull();
    expect(screen.getByRole('link', { name: /Visit official website/ })).toBeInTheDocument();
    expect(screen.getByText('Application link to be confirmed')).toBeInTheDocument();
  });

  it('shows "Official link to be confirmed" when no link is verified', () => {
    renderWith(<SchemeListCard scheme={{ ...base, applicationLink: null, officialLink: null }} />);
    expect(screen.getByText('Official link to be confirmed')).toBeInTheDocument();
    expect(screen.queryAllByRole('link').every((a) => a.getAttribute('href')?.startsWith('/'))).toBe(true);
  });

  it('labels unconfirmed deadlines instead of showing a date', () => {
    renderWith(<SchemeListCard scheme={{ ...base, applicationStatus: 'tbc', deadline: null, deadlineTbc: true }} />);
    expect(screen.getAllByText('To be confirmed').length).toBeGreaterThan(0);
    expect(screen.queryByText(/2099/)).toBeNull();
  });

  it('refuses to render non-https links even if they slip through', () => {
    renderWith(<SchemeListCard scheme={{ ...base, applicationLink: { url: 'javascript:alert(1)', host: 'x' } }} />);
    expect(screen.queryByRole('link', { name: /Apply on official site/ })).toBeNull();
  });
});

describe('SchemeCard (reference panel 6)', () => {
  it('renders for/benefit/deadline and demo-safe actions', () => {
    renderWith(<SchemeCard scheme={{ ...base, applicationStatus: 'year_round', deadline: null }} />);
    expect(screen.getByText('Farmers')).toBeInTheDocument();
    expect(screen.getByText('₹100')).toBeInTheDocument();
    expect(screen.getAllByText('Year-round').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: /View details/ })).toHaveAttribute('href', '/schemes/test-scheme');
  });
});

describe('StatusBadge', () => {
  it.each([
    ['open', 'Open'],
    ['closed', 'Closed'],
    ['year_round', 'Year-round'],
    ['tbc', 'To be confirmed'],
  ] as const)('%s → %s', (status, label) => {
    renderWith(<StatusBadge status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('is translated', () => {
    renderWith(<StatusBadge status="open" />, 'hi');
    expect(screen.getByText('खुला')).toBeInTheDocument();
  });
});

describe('translations', () => {
  it('provide every English key in Hindi and Telugu', () => {
    const keys = Object.keys(en);
    expect(keys.filter((k) => !(k in hi))).toEqual([]);
    expect(keys.filter((k) => !(k in te))).toEqual([]);
  });
  it('interpolate variables', () => {
    expect(translate('en', 'schemes.results', { count: 5 })).toBe('5 schemes found');
    expect(translate('te', 'schemes.results', { count: 5 })).toBe('5 పథకాలు కనుగొనబడ్డాయి');
  });
});
