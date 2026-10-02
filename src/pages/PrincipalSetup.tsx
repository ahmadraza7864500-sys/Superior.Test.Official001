import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context';
import * as api from '../api';
import { ThemeToggle, Logo, Card } from '../components';
import { ArrowLeft, Shield } from 'lucide-react';

export default function PrincipalSetup() {
  const { setupPrincipal } = useApp();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [exists, setExists] = useState(false);
  const [form, setForm] = useState({ full_name: '', email: '', username: '', password: '', confirmPassword: '' });

  useEffect(() => { (async () => { const principals = await api.getUsersByRole('principal'); if (principals.length > 0) setExists(true); })(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError('');
    if (form.password !== form.confirmPassword) { setError('Passwords do not match.'); setLoading(false); return; }
    if (form.password.length < 8) { setError('Password must be 8+ characters.'); setLoading(false); return; }
    const result = await setupPrincipal(form);
    if (result.success) navigate('/staff/login'); else setError(result.message);
    setLoading(false);
  };

  if (exists) return (
    <div className="min-h-screen bg-theme-secondary flex items-center justify-center p-4">
      <Card className="p-8 max-w-md text-center">
        <Shield className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-theme-primary mb-2">Principal Account Exists</h2>
        <p className="text-theme-secondary mb-6">Use the staff login to access your account.</p>
        <Link to="/staff/login" className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium">Go to Staff Login</Link>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-theme-secondary py-8 px-4">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Link to="/" className="inline-flex items-center text-theme-secondary text-sm"><ArrowLeft className="w-4 h-4 mr-1" /> Back</Link>
          <ThemeToggle />
        </div>
        <Card className="p-8">
          <div className="text-center mb-6">
            <Logo size="lg" />
            <h2 className="text-2xl font-bold text-theme-primary mt-4">Principal Setup</h2>
            <p className="text-theme-secondary mt-1">Create the initial administrator account</p>
          </div>
          {error && <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <input type="text" placeholder="Full Name" value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} className="w-full px-4 py-2.5 border border-theme rounded-xl" required />
            <input type="email" placeholder="Email Address" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full px-4 py-2.5 border border-theme rounded-xl" required />
            <input type="text" placeholder="Username" value={form.username} onChange={e => setForm({...form, username: e.target.value})} className="w-full px-4 py-2.5 border border-theme rounded-xl" required />
            <input type="password" placeholder="Password (min 8 chars)" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="w-full px-4 py-2.5 border border-theme rounded-xl" required />
            <input type="password" placeholder="Confirm Password" value={form.confirmPassword} onChange={e => setForm({...form, confirmPassword: e.target.value})} className="w-full px-4 py-2.5 border border-theme rounded-xl" required />
            <button type="submit" disabled={loading} className="w-full py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium disabled:opacity-50 mt-4">
              {loading ? 'Creating...' : 'Create Principal Account'}</button>
          </form>
        </Card>
      </div>
    </div>
  );
}
