import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context';
import * as api from '../api';
import { querySQL } from '../database';
import { Clock, Wifi, WifiOff, AlertTriangle, Maximize, Minimize } from 'lucide-react';

export default function TestTaking() {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const { user } = useApp();
  const [loading, setLoading] = useState(true);
  const [test, setTest] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [attempt, setAttempt] = useState<any>(null);
  const [answers, setAnswers] = useState<{ [key: number]: string }>({});
  const [timeRemaining, setTimeRemaining] = useState({ minutes: 0, seconds: 0, total: 0 });
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const MAX_TAB_SWITCHES = 5;

  useEffect(() => { initializeTest(); return () => { if (timerRef.current) clearInterval(timerRef.current); if (saveTimerRef.current) clearInterval(saveTimerRef.current); }; }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, []);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        const newCount = tabSwitchCount + 1;
        setTabSwitchCount(newCount);
        if (newCount >= MAX_TAB_SWITCHES) handleAutoSubmit();
        else { setShowWarning(true); setTimeout(() => setShowWarning(false), 5000); }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [tabSwitchCount]);

  const initializeTest = async () => {
    if (!user || !testId) { navigate('/student'); return; }
    const t = await api.getTest(parseInt(testId));
    if (!t) { navigate('/student'); return; }

    const now = new Date();
    if (new Date(t.start_time) > now) { alert('Test not started yet.'); navigate('/student'); return; }
    if (new Date(t.end_time) < now) { alert('Test expired.'); navigate('/student'); return; }

    const existingAttempts = await api.getAttempts({ testId: t.id, studentId: user.id });
    if (existingAttempts.length >= t.max_attempts) { alert('Max attempts reached.'); navigate('/student'); return; }

    const inProgress = existingAttempts.find((a: any) => a.status === 'in_progress');
    let currentAttempt = inProgress;

    if (!inProgress) {
      const attemptId = await api.createAttempt({ test_id: t.id, student_id: user.id, attempt_number: existingAttempts.length + 1 });
      currentAttempt = await api.getAttempt(attemptId);
    }

    setTest(t);
    setAttempt(currentAttempt);

    let qs = await api.getQuestions(t.id);
    if (t.randomize_questions) qs = qs.sort(() => Math.random() - 0.5);
    setQuestions(qs);

    const savedAnswers = await api.getStudentAnswers(currentAttempt!.id);
    const answerMap: { [key: number]: string } = {};
    savedAnswers.forEach((a: any) => { if (a.selected_answer) answerMap[a.question_id] = a.selected_answer; });
    setAnswers(answerMap);

    startTimer(t, currentAttempt!);
    startAutoSave(currentAttempt!.id);
    setLoading(false);
  };

  const startTimer = (t: any, att: any) => {
    const updateTimer = () => {
      const now = Date.now();
      const start = new Date(att.started_at).getTime();
      const end = new Date(t.end_time).getTime();
      const elapsed = now - start;
      const durationMs = t.duration * 60 * 1000;
      const remainingByDuration = durationMs - elapsed;
      const remainingByEndTime = end - now;
      const total = Math.min(remainingByDuration, remainingByEndTime);
      if (total <= 0) { setTimeRemaining({ minutes: 0, seconds: 0, total: 0 }); handleAutoSubmit(); return; }
      setTimeRemaining({ minutes: Math.floor(total / 60000), seconds: Math.floor((total % 60000) / 1000), total });
    };
    updateTimer();
    timerRef.current = setInterval(updateTimer, 1000);
  };

  const startAutoSave = (attId: number) => {
    saveTimerRef.current = setInterval(async () => {
      if (!isOnline) return;
      for (const [qId, answer] of Object.entries(answers)) await api.saveStudentAnswer(attId, parseInt(qId), answer);
    }, 10000);
  };

  const handleAnswerSelect = (questionId: number, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmit = async () => {
    if (!attempt || submitting) return;
    setSubmitting(true);
    try {
      for (const [qId, answer] of Object.entries(answers)) await api.saveStudentAnswer(attempt.id, parseInt(qId), answer);
      await api.updateAttempt(attempt.id, { tab_switch_count: tabSwitchCount });
      await api.gradeAttempt(attempt.id);
      if (timerRef.current) clearInterval(timerRef.current);
      if (saveTimerRef.current) clearInterval(saveTimerRef.current);
      navigate(`/result/${attempt.id}`);
    } catch (e) { alert('Error submitting. Try again.'); setSubmitting(false); }
  };

  const handleAutoSubmit = async () => {
    if (!attempt || submitting) return;
    setSubmitting(true);
    try {
      for (const [qId, answer] of Object.entries(answers)) await api.saveStudentAnswer(attempt.id, parseInt(qId), answer);
      await api.updateAttempt(attempt.id, { status: 'auto_submitted', tab_switch_count: tabSwitchCount });
      await api.gradeAttempt(attempt.id);
      if (timerRef.current) clearInterval(timerRef.current);
      if (saveTimerRef.current) clearInterval(saveTimerRef.current);
      navigate(`/result/${attempt.id}`);
    } catch (e) { console.error(e); }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    else document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-theme-secondary"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;
  if (!test || !attempt) return <div className="min-h-screen flex items-center justify-center bg-theme-secondary"><p className="text-theme-secondary">Test not found.</p></div>;

  const answeredCount = Object.values(answers).filter(a => a).length;

  return (
    <div className="min-h-screen bg-theme-secondary select-none" onCopy={e => e.preventDefault()}>
      <div className="bg-theme-card border-b border-theme sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div><h1 className="font-semibold text-theme-primary text-sm sm:text-base">{test.title}</h1><p className="text-xs text-theme-muted">{answeredCount}/{questions.length} answered</p></div>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${isOnline ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>{isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}<span className="hidden sm:inline">{isOnline ? 'Online' : 'Offline'}</span></div>
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-sm font-bold ${timeRemaining.total < 300000 ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 animate-pulse' : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'}`}><Clock className="w-4 h-4" />{String(timeRemaining.minutes).padStart(2, '0')}:{String(timeRemaining.seconds).padStart(2, '0')}</div>
            <button onClick={toggleFullscreen} className="p-2 text-theme-muted hover:text-theme-primary rounded-lg hover:bg-theme-tertiary">{isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}</button>
          </div>
        </div>
      </div>

      {showWarning && <div className="bg-red-500 text-white px-4 py-2 text-center text-sm font-medium"><AlertTriangle className="w-4 h-4 inline mr-1" />Tab switch detected! ({tabSwitchCount}/{MAX_TAB_SWITCHES})</div>}
      {!isOnline && <div className="bg-amber-500 text-white px-4 py-2 text-center text-sm font-medium"><WifiOff className="w-4 h-4 inline mr-1" />Connection lost. Answers saved locally.</div>}

      <div className="max-w-4xl mx-auto px-4 py-6 pb-24">
        <div className="space-y-6">
          {questions.map((q, index) => (
            <div key={q.id} className="bg-theme-card border border-theme-card rounded-xl p-5 sm:p-6">
              <p className="font-medium text-theme-primary mb-4"><span className="text-indigo-600 mr-2">Q{index + 1}.</span>{q.question_text}<span className="text-xs text-theme-muted ml-2">[{test.marks_per_question} mark{test.marks_per_question !== 1 ? 's' : ''}]</span></p>
              <div className="space-y-2">
                {[{ key: 'A', text: q.option_a }, { key: 'B', text: q.option_b }, { key: 'C', text: q.option_c }, { key: 'D', text: q.option_d }].map(option => (
                  <label key={option.key} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all border ${answers[q.id] === option.key ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-700 text-indigo-900 dark:text-indigo-100' : 'bg-theme-tertiary border-theme-card hover:bg-theme-border text-theme-secondary'}`}>
                    <input type="radio" name={`q_${q.id}`} value={option.key} checked={answers[q.id] === option.key} onChange={() => handleAnswerSelect(q.id, option.key)} className="w-4 h-4 text-indigo-600" />
                    <span className="font-medium text-sm w-6">{option.key})</span><span className="text-sm">{option.text}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-theme-card border-t border-theme py-3 px-4 z-40">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="text-sm text-theme-secondary"><span className="font-medium">{answeredCount}</span>/{questions.length} answered{test.negative_marking > 0 && <span className="ml-2 text-red-500 text-xs">Negative: -{test.negative_marking}</span>}</div>
          <button onClick={() => setShowConfirmSubmit(true)} disabled={submitting} className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm disabled:opacity-50">{submitting ? 'Submitting...' : 'Submit Test'}</button>
        </div>
      </div>

      {showConfirmSubmit && (
        <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50 p-4">
          <div className="bg-theme-card rounded-2xl p-6 max-w-sm w-full border border-theme animate-fadeIn">
            <h3 className="text-lg font-bold text-theme-primary mb-2">Submit Test?</h3>
            <p className="text-theme-secondary text-sm mb-1">Answered {answeredCount}/{questions.length}</p>
            {answeredCount < questions.length && <p className="text-amber-600 text-sm mb-4">{questions.length - answeredCount} unanswered.</p>}
            <div className="flex gap-3 mt-4"><button onClick={() => setShowConfirmSubmit(false)} className="flex-1 py-2.5 bg-theme-tertiary text-theme-secondary rounded-lg text-sm font-medium">Continue</button><button onClick={() => { setShowConfirmSubmit(false); handleSubmit(); }} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium">Submit</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
