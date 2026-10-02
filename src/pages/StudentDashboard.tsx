// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context';
import * as api from '../api';
import { DashboardLayout, StatCard, EmptyState, Card } from '../components';
import { LayoutDashboard, Calendar, Clock, CheckCircle, XCircle, History, BarChart3, Bell, User, Settings } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatDateTime, formatDate } from '../utils';

export default function StudentDashboard() {
  const { user } = useApp();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [tests, setTests] = useState<any[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [notifPrefs, setNotifPrefs] = useState<any>(null);

  useEffect(() => { loadData(); }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    await api.updateTestStatuses();
    const allTests = await api.getTests();
    setTests(allTests.filter((t: any) => t.class_id === user.class_id && t.section_id === user.section_id));
    setAttempts(await api.getAttempts({ studentId: user.id }));
    setNotifications(await api.getNotifications(user.id));
    setSubjects(await api.getSubjects());
    setClasses(await api.getClasses());
    setSections(await api.getSections());
    setNotifPrefs(await api.getNotificationPrefs(user.id));
    setLoading(false);
  };

  const getSubjectName = (id: number) => subjects.find((s: any) => s.id === id)?.name || 'Unknown';
  const getClassName = (id: number) => classes.find((c: any) => c.id === id)?.name || 'Unknown';
  const getSectionName = (id: number) => sections.find((s: any) => s.id === id)?.name || 'Unknown';

  const now = new Date();
  const activeTests = tests.filter((t: any) => new Date(t.start_time) <= now && new Date(t.end_time) >= now && t.status === 'active');
  const upcomingTests = tests.filter((t: any) => new Date(t.start_time) > now && t.status !== 'expired');
  const completedAttempts = attempts.filter((a: any) => a.status === 'submitted');
  const missedTests = tests.filter((t: any) => (t.status === 'expired' || new Date(t.end_time) < now) && !attempts.some((a: any) => a.test_id === t.id));
  const unreadCount = notifications.filter((n: any) => !n.is_read).length;

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'active', label: 'Active Tests', icon: Clock, badge: activeTests.length },
    { id: 'upcoming', label: 'Upcoming', icon: Calendar },
    { id: 'completed', label: 'Completed', icon: CheckCircle },
    { id: 'missed', label: 'Missed', icon: XCircle },
    { id: 'history', label: 'History', icon: History },
    { id: 'performance', label: 'Performance', icon: BarChart3 },
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadCount },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;

  const renderTestCard = (test: any, showAction = true) => {
    const testAttempts = attempts.filter((a: any) => a.test_id === test.id);
    const canAttempt = testAttempts.length < test.max_attempts;
    return (
      <Card key={test.id} className="p-5">
        <div className="flex items-start justify-between">
          <div><h3 className="font-semibold text-theme-primary">{test.title}</h3><p className="text-sm text-theme-muted mt-1">{getSubjectName(test.subject_id)}</p></div>
          <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${test.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'}`}>{test.status}</span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-theme-secondary">
          <div>Start: {formatDateTime(test.start_time)}</div>
          <div>End: {formatDateTime(test.end_time)}</div>
          <div>Duration: {test.duration} min</div>
          <div>Attempts: {testAttempts.length}/{test.max_attempts}</div>
        </div>
        {testAttempts.length > 0 && <div className="mt-2 text-sm"><span className="text-theme-muted">Last Score: </span><span className="font-medium text-theme-primary">{testAttempts[testAttempts.length - 1].obtained_marks}/{testAttempts[testAttempts.length - 1].total_marks} ({testAttempts[testAttempts.length - 1].percentage}%)</span></div>}
        {showAction && canAttempt && test.status === 'active' && <Link to={`/test/${test.id}`} className="mt-3 inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700">{testAttempts.length > 0 ? 'Retake Test' : 'Start Test'}</Link>}
        {testAttempts.length > 0 && test.show_result_immediately && <Link to={`/result/${testAttempts[testAttempts.length - 1].id}`} className="mt-3 ml-2 inline-flex items-center px-4 py-2 bg-theme-tertiary text-theme-secondary text-sm rounded-lg hover:bg-theme-border">View Result</Link>}
      </Card>
    );
  };

  const renderDashboard = () => (
    <div>
      <h2 className="text-2xl font-bold text-theme-primary mb-6">Welcome, {user?.full_name}</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Active Tests" value={activeTests.length} color="green" />
        <StatCard label="Upcoming" value={upcomingTests.length} color="blue" />
        <StatCard label="Completed" value={completedAttempts.length} color="indigo" />
        <StatCard label="Avg Score" value={completedAttempts.length > 0 ? Math.round(completedAttempts.reduce((s: number, a: any) => s + a.percentage, 0) / completedAttempts.length) + '%' : '—'} color="purple" />
      </div>
      {activeTests.length > 0 && <div className="mb-8"><h3 className="text-lg font-semibold text-theme-primary mb-3">Tests Available Now</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-4">{activeTests.map(t => renderTestCard(t))}</div></div>}
      {tests.length === 0 && <EmptyState icon={Calendar} title="No tests available yet" description="Your assigned tests will appear here." />}
    </div>
  );

  const renderPerformance = () => {
    const chartData = completedAttempts.map((a: any) => {
      const test = tests.find((t: any) => t.id === a.test_id);
      return { name: test?.title?.substring(0, 15) || 'Test', percentage: a.percentage };
    });
    return (
      <div>
        <h2 className="text-2xl font-bold text-theme-primary mb-6">Performance</h2>
        {completedAttempts.length === 0 ? <EmptyState icon={BarChart3} title="No performance data" description="Complete tests to see your trends." /> : (
          <>
            <Card className="p-6 mb-6"><h3 className="font-semibold text-theme-primary mb-4">Performance Over Time</h3>
              <ResponsiveContainer width="100%" height={300}><LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" /><XAxis dataKey="name" fontSize={12} stroke="var(--text-muted)" /><YAxis domain={[0, 100]} stroke="var(--text-muted)" /><Tooltip /><Line type="monotone" dataKey="percentage" stroke="#4f46e5" strokeWidth={2} /></LineChart></ResponsiveContainer>
            </Card>
            <div className="grid grid-cols-3 gap-4">
              <StatCard label="Highest" value={Math.max(...completedAttempts.map((a: any) => a.percentage)) + '%'} color="green" />
              <StatCard label="Lowest" value={Math.min(...completedAttempts.map((a: any) => a.percentage)) + '%'} color="red" />
              <StatCard label="Average" value={Math.round(completedAttempts.reduce((s: number, a: any) => s + a.percentage, 0) / completedAttempts.length) + '%'} color="indigo" />
            </div>
          </>
        )}
      </div>
    );
  };

  const renderSettings = () => (
    <div>
      <h2 className="text-2xl font-bold text-theme-primary mb-6">Notification Settings</h2>
      {notifPrefs && (
        <Card className="p-6">
          <h3 className="font-semibold text-theme-primary mb-4">Email Notifications</h3>
          <div className="space-y-3">
            {['email_test_assigned', 'email_test_reminder', 'email_result_available'].map(key => (
              <label key={key} className="flex items-center justify-between">
                <span className="text-theme-secondary capitalize">{key.replace(/_/g, ' ').replace('email ', '')}</span>
                <input type="checkbox" checked={!!notifPrefs[key]} onChange={async (e) => { await api.updateNotificationPrefs(user!.id, { [key]: e.target.checked ? 1 : 0 }); setNotifPrefs(await api.getNotificationPrefs(user!.id)); }} className="w-5 h-5 rounded" />
              </label>
            ))}
          </div>
          <h3 className="font-semibold text-theme-primary mb-4 mt-6">In-App Notifications</h3>
          <div className="space-y-3">
            {['inapp_test_assigned', 'inapp_test_reminder', 'inapp_result_available'].map(key => (
              <label key={key} className="flex items-center justify-between">
                <span className="text-theme-secondary capitalize">{key.replace(/_/g, ' ').replace('inapp ', '')}</span>
                <input type="checkbox" checked={!!notifPrefs[key]} onChange={async (e) => { await api.updateNotificationPrefs(user!.id, { [key]: e.target.checked ? 1 : 0 }); setNotifPrefs(await api.getNotificationPrefs(user!.id)); }} className="w-5 h-5 rounded" />
              </label>
            ))}
          </div>
        </Card>
      )}
    </div>
  );

  return (
    <DashboardLayout role="student" tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'dashboard' && renderDashboard()}
      {activeTab === 'active' && <div><h2 className="text-2xl font-bold text-theme-primary mb-6">Active Tests</h2>{activeTests.length === 0 ? <EmptyState icon={Clock} title="No active tests" description="No tests currently available." /> : <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{activeTests.map(t => renderTestCard(t))}</div>}</div>}
      {activeTab === 'upcoming' && <div><h2 className="text-2xl font-bold text-theme-primary mb-6">Upcoming Tests</h2>{upcomingTests.length === 0 ? <EmptyState icon={Calendar} title="No upcoming tests" description="" /> : <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{upcomingTests.map(t => renderTestCard(t, false))}</div>}</div>}
      {activeTab === 'completed' && <div><h2 className="text-2xl font-bold text-theme-primary mb-6">Completed Tests</h2>{completedAttempts.length === 0 ? <EmptyState icon={CheckCircle} title="No completed tests" description="" /> : <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{completedAttempts.map((a: any) => { const test = tests.find((t: any) => t.id === a.test_id); return test ? <Card key={a.id} className="p-5"><h3 className="font-semibold text-theme-primary">{test.title}</h3><p className="text-sm text-theme-muted">{getSubjectName(test.subject_id)}</p><div className="mt-3 flex items-center gap-4"><span className="text-lg font-bold text-indigo-600">{a.obtained_marks}/{a.total_marks}</span><span className="text-sm text-theme-secondary">({a.percentage}%)</span></div><div className="mt-2 text-sm text-theme-muted">✓ {a.correct_count} · ✗ {a.wrong_count} · — {a.unanswered_count}</div>{test.show_result_immediately && <Link to={`/result/${a.id}`} className="mt-3 inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700">View Details</Link>}</Card> : null; })}</div>}</div>}
      {activeTab === 'missed' && <div><h2 className="text-2xl font-bold text-theme-primary mb-6">Missed Tests</h2>{missedTests.length === 0 ? <EmptyState icon={CheckCircle} title="No missed tests" description="Great job!" /> : <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{missedTests.map(t => renderTestCard(t, false))}</div>}</div>}
      {activeTab === 'history' && <div><h2 className="text-2xl font-bold text-theme-primary mb-6">Test History</h2>{attempts.length === 0 ? <EmptyState icon={History} title="No test history" description="" /> : <Card className="overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-theme-tertiary"><tr><th className="px-4 py-3 text-left font-medium text-theme-muted">Test</th><th className="px-4 py-3 text-left font-medium text-theme-muted">Date</th><th className="px-4 py-3 text-left font-medium text-theme-muted">Score</th><th className="px-4 py-3 text-left font-medium text-theme-muted">Status</th></tr></thead><tbody>{attempts.map((a: any) => { const test = tests.find((t: any) => t.id === a.test_id); return <tr key={a.id} className="border-b border-theme-card hover:bg-theme-tertiary"><td className="px-4 py-3 font-medium text-theme-primary">{test?.title || 'Unknown'}</td><td className="px-4 py-3 text-theme-secondary">{formatDate(a.started_at)}</td><td className="px-4 py-3 text-theme-primary">{a.status === 'submitted' ? `${a.obtained_marks}/${a.total_marks} (${a.percentage}%)` : '—'}</td><td className="px-4 py-3"><span className={`px-2 py-0.5 text-xs rounded-full ${a.status === 'submitted' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{a.status}</span></td></tr>; })}</tbody></table></div></Card>}</div>}
      {activeTab === 'performance' && renderPerformance()}
      {activeTab === 'notifications' && <div><h2 className="text-2xl font-bold text-theme-primary mb-6">Notifications</h2>{notifications.length === 0 ? <EmptyState icon={Bell} title="No notifications" description="" /> : <div className="space-y-3">{notifications.map((n: any) => <Card key={n.id} className={`p-4 ${!n.is_read ? 'border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/10' : ''}`}><div className="flex justify-between"><div><h4 className="font-medium text-theme-primary">{n.title}</h4><p className="text-sm text-theme-secondary mt-1">{n.message}</p><p className="text-xs text-theme-muted mt-2">{formatDateTime(n.created_at)}</p></div>{!n.is_read && <button onClick={async () => { await api.markNotificationRead(n.id); loadData(); }} className="text-xs text-indigo-600 font-medium">Mark read</button>}</div></Card>)}</div>}</div>}
      {activeTab === 'profile' && <div><h2 className="text-2xl font-bold text-theme-primary mb-6">Profile</h2><Card className="p-6"><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><span className="text-sm text-theme-muted">Full Name</span><p className="font-medium text-theme-primary">{user?.full_name}</p></div><div><span className="text-sm text-theme-muted">Email</span><p className="font-medium text-theme-primary">{user?.email}</p></div><div><span className="text-sm text-theme-muted">Father's Name</span><p className="font-medium text-theme-primary">{user?.father_name || '—'}</p></div><div><span className="text-sm text-theme-muted">Phone</span><p className="font-medium text-theme-primary">{user?.phone || '—'}</p></div><div><span className="text-sm text-theme-muted">Class</span><p className="font-medium text-theme-primary">{getClassName(user?.class_id || 0)}</p></div><div><span className="text-sm text-theme-muted">Section</span><p className="font-medium text-theme-primary">{getSectionName(user?.section_id || 0)}</p></div><div><span className="text-sm text-theme-muted">Roll Number</span><p className="font-medium text-theme-primary">{user?.roll_number}</p></div><div><span className="text-sm text-theme-muted">Status</span><p className="font-medium text-green-600">Active</p></div></div></Card></div>}
      {activeTab === 'settings' && renderSettings()}
    </DashboardLayout>
  );
}
