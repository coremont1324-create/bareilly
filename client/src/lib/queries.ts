import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { MandalOffice, MetaResponse, NoticeSummary, Paginated, SchemeDetail, SchemeSummary } from '@mandal/shared';
import { api } from './api';

export interface SchemeListResponse extends Paginated<SchemeSummary> {
  facets: { categories: Record<string, number>; all: number };
}

export interface SchemeFilters {
  q?: string;
  category?: string;
  department?: string;
  group?: string;
  status?: string;
  mandal?: string;
  availableOnly?: boolean;
  sort?: string;
  page?: number;
  pageSize?: number;
}

export const useMeta = () =>
  useQuery({ queryKey: ['meta'], queryFn: () => api<MetaResponse>('/meta'), staleTime: 5 * 60 * 1000 });

export const useSchemes = (filters: SchemeFilters) =>
  useQuery({
    queryKey: ['schemes', filters],
    queryFn: ({ signal }) => api<SchemeListResponse>('/schemes', { query: { ...filters }, signal }),
    placeholderData: keepPreviousData,
  });

export const useFeatured = (mandal?: string) =>
  useQuery({
    queryKey: ['featured', mandal],
    queryFn: () => api<{ items: SchemeSummary[] }>('/schemes/featured', { query: { mandal, limit: 3 } }),
  });

export const useScheme = (slug: string, mandal?: string) =>
  useQuery({
    queryKey: ['scheme', slug, mandal],
    queryFn: () => api<SchemeDetail>(`/schemes/${encodeURIComponent(slug)}`, { query: { mandal } }),
    retry: (count, err) => (err as { status?: number }).status !== 404 && count < 2,
  });

export const useNotices = (limit = 3, page = 1) =>
  useQuery({
    queryKey: ['notices', limit, page],
    queryFn: () => api<Paginated<NoticeSummary>>('/notices', { query: { limit, page } }),
    placeholderData: keepPreviousData,
  });

export const useOffice = (mandal?: string) =>
  useQuery({
    queryKey: ['office', mandal],
    queryFn: () => api<{ office: MandalOffice | null }>(`/offices/${mandal}`),
    enabled: Boolean(mandal),
  });
