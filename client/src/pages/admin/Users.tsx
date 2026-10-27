import { useQuery, useQueryClient } from '@tanstack/react-query';
import { KeyRound, Plus, UserCheck, UserX } from 'lucide-react';
import type { AdminUser } from '@mandal/shared';
import { useState } from 'react';
import { Navigate, useOutletContext } from 'react-router-dom';
import { ErrorState, Spinner } from '../../components/ui';
import { api, ApiError } from '../../lib/api';
import { AdminPage, type Me } from './AdminLayout';
import { Banner, Dialog, Field, formatDateTime } from './components';

export function UsersPage() {
  const me = useOutletContext<Me>();
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ['admin', 'users'], queryFn: () => api<{ items: AdminUser[] }>('/admin/users'), enabled: me.role === 'super_admin' });
  const [creating, setCreating] = useState(false);
  const [resetFor, setResetFor] = useState<AdminUser | null>(null);
  const [form, setForm] = useState({ email: '', name: '', role: 'editor', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);

  if (me.role !== 'super_admin') return <Navigate to="/admin" replace />;

  const refresh = () => qc.invalidateQueries({ queryKey: ['admin', 'users'] });

  const create = async () => {
    setErrors({});
    try {
      await api('/admin/users', { method: 'POST', body: form });
      setCreating(false);
      setForm({ email: '', name: '', role: 'editor', password: '' });
      setBanner({ tone: 'success', text: 'User created. Share the temporary password securely and ask them to change it.' });
      refresh();
    } catch (e) {
      if (e instanceof ApiError) setErrors(e.details?.fields ?? { _: e.message });
    }
  };

  const patch = async (u: AdminUser, body: Record<string, unknown>, ok: string) => {
    setBanner(null);
    try {
      await api(`/admin/users/${u.id}`, { method: 'PATCH', body });
      setBanner({ tone: 'success', text: ok });
      refresh();
      return true;
    } catch (e) {
      if (e instanceof ApiError && e.details?.fields) setErrors(e.details.fields);
      else setBanner({ tone: 'error', text: e instanceof ApiError ? e.message : 'Update failed' });
      return false;
    }
  };

  return (
    <AdminPage
      title="Users"
      actions={
        <button type="button" className="btn-primary" onClick={() => (setErrors({}), setCreating(true))}>
          <Plus className="h-4 w-4" aria-hidden="true" /> Add user
        </button>
      }
    >
      {banner && (
        <div className="mb-4">
          <Banner tone={banner.tone} onClose={() => setBanner(null)}>
            {banner.text}
          </Banner>
        </div>
      )}
      <p className="mb-4 text-sm text-ink-soft">
        <strong>Editors</strong> can manage schemes and notices. <strong>Super admins</strong> can also manage users and portal settings. Roles are enforced by the server.
      </p>
      {list.isLoading ? (
        <Spinner />
      ) : list.isError ? (
        <ErrorState onRetry={() => list.refetch()} />
      ) : (
        <div className="card overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <caption className="sr-only">Administrator accounts</caption>
            <thead className="border-b border-surface-line bg-surface-muted text-xs uppercase tracking-wide text-ink-muted">
              <tr>
                <th scope="col" className="px-4 py-3">Name</th>
                <th scope="col" className="px-4 py-3">Role</th>
                <th scope="col" className="px-4 py-3">Status</th>
                <th scope="col" className="px-4 py-3">Last sign-in</th>
                <th scope="col" className="px-4 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-line">
              {list.data!.items.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-navy-900">{u.name}</p>
                    <p className="text-xs text-ink-muted">{u.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <label className="sr-only" htmlFor={`role-${u.id}`}>
                      Role for {u.name}
                    </label>
                    <select
                      id={`role-${u.id}`}
                      className="input py-1.5"
                      value={u.role}
                      disabled={u.id === me.id}
                      onChange={(e) => patch(u, { role: e.target.value }, 'Role updated.')}
                    >
                      <option value="editor">Editor</option>
                      <option value="super_admin">Super admin</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">{u.isActive ? <span className="text-emerald-700">Active</span> : <span className="text-red-700">Deactivated</span>}</td>
                  <td className="px-4 py-3 text-xs text-ink-muted">{formatDateTime(u.lastLoginAt)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <button type="button" className="btn-ghost px-2 py-1" onClick={() => (setErrors({}), setResetFor(u))} aria-label={`Reset password for ${u.name}`}>
                      <KeyRound className="h-4 w-4" aria-hidden="true" />
                    </button>
                    {u.id !== me.id &&
                      (u.isActive ? (
                        <button type="button" className="btn-ghost px-2 py-1 text-red-700" onClick={() => patch(u, { isActive: false }, 'User deactivated and signed out.')} aria-label={`Deactivate ${u.name}`}>
                          <UserX className="h-4 w-4" aria-hidden="true" />
                        </button>
                      ) : (
                        <button type="button" className="btn-ghost px-2 py-1 text-emerald-700" onClick={() => patch(u, { isActive: true }, 'User reactivated.')} aria-label={`Reactivate ${u.name}`}>
                          <UserCheck className="h-4 w-4" aria-hidden="true" />
                        </button>
                      ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog
        open={creating}
        title="Add administrator"
        onClose={() => setCreating(false)}
        footer={
          <>
            <button type="button" className="btn-outline" onClick={() => setCreating(false)}>
              Cancel
            </button>
            <button type="button" className="btn-primary" onClick={create}>
              Create user
            </button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={(e) => (e.preventDefault(), create())} noValidate>
          {errors._ && <Banner tone="error">{errors._}</Banner>}
          <Field label="Full name" required htmlFor="u-name" error={errors.name}>
            <input id="u-name" className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Email" required htmlFor="u-email" error={errors.email}>
            <input id="u-email" type="email" className="input" autoComplete="off" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="Role" required htmlFor="u-role" error={errors.role}>
            <select id="u-role" className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="editor">Editor</option>
              <option value="super_admin">Super admin</option>
            </select>
          </Field>
          <Field label="Temporary password" required htmlFor="u-password" error={errors.password} hint="At least 12 characters with letters and numbers.">
            <input id="u-password" type="password" autoComplete="new-password" className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </Field>
        </form>
      </Dialog>

      <ResetPasswordDialog
        user={resetFor}
        error={errors.password}
        onClose={() => setResetFor(null)}
        onSubmit={async (pw) => {
          if (resetFor && (await patch(resetFor, { password: pw }, 'Password reset. The user’s existing sessions were signed out.'))) setResetFor(null);
        }}
      />
    </AdminPage>
  );
}

function ResetPasswordDialog({ user, onClose, onSubmit, error }: { user: AdminUser | null; onClose: () => void; onSubmit: (pw: string) => void; error?: string }) {
  const [pw, setPw] = useState('');
  return (
    <Dialog
      open={Boolean(user)}
      title={`Reset password${user ? ` — ${user.name}` : ''}`}
      onClose={() => (setPw(''), onClose())}
      footer={
        <button type="button" className="btn-primary" onClick={() => onSubmit(pw)}>
          Set password
        </button>
      }
    >
      <Field label="New password" required htmlFor="reset-pw" error={error} hint="At least 12 characters with letters and numbers.">
        <input id="reset-pw" type="password" autoComplete="new-password" className="input" value={pw} onChange={(e) => setPw(e.target.value)} />
      </Field>
    </Dialog>
  );
}
