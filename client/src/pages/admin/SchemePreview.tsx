import { useQuery } from '@tanstack/react-query';
import { Eye, Pencil } from 'lucide-react';
import type { PublicationStatus, SchemeDetail } from '@mandal/shared';
import { Link, useParams } from 'react-router-dom';
import { ErrorState, Spinner } from '../../components/ui';
import { api } from '../../lib/api';
import { SchemeDetailView } from '../SchemeDetail';
import { PubBadge } from './components';

/** Shows exactly what citizens will see, for drafts and archived schemes too. */
export function SchemePreviewPage() {
  const { id = '' } = useParams();
  const q = useQuery({
    queryKey: ['admin', 'scheme', id, 'preview'],
    queryFn: () => api<SchemeDetail & { publicationStatus: PublicationStatus }>(`/admin/schemes/${id}/preview`),
  });
  if (q.isLoading) return <Spinner />;
  if (q.isError) return <ErrorState onRetry={() => q.refetch()} />;
  return (
    <div>
      <div className="sticky top-0 z-30 flex flex-wrap items-center gap-3 border-b border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <Eye className="h-4 w-4" aria-hidden="true" />
        <strong>Preview</strong> — this is how citizens will see the scheme.
        <PubBadge status={q.data!.publicationStatus} />
        {q.data!.publicationStatus !== 'published' && <span>It is not visible to the public yet.</span>}
        <Link to={`/admin/schemes/${id}`} className="btn-outline ml-auto py-1.5">
          <Pencil className="h-4 w-4" aria-hidden="true" /> Back to editor
        </Link>
      </div>
      <SchemeDetailView scheme={q.data!} preview />
    </div>
  );
}
