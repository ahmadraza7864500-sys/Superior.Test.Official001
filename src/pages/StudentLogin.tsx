import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context';
import { ThemeToggle, Logo, Card } from '../components';
import { ArrowLeft, Mail, Shield } from 'lucide-react';

export default function StudentLogin() {
  const { requestOTP, login } = useApp();
  const navigate = useNavigate();
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [generatedOTP, setGeneratedOTP] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError('');
    const result = await requestOTP(email);
    if (result.success && result.otp) { setGeneratedOTP(result.otp); setStep('otp'); }
    else setError(result.message);
    setLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError('');
    const result = await login(email, otp);
    if (result.success) navigate('/student'); else setError(result.message);
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
            <h2 className="text-2xl font-bold text-theme-primary mt-4">Student Login</h2>
            <p className="text-theme-secondary mt-1">Login with your registered email</p>
          </div>
          {error && <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">{error}</div>}
          {step === 'email' ? (
            <form onSubmit={handleRequestOTP}>
              <label className="block text-sm font-medium text-theme-secondary mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-muted" />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full pl-10 pr-4 py-3 border border-theme rounded-xl" placeholder="email@example.com" required />
              </div>
              <button type="submit" disabled={loading} className="w-full py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium mt-4 disabled:opacity-50">
                {loading ? 'Sending...' : 'Send OTP'}</button>
            </form>
          ) : (
            <>
              <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-800 dark:text-amber-300 text-sm">
                <strong>Your OTP:</strong> {generatedOTP} <span className="text-xs block mt-1">(In production, sent via email)</span>
              </div>
              <form onSubmit={handleLogin}>
                <label className="block text-sm font-medium text-theme-secondary mb-1">Enter OTP</label>
                <input type="text" value={otp} onChange={e => setOtp(e.target.value)} maxLength={6} className="w-full px-4 py-3 border border-theme rounded-xl text-center text-2xl tracking-widest" placeholder="000000" required />
                <button type="submit" disabled={loading} className="w-full py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium mt-4 disabled:opacity-50">
                  {loading ? 'Logging in...' : 'Login'}</button>
              </form>
              <div className="mt-4 flex justify-between">
                <button onClick={() => setStep('email')} className="text-sm text-theme-secondary">Change Email</button>
                <button onClick={async () => { const r = await requestOTP(email); if (r.otp) setGeneratedOTP(r.otp); }} className="text-sm text-indigo-600 font-medium">Resend OTP</button>
              </div>
            </>
          )}
          <p className="mt-6 text-center text-sm text-theme-secondary">Not registered? <Link to="/register" className="text-indigo-600 font-medium">Register</Link></p>
        </Card>
      </div>
    </div>
  );
}
