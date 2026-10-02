import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context';
import { getClasses, getSections } from '../api';
import { ThemeToggle, Logo, Card } from '../components';
import { ArrowLeft, User, Mail, Phone, BookOpen, Hash } from 'lucide-react';

export default function StudentRegister() {
  const { registerStudent, requestOTP, login } = useApp();
  const [step, setStep] = useState<'form' | 'otp' | 'success'>('form');
  const [classes, setClasses] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [generatedOTP, setGeneratedOTP] = useState('');
  const [form, setForm] = useState({ full_name: '', email: '', father_name: '', class_id: '', section_id: '', roll_number: '', phone: '' });
  const [otp, setOtp] = useState('');

  useEffect(() => { (async () => { setClasses(await getClasses()); })(); }, []);
  useEffect(() => { if (form.class_id) getSections(parseInt(form.class_id)).then(setSections); else setSections([]); }, [form.class_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError('');
    if (!form.full_name || !form.email || !form.class_id || !form.section_id || !form.roll_number) { setError('Fill all required fields.'); setLoading(false); return; }
    const result = await registerStudent({ ...form, class_id: parseInt(form.class_id), section_id: parseInt(form.section_id) });
    if (!result.success) { setError(result.message); setLoading(false); return; }
    const otpResult = await requestOTP(form.email);
    if (otpResult.success && otpResult.otp) { setGeneratedOTP(otpResult.otp); setStep('otp'); }
    else setError(otpResult.message);
    setLoading(false);
  };

  const handleOTPSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError('');
    const result = await login(form.email, otp);
    if (result.success) setStep('success'); else setError(result.message);
    setLoading(false);
  };

  if (step === 'success') return (
    <div className="min-h-screen bg-theme-secondary flex items-center justify-center p-4">
      <Card className="p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
        </div>
        <h2 className="text-2xl font-bold text-theme-primary mb-2">Registration Complete!</h2>
        <p className="text-theme-secondary mb-6">Your email has been verified. Your account is now active.</p>
        <Link to="/student" className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium">Go to Dashboard</Link>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-theme-secondary py-8 px-4">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Link to="/" className="inline-flex items-center text-theme-secondary hover:text-theme-primary text-sm"><ArrowLeft className="w-4 h-4 mr-1" /> Back</Link>
          <ThemeToggle />
        </div>
        <Card className="p-8">
          <div className="text-center mb-6">
            <Logo size="lg" />
            <h2 className="text-2xl font-bold text-theme-primary mt-4">Student Registration</h2>
          </div>
          {error && <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">{error}</div>}
          
          {step === 'form' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><label className="block text-sm font-medium text-theme-secondary mb-1">Full Name *</label>
                <div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-muted" />
                  <input type="text" value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} className="w-full pl-10 pr-4 py-2.5 border border-theme rounded-xl" placeholder="Your full name" required /></div></div>
              <div><label className="block text-sm font-medium text-theme-secondary mb-1">Email *</label>
                <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-muted" />
                  <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full pl-10 pr-4 py-2.5 border border-theme rounded-xl" placeholder="email@example.com" required /></div></div>
              <div><label className="block text-sm font-medium text-theme-secondary mb-1">Father's Name</label>
                <input type="text" value={form.father_name} onChange={e => setForm({...form, father_name: e.target.value})} className="w-full px-4 py-2.5 border border-theme rounded-xl" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-theme-secondary mb-1">Class *</label>
                  <select value={form.class_id} onChange={e => setForm({...form, class_id: e.target.value, section_id: ''})} className="w-full px-3 py-2.5 border border-theme rounded-xl" required>
                    <option value="">Select</option>{classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                  {classes.length === 0 && <p className="text-xs text-amber-600 mt-1">No classes. Contact admin.</p>}</div>
                <div><label className="block text-sm font-medium text-theme-secondary mb-1">Section *</label>
                  <select value={form.section_id} onChange={e => setForm({...form, section_id: e.target.value})} className="w-full px-3 py-2.5 border border-theme rounded-xl" required disabled={!form.class_id}>
                    <option value="">Select</option>{sections.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-theme-secondary mb-1">Roll Number *</label>
                  <input type="text" value={form.roll_number} onChange={e => setForm({...form, roll_number: e.target.value})} className="w-full px-4 py-2.5 border border-theme rounded-xl" required /></div>
                <div><label className="block text-sm font-medium text-theme-secondary mb-1">Phone</label>
                  <input type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full px-4 py-2.5 border border-theme rounded-xl" /></div>
              </div>
              <button type="submit" disabled={loading} className="w-full py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium disabled:opacity-50 mt-4">
                {loading ? 'Registering...' : 'Register & Verify Email'}</button>
            </form>
          ) : (
            <>
              <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-800 dark:text-amber-300 text-sm">
                <strong>Your OTP:</strong> {generatedOTP} <span className="text-xs block mt-1">(In production, sent via email)</span>
              </div>
              <form onSubmit={handleOTPSubmit}>
                <label className="block text-sm font-medium text-theme-secondary mb-1">Enter OTP</label>
                <input type="text" value={otp} onChange={e => setOtp(e.target.value)} maxLength={6} className="w-full px-4 py-3 border border-theme rounded-xl text-center text-2xl tracking-widest" placeholder="000000" required />
                <button type="submit" disabled={loading} className="w-full py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium mt-4 disabled:opacity-50">
                  {loading ? 'Verifying...' : 'Verify & Login'}</button>
              </form>
              <button onClick={async () => { const r = await requestOTP(form.email); if (r.otp) setGeneratedOTP(r.otp); }} className="w-full mt-3 text-sm text-indigo-600 font-medium">Resend OTP</button>
            </>
          )}
          <p className="mt-6 text-center text-sm text-theme-secondary">Already registered? <Link to="/student/login" className="text-indigo-600 font-medium">Login</Link></p>
        </Card>
      </div>
    </div>
  );
}
