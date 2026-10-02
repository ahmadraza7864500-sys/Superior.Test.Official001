import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context';
import { getUserByUsername, createOTP } from '../api';
import { ThemeToggle, Logo, Card } from '../components';
import { ArrowLeft, User, Lock, Shield } from 'lucide-react';

export default function StaffLogin() {
  const { staffLogin } = useApp();
  const navigate = useNavigate();
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [generatedOTP, setGeneratedOTP] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError('');
    const user = await getUserByUsername(username);
    if (!user) { setError('Invalid username or password.'); setLoading(false); return; }
    const otpResult = await createOTP(user.email);
    setGeneratedOTP(otpResult);
    setStep('otp');
    setLoading(false);
  };

  const handleOTPSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError('');
    const result = await staffLogin(username, password, otp);
    if (result.success) {
      const user = await getUserByUsername(username);
      if (user?.role === 'principal') navigate('/principal');
      else navigate('/teacher');
    } else setError(result.message);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-theme-secondary flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="flex items-center justify-between mb-6">
          <Link to="/" className="inline-flex items-center text-theme-secondary hover:text-theme-primary text-sm"><ArrowLeft className="w-4 h-4 mr-1" /> Back</Link>
          <ThemeToggle />
        </div>
        <Card className="p-8">
          <div className="text-center mb-6">
            <Logo size="lg" />
            <h2 className="text-2xl font-bold text-theme-primary mt-4">Staff Login</h2>
            <p className="text-theme-secondary mt-1">For Teachers and Principals</p>
          </div>
          {error && <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">{error}</div>}
          {step === 'credentials' ? (
            <form onSubmit={handleCredentials} className="space-y-4">
              <div><label className="block text-sm font-medium text-theme-secondary mb-1">Username</label>
                <div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-muted" />
                  <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full pl-10 pr-4 py-3 border border-theme rounded-xl" required /></div></div>
              <div><label className="block text-sm font-medium text-theme-secondary mb-1">Password</label>
                <div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-muted" />
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full pl-10 pr-4 py-3 border border-theme rounded-xl" required /></div></div>
              <button type="submit" disabled={loading} className="w-full py-3 bg-gray-900 dark:bg-indigo-600 text-white rounded-xl hover:bg-gray-800 dark:hover:bg-indigo-700 font-medium disabled:opacity-50">
                {loading ? 'Verifying...' : 'Continue'}</button>
            </form>
          ) : (
            <>
              <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-800 dark:text-amber-300 text-sm">
                <strong>Your OTP:</strong> {generatedOTP} <span className="text-xs block mt-1">(In production, sent via email)</span>
              </div>
              <form onSubmit={handleOTPSubmit}>
                <label className="block text-sm font-medium text-theme-secondary mb-1">Enter OTP</label>
                <input type="text" value={otp} onChange={e => setOtp(e.target.value)} maxLength={6} className="w-full px-4 py-3 border border-theme rounded-xl text-center text-2xl tracking-widest" required />
                <button type="submit" disabled={loading} className="w-full py-3 bg-gray-900 dark:bg-indigo-600 text-white rounded-xl hover:bg-gray-800 dark:hover:bg-indigo-700 font-medium mt-4 disabled:opacity-50">
                  {loading ? 'Logging in...' : 'Login'}</button>
              </form>
              <div className="mt-4 flex justify-between">
                <button onClick={() => setStep('credentials')} className="text-sm text-theme-secondary">Back</button>
                <button onClick={async () => { const user = await getUserByUsername(username); if (user) { const o = await createOTP(user.email); setGeneratedOTP(o); }}} className="text-sm text-indigo-600 font-medium">Resend OTP</button>
              </div>
            </>
          )}
          <p className="mt-6 text-center text-xs text-theme-muted">Staff accounts are created by the Principal.</p>
        </Card>
      </div>
    </div>
  );
}
