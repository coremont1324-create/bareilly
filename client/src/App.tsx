import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createBrowserRouter, isRouteErrorResponse, Link, RouterProvider, useRouteError } from 'react-router-dom';
import { PublicLayout } from './components/Layout';
import { I18nProvider } from './i18n';
import { PrefsProvider } from './lib/prefs';
import { HelpPage } from './pages/Help';
import { HomePage } from './pages/Home';
import { NoticesPage, NotFoundPage } from './pages/Notices';
import { SchemeDetailPage } from './pages/SchemeDetail';
import { SchemesPage } from './pages/Schemes';
import { AdminLayout } from './pages/admin/AdminLayout';
import { ChecklistGuidePage } from './pages/admin/ChecklistGuide';
import { DashboardPage } from './pages/admin/Dashboard';
import { LoginPage } from './pages/admin/Login';
import { NoticesAdminPage } from './pages/admin/Notices';
import { SchemeEditorPage } from './pages/admin/SchemeEditor';
import { SchemePreviewPage } from './pages/admin/SchemePreview';
import { SchemesListPage } from './pages/admin/SchemesList';
import { SettingsPage } from './pages/admin/Settings';
import { UsersPage } from './pages/admin/Users';

function RouteError() {
  const err = useRouteError();
  const message = isRouteErrorResponse(err) ? `${err.status} ${err.statusText}` : 'An unexpected error occurred.';
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-bold text-navy-900">Something went wrong</h1>
      <p className="text-ink-soft">{message}</p>
      <Link to="/" className="btn-primary">
        Go to Home
      </Link>
    </div>
  );
}

export const routes = [
  {
    element: <PublicLayout />,
    errorElement: <RouteError />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/schemes', element: <SchemesPage /> },
      { path: '/schemes/:slug', element: <SchemeDetailPage /> },
      { path: '/notices', element: <NoticesPage /> },
      { path: '/help', element: <HelpPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  { path: '/admin/login', element: <LoginPage />, errorElement: <RouteError /> },
  {
    path: '/admin',
    element: <AdminLayout />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'schemes', element: <SchemesListPage /> },
      { path: 'schemes/new', element: <SchemeEditorPage /> },
      { path: 'schemes/:id', element: <SchemeEditorPage /> },
      { path: 'schemes/:id/preview', element: <SchemePreviewPage /> },
      { path: 'notices', element: <NoticesAdminPage /> },
      { path: 'users', element: <UsersPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'checklist', element: <ChecklistGuidePage /> },
    ],
  },
];

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { refetchOnWindowFocus: false, retry: 1, staleTime: 15_000 },
    },
  });
}

const router = createBrowserRouter(routes);
const queryClient = createQueryClient();

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <PrefsProvider>
          <RouterProvider router={router} />
        </PrefsProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}
