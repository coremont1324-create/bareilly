import { useSearchParams } from 'react-router-dom';
import { useTitle } from '../components/Layout';
import { NoticeItem } from '../components/SchemeCards';
import { EmptyState, ErrorState, Pagination, Skeleton } from '../components/ui';
import { useI18n } from '../i18n';
import { useNotices } from '../lib/queries';

export function NoticesPage() {
  const { t } = useI18n();
  useTitle(t('notices.title'));
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get('page')) || 1);
  const q = useNotices(10, page);
  return (
    <div className="page py-8">
      <h1 className="text-2xl font-extrabold text-navy-900 sm:text-3xl">{t('notices.title')}</h1>
      <p className="mt-2 text-ink-soft">{t('notices.subtitle')}</p>
      <div className="mt-6">
        {q.isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : q.isError ? (
          <ErrorState onRetry={() => q.refetch()} />
        ) : q.data!.items.length === 0 ? (
          <EmptyState title={t('home.noNotices')} />
        ) : (
          <>
            <ul className="space-y-3">
              {q.data!.items.map((n) => (
                <NoticeItem key={n.id} notice={n} />
              ))}
            </ul>
            <Pagination page={page} totalPages={q.data!.totalPages} onChange={(p) => setParams(p > 1 ? { page: String(p) } : {})} />
          </>
        )}
      </div>
    </div>
  );
}

export function NotFoundPage() {
  const { t } = useI18n();
  useTitle(t('notFound.title'));
  return (
    <div className="page py-16">
      <EmptyState
        title={t('notFound.title')}
        text={t('notFound.text')}
        action={
          <a href="/" className="btn-primary">
            {t('notFound.home')}
          </a>
        }
      />
    </div>
  );
}
