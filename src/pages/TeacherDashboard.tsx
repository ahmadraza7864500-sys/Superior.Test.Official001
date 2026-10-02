// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useApp } from '../context';
import * as api from '../api';
import { DashboardLayout, StatCard, EmptyState, Card, Modal } from '../components';
import { LayoutDashboard, Plus, FileText, BookOpen, BarChart3, Bell, User, Edit, Trash2, Save, Send } from 'lucide-react';
import { parseMCQText, formatDateTime, exportToCSV } from '../utils';

export default function TeacherDashboard() {
  const { user } = useApp();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [tests, setTests] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [questionBank, setQuestionBank] = useState<any[]>([]);
  
  const [creatingTest, setCreatingTest] = useState(false);
  const [mcqText, setMcqText] = useState('');
  const [parsedQuestions, setParsedQuestions] = useState<any[]>([]);
  const [parseErrors, setParseErrors] = useState<any[]>([]);
  const [testForm, setTestForm] = useState({ title: '', subject_id: '', class_id: '', section_id: '', duration: 60, marks_per_question: 1, negative_marking: 0, max_attempts: 1, randomize_questions: false, randomize_options: false, show_result_immediately: true, start_time: '', end_time: '' });

  useEffect(() => { loadData(); }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    await api.updateTestStatuses();
    setAssignments(await api.getTeacherAssignments(user.id));
    setTests(await api.getTests({ createdBy: user.id }));
    setSubjects(await api.getSubjects());
    setClasses(await api.getClasses());
    setSections(await api.getSections());
    const allAttempts = await api.getAttempts();
    const myTestIds = (await api.getTests({ createdBy: user.id })).map((t: any) => t.id);
    setAttempts(allAttempts.filter((a: any) => myTestIds.includes(a.test_id)));
    const allStudents = await api.getUsersByRole('student');
    const myPairs = (await api.getTeacherAssignments(user.id)).map((a: any) => `${a.class_id}-${a.section_id}`);
    setStudents(allStudents.filter((s: any) => myPairs.includes(`${s.class_id}-${s.section_id}`)));
    setQuestionBank(await api.getQuestionBank(user.id));
    setNotifications(await api.getNotifications(user.id));
    setLoading(false);
  };

  const getSubjectName = (id: number) => subjects.find((s: any) => s.id === id)?.name || 'Unknown';
  const getClassName = (id: number) => classes.find((c: any) => c.id === id)?.name || 'Unknown';
  const getSectionName = (id: number) => sections.find((s: any) => s.id === id)?.name || 'Unknown';

  const handleParseMCQ = () => {
    const { questions, errors } = parseMCQText(mcqText);
    setParsedQuestions(questions);
    setParseErrors(errors);
  };

  const handleSaveTest = async (status: 'draft' | 'upcoming') => {
    if (!user || parsedQuestions.length === 0) { alert('Parse questions first.'); return; }
    if (!testForm.title || !testForm.subject_id || !testForm.class_id || !testForm.section_id || !testForm.start_time || !testForm.end_time) { alert('Fill all required fields.'); return; }
    
    const testId = await api.createTest({ ...testForm, subject_id: parseInt(testForm.subject_id), class_id: parseInt(testForm.class_id), section_id: parseInt(testForm.section_id), created_by: user.id, status });
    
    for (let i = 0; i < parsedQuestions.length; i++) {
      const q = parsedQuestions[i];
      await api.addQuestion(testId, { question_text: q.text, option_a: q.options.A, option_b: q.options.B, option_c: q.options.C, option_d: q.options.D, correct_answer: q.correctAnswer }, i + 1);
      await api.addToQuestionBank({ teacher_id: user.id, subject_id: parseInt(testForm.subject_id), class_id: parseInt(testForm.class_id), question_text: q.text, option_a: q.options.A, option_b: q.options.B, option_c: q.options.C, option_d: q.options.D, correct_answer: q.correctAnswer });
    }

    if (status === 'upcoming') {
      const classStudents = students.filter((s: any) => s.class_id === parseInt(testForm.class_id) && s.section_id === parseInt(testForm.section_id));
      for (const student of classStudents) await api.createNotification(student.id, 'New Test Assigned', `"${testForm.title}" has been assigned.`, 'test_assigned');
    }

    await api.addAuditLog(user.id, user.full_name, 'teacher', status === 'draft' ? 'Save Draft' : 'Publish Test', `Test: ${testForm.title}`);
    setCreatingTest(false); setMcqText(''); setParsedQuestions([]); setParseErrors([]);
    setTestForm({ title: '', subject_id: '', class_id: '', section_id: '', duration: 60, marks_per_question: 1, negative_marking: 0, max_attempts: 1, randomize_questions: false, randomize_options: false, show_result_immediately: true, start_time: '', end_time: '' });
    setActiveTab('tests');
    loadData();
  };

  const handleDeleteTest = async (testId: number) => {
    if (!confirm('Delete this test?')) return;
    await api.deleteTest(testId);
    await api.addAuditLog(user!.id, user!.full_name, 'teacher', 'Delete Test', `Test ID: ${testId}`);
    loadData();
  };

  const handleExportResults = (testId: number) => {
    const testAttempts = attempts.filter((a: any) => a.test_id === testId && a.status === 'submitted');
    const data = testAttempts.map((a: any) => {
      const student = students.find((s: any) => s.id === a.student_id);
      return { 'Student': student?.full_name || 'Unknown', 'Roll': student?.roll_number || '', 'Score': `${a.obtained_marks}/${a.total_marks}`, 'Percentage': a.percentage, 'Date': a.submitted_at ? formatDateTime(a.submitted_at) : '' };
    });
    const test = tests.find((t: any) => t.id === testId);
    exportToCSV(data, `results_${test?.title || 'test'}_${Date.now()}`);
  };

  const myAssignedClasses = [...new Set(assignments.map((a: any) => a.class_id))];
  const tabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'tests', label: 'My Tests', icon: FileText },
    { id: 'create', label: 'Create Test', icon: Plus },
    { id: 'questionbank', label: 'Question Bank', icon: BookOpen },
    { id: 'results', label: 'Results', icon: BarChart3 },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;

  const renderOverview = () => {
    const draftTests = tests.filter((t: any) => t.status === 'draft');
    const activeTests = tests.filter((t: any) => t.status === 'active' || t.status === 'upcoming');
    const completedTests = tests.filter((t: any) => t.status === 'completed' || t.status === 'expired');
    return (
      <div>
        <h2 className="text-2xl font-bold text-theme-primary mb-6">Teacher Dashboard</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Drafts" value={draftTests.length} color="amber" />
          <StatCard label="Active" value={activeTests.length} color="green" />
          <StatCard label="Completed" value={completedTests.length} color="blue" />
          <StatCard label="Submissions" value={attempts.filter((a: any) => a.status === 'submitted').length} color="indigo" />
        </div>
        <Card className="p-6"><h3 className="font-semibold text-theme-primary mb-3">My Assigned Classes</h3>
          {assignments.length === 0 ? <p className="text-theme-muted">No classes assigned.</p> : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{assignments.map((a: any) => <div key={a.id} className="p-3 bg-theme-tertiary rounded-lg"><p className="font-medium text-theme-primary">{getClassName(a.class_id)} - {getSectionName(a.section_id)}</p><p className="text-sm text-theme-secondary">{getSubjectName(a.subject_id)}</p></div>)}</div>}
        </Card>
      </div>
    );
  };

  const renderTests = () => (
    <div>
      <div className="flex items-center justify-between mb-6"><h2 className="text-2xl font-bold text-theme-primary">My Tests</h2><button onClick={() => { setCreatingTest(true); setActiveTab('create'); }} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"><Plus className="w-4 h-4" /> New Test</button></div>
      {tests.length === 0 ? <EmptyState icon={FileText} title="No tests yet" description="Create your first test to get started." /> : (
        <div className="space-y-3">{tests.map((t: any) => <Card key={t.id} className="p-4 flex items-center justify-between"><div><h4 className="font-medium text-theme-primary">{t.title}</h4><p className="text-sm text-theme-muted">{getSubjectName(t.subject_id)} · {getClassName(t.class_id)}-{getSectionName(t.section_id)} · {t.duration}min</p></div><div className="flex gap-2"><button onClick={() => handleDeleteTest(t.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"><Trash2 className="w-4 h-4" /></button></div></Card>)}</div>
      )}
    </div>
  );

  const renderCreateTest = () => (
    <div>
      <h2 className="text-2xl font-bold text-theme-primary mb-6">Create Test</h2>
      {!parsedQuestions.length ? (
        <div className="space-y-6">
          <Card className="p-6"><h3 className="font-semibold text-theme-primary mb-4">Test Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-theme-secondary mb-1">Title *</label><input type="text" value={testForm.title} onChange={e => setTestForm({...testForm, title: e.target.value})} className="w-full px-3 py-2 border border-theme rounded-lg" /></div>
              <div><label className="block text-sm font-medium text-theme-secondary mb-1">Subject *</label><select value={testForm.subject_id} onChange={e => setTestForm({...testForm, subject_id: e.target.value})} className="w-full px-3 py-2 border border-theme rounded-lg"><option value="">Select</option>{subjects.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-theme-secondary mb-1">Class *</label><select value={testForm.class_id} onChange={e => setTestForm({...testForm, class_id: e.target.value})} className="w-full px-3 py-2 border border-theme rounded-lg"><option value="">Select</option>{myAssignedClasses.map((cId: number) => <option key={cId} value={cId}>{getClassName(cId)}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-theme-secondary mb-1">Section *</label><select value={testForm.section_id} onChange={e => setTestForm({...testForm, section_id: e.target.value})} className="w-full px-3 py-2 border border-theme rounded-lg"><option value="">Select</option>{sections.filter((s: any) => testForm.class_id && s.class_id === parseInt(testForm.class_id)).map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-theme-secondary mb-1">Start *</label><input type="datetime-local" value={testForm.start_time} onChange={e => setTestForm({...testForm, start_time: e.target.value})} className="w-full px-3 py-2 border border-theme rounded-lg" /></div>
              <div><label className="block text-sm font-medium text-theme-secondary mb-1">End *</label><input type="datetime-local" value={testForm.end_time} onChange={e => setTestForm({...testForm, end_time: e.target.value})} className="w-full px-3 py-2 border border-theme rounded-lg" /></div>
              <div><label className="block text-sm font-medium text-theme-secondary mb-1">Duration (min) *</label><input type="number" value={testForm.duration} onChange={e => setTestForm({...testForm, duration: parseInt(e.target.value) || 0})} className="w-full px-3 py-2 border border-theme rounded-lg" min="1" /></div>
              <div><label className="block text-sm font-medium text-theme-secondary mb-1">Marks/Question</label><input type="number" value={testForm.marks_per_question} onChange={e => setTestForm({...testForm, marks_per_question: parseFloat(e.target.value) || 0})} className="w-full px-3 py-2 border border-theme rounded-lg" min="0" step="0.5" /></div>
            </div>
          </Card>
          <Card className="p-6"><h3 className="font-semibold text-theme-primary mb-2">Paste MCQ Questions</h3><p className="text-sm text-theme-muted mb-4">Format: 1. Question{'\n'}A) Option{'\n'}B) Option{'\n'}C) Option{'\n'}D) Option{'\n'}Correct Answer: A</p>
            <textarea value={mcqText} onChange={e => setMcqText(e.target.value)} rows={12} className="w-full px-4 py-3 border border-theme rounded-lg font-mono text-sm" placeholder="Paste your questions here..." />
            <button onClick={handleParseMCQ} className="mt-3 px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm">Parse Questions</button>
          </Card>
        </div>
      ) : (
        <Card className="p-6"><div className="flex items-center justify-between mb-4"><h3 className="font-semibold text-theme-primary">Parsed Questions ({parsedQuestions.length})</h3><button onClick={() => { setParsedQuestions([]); setParseErrors([]); setMcqText(''); }} className="px-3 py-1.5 text-sm text-theme-secondary bg-theme-tertiary rounded-lg">Edit Text</button></div>
          <div className="space-y-4 max-h-96 overflow-y-auto">{parsedQuestions.map((q, i) => <div key={i} className="p-4 bg-theme-tertiary rounded-lg"><p className="font-medium text-theme-primary">Q{i + 1}. {q.text}</p><div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1">{Object.entries(q.options).map(([key, val]) => <p key={key} className={`text-sm ${key === q.correctAnswer ? 'text-green-600 font-medium' : 'text-theme-secondary'}`}>{key}) {val as string} {key === q.correctAnswer && '✓'}</p>)}</div></div>)}</div>
          <div className="mt-4 flex gap-3"><button onClick={() => handleSaveTest('draft')} className="px-6 py-2.5 bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200 font-medium text-sm flex items-center gap-2"><Save className="w-4 h-4" /> Save Draft</button><button onClick={() => handleSaveTest('upcoming')} className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm flex items-center gap-2"><Send className="w-4 h-4" /> Publish</button></div>
        </Card>
      )}
      {parseErrors.length > 0 && <div className="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">{parseErrors.map((err, i) => <div key={i} className="text-sm text-red-700 dark:text-red-300 mb-2"><p className="font-medium">{err.message}</p><p className="text-red-600">Expected: {err.expected}</p></div>)}</div>}
    </div>
  );

  const renderResults = () => (
    <div>
      <h2 className="text-2xl font-bold text-theme-primary mb-6">Results</h2>
      {tests.length === 0 ? <EmptyState icon={BarChart3} title="No tests" description="" /> : (
        <div className="space-y-4">{tests.map((t: any) => { const testAttempts = attempts.filter((a: any) => a.test_id === t.id && a.status === 'submitted'); const avg = testAttempts.length > 0 ? Math.round(testAttempts.reduce((s: number, a: any) => s + a.percentage, 0) / testAttempts.length) : 0; return <Card key={t.id} className="p-5"><div className="flex items-center justify-between mb-3"><div><h4 className="font-semibold text-theme-primary">{t.title}</h4><p className="text-sm text-theme-muted">{getSubjectName(t.subject_id)} · {getClassName(t.class_id)}-{getSectionName(t.section_id)}</p></div><button onClick={() => handleExportResults(t.id)} className="px-3 py-1.5 text-sm bg-theme-tertiary text-theme-secondary rounded-lg hover:bg-theme-border">Export CSV</button></div><div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm"><div><span className="text-theme-muted">Submissions:</span> <span className="font-medium">{testAttempts.length}</span></div><div><span className="text-theme-muted">Average:</span> <span className="font-medium">{avg}%</span></div><div><span className="text-theme-muted">Highest:</span> <span className="font-medium">{testAttempts.length > 0 ? Math.max(...testAttempts.map((a: any) => a.percentage)) : 0}%</span></div><div><span className="text-theme-muted">Lowest:</span> <span className="font-medium">{testAttempts.length > 0 ? Math.min(...testAttempts.map((a: any) => a.percentage)) : 0}%</span></div></div></Card>; })}</div>
      )}
    </div>
  );

  return (
    <DashboardLayout role="teacher" tabs={tabs} activeTab={activeTab} onTabChange={(tab) => { setActiveTab(tab); if (tab === 'create') setCreatingTest(true); }}>
      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'tests' && renderTests()}
      {activeTab === 'create' && renderCreateTest()}
      {activeTab === 'questionbank' && <div><h2 className="text-2xl font-bold text-theme-primary mb-6">Question Bank</h2>{questionBank.length === 0 ? <EmptyState icon={BookOpen} title="No questions" description="Questions auto-save when you create tests." /> : <Card className="p-4"><p className="text-theme-secondary">{questionBank.length} questions saved.</p></Card>}</div>}
      {activeTab === 'results' && renderResults()}
      {activeTab === 'notifications' && <div><h2 className="text-2xl font-bold text-theme-primary mb-6">Notifications</h2>{notifications.length === 0 ? <EmptyState icon={Bell} title="No notifications" description="" /> : <div className="space-y-3">{notifications.map((n: any) => <Card key={n.id} className="p-4"><h4 className="font-medium text-theme-primary">{n.title}</h4><p className="text-sm text-theme-secondary mt-1">{n.message}</p></Card>)}</div>}</div>}
      {activeTab === 'profile' && <div><h2 className="text-2xl font-bold text-theme-primary mb-6">Profile</h2><Card className="p-6"><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><span className="text-sm text-theme-muted">Name</span><p className="font-medium text-theme-primary">{user?.full_name}</p></div><div><span className="text-sm text-theme-muted">Email</span><p className="font-medium text-theme-primary">{user?.email}</p></div><div><span className="text-sm text-theme-muted">Username</span><p className="font-medium text-theme-primary">{user?.username}</p></div><div><span className="text-sm text-theme-muted">Role</span><p className="font-medium text-theme-primary capitalize">{user?.role}</p></div></div></Card></div>}
    </DashboardLayout>
  );
}
