import { useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { ClipboardCheck, ExternalLink, LayoutDashboard, LogOut, Megaphone, Menu, Settings, UserRound, Users, X, FileStack } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LogoMark } from '../../components/Logo';
import { Spinner } from '../../components/ui';
import { api, ApiError } from '../../lib/api';

export interface Me {
  id: string;
  email: string;
  name: string;
  role: 'super_admin' | 'editor';
}

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      try {
        return (await api<{ user: Me }>('/auth/me')).user;
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) return null;
        throw e;
      }
    },
    staleTime: 60_000,
    retry: false,
  });
}

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/schemes', label: 'Schemes', icon: FileStack, end: false },
  { to: '/admin/notices', label: 'Notices', icon: Megaphone, end: false },
  { to: '/admin/users', label: 'Users', icon: Users, end: false, superOnly: true },
  { to: '/admin/settings', label: 'Settings', icon: Settings, end: false },
  { to: '/admin/checklist', label: 'Card & checklist', icon: ClipboardCheck, end: false },
];

export function AdminLayout() {
  const me = useMe();
  const location = useLocation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    document.title = 'Admin | Mandal Schemes Portal';
  }, [location.pathname]);

  if (me.isLoading) return <Spinner className="min-h-screen" />;
  if (!me.data) return <Navigate to={`/admin/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;

  const logout = async () => {
    await api('/auth/logout', { method: 'POST' }).catch(() => undefined);
    qc.clear();
    navigate('/admin/login', { replace: true });
  };

  const nav = (
    <nav aria-label="Admin" className="flex flex-col gap-1 px-3">
      {NAV.filter((n) => !n.superOnly || me.data!.role === 'super_admin').map((n) => (
        <NavLink
          key={n.to}
          to={n.to}
          end={n.end}
          className={({ isActive }) =>
            clsx('flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium', isActive ? 'bg-ocean-700 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white')
          }
        >
          <n.icon className="h-5 w-5" aria-hidden="true" />
          {n.label}
        </NavLink>
      ))}
      <Link to="/" className="mt-4 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/70 hover:bg-white/10 hover:text-white">
        <ExternalLink className="h-5 w-5" aria-hidden="true" />
        View public site
      </Link>
    </nav>
  );

  const userCard = (
    <div className="m-3 flex items-center gap-3 rounded-xl bg-white/5 p-3">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/15">
        <UserRound className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{me.data.name}</p>
        <p className="truncate text-xs text-white/70">{me.data.role === 'super_admin' ? 'Super admin' : 'Editor'}</p>
      </div>
      <button type="button" onClick={logout} className="rounded-lg p-2 text-white/80 hover:bg-white/10" aria-label="Sign out">
        <LogOut className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-surface lg:grid lg:grid-cols-[15.5rem_1fr] lg:bg-[linear-gradient(to_right,#0a2342_15.5rem,#f2f6fb_15.5rem)]">
      <a href="#admin-main" className="sr-only z-50 rounded bg-amber-300 px-3 py-2 focus:not-sr-only focus:absolute focus:left-3 focus:top-3">
        Skip to content
      </a>
      <aside className="hidden flex-col self-start bg-navy-900 text-white lg:sticky lg:top-0 lg:flex lg:h-screen">
        <div className="flex items-center gap-3 px-5 py-5">
          <LogoMark className="h-9 w-9" />
          <span className="text-sm font-bold leading-tight">Mandal Schemes Portal</span>
        </div>
        <div className="flex-1 overflow-y-auto">{nav}</div>
        {userCard}
      </aside>

      <div className="flex min-w-0 flex-col">
        <div className="flex items-center gap-3 bg-navy-900 px-4 py-3 text-white lg:hidden">
          <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="admin-mobile-nav" aria-label={open ? 'Close menu' : 'Open menu'} className="rounded-lg p-2 hover:bg-white/10">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <LogoMark className="h-8 w-8" />
          <span className="text-sm font-bold">Admin</span>
        </div>
        {open && (
          <div id="admin-mobile-nav" className="bg-navy-900 pb-2 text-white lg:hidden">
            {nav}
            {userCard}
          </div>
        )}
        <main id="admin-main" tabIndex={-1} className="flex-1 focus:outline-none">
          <Outlet context={me.data} />
        </main>
      </div>
    </div>
  );
}

export function AdminPage({ title, actions, children }: { title: string; actions?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-navy-900 sm:text-2xl">{title}</h1>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}
