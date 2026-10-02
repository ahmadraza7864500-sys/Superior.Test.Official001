// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context';
import * as api from '../api';
import { DashboardLayout, StatCard, EmptyState, Card, Modal } from '../components';
import { LayoutDashboard, Users, UserCheck, BookOpen, FileText, BarChart3, Bell, ClipboardList, Plus, Trash2, ToggleLeft, ToggleRight, Download } from 'lucide-react';
import { formatDateTime, formatDate, exportToCSV, exportToExcel, exportToPDF } from '../utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function PrincipalDashboard() {
  const { user } = useApp();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [tests, setTests] = useState<any[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [error, setError] = useState('');
  const [showAddTeacher, setShowAddTeacher] = useState(false);
  const [showAddClass, setShowAddClass] = useState(false);
  const [showAddSection, setShowAddSection] = useState(false);
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [showAssignTeacher, setShowAssignTeacher] = useState(false);
  const [showEditStudent, setShowEditStudent] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [resetPasswordTeacher, setResetPasswordTeacher] = useState<any>(null);
  const [teacherForm, setTeacherForm] = useState({ full_name: '', email: '', username: '', password: '', phone: '' });
  const [classForm, setClassForm] = useState({ name: '', academic_year: new Date().getFullYear().toString() });
  const [sectionForm, setSectionForm] = useState({ class_id: '', name: '' });
  const [subjectForm, setSubjectForm] = useState({ name: '', category: '' });
  const [assignForm, setAssignForm] = useState({ teacher_id: '', class_id: '', section_id: '', subject_id: '' });
  const [editStudentForm, setEditStudentForm] = useState({ full_name: '', email: '', phone: '', father_name: '', class_id: '', section_id: '', roll_number: '' });
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    await api.updateTestStatuses();
    setStudents(await api.getUsersByRole('student'));
    setTeachers(await api.getUsersByRole('teacher'));
    setClasses(await api.getClasses());
    setSections(await api.getSections());
    setSubjects(await api.getSubjects());
    setAssignments(await api.getTeacherAssignments());
    setTests(await api.getTests());
    setAttempts(await api.getAttempts());
    setAuditLogs(await api.getAuditLogs({ limit: 100 }));
    setNotifications(await api.getNotifications(user!.id));
    setLoading(false);
  };

  const getClassName = (id: number) => classes.find((c: any) => c.id === id)?.name || 'Unknown';
  const getSectionName = (id: number) => sections.find((s: any) => s.id === id)?.name || 'Unknown';
  const getSubjectName = (id: number) => subjects.find((s: any) => s.id === id)?.name || 'Unknown';

  const handleAddTeacher = async () => {
    setError('');
    if (!teacherForm.full_name || !teacherForm.email || !teacherForm.username || !teacherForm.password) { setError('Fill all required fields.'); return; }
    const existing = await api.getUserByEmail(teacherForm.email);
    if (existing) { setError('Email already exists.'); return; }
    await api.createUser({ ...teacherForm, role: 'teacher' });
    await api.addAuditLog(user!.id, user!.full_name, 'principal', 'Create Teacher', `Teacher: ${teacherForm.full_name}`);
    setShowAddTeacher(false); setTeacherForm({ full_name: '', email: '', username: '', password: '', phone: '' });
    loadData();
  };

  const handleToggleTeacher = async (teacherId: number, active: number) => {
    await api.updateUser(teacherId, { is_active: active ? 0 : 1 } as any);
    await api.addAuditLog(user!.id, user!.full_name, 'principal', active ? 'Disable Teacher' : 'Enable Teacher', `Teacher ID: ${teacherId}`);
    loadData();
  };

  const handleDeleteStudent = async (studentId: number) => {
    if (!confirm('Deactivate this student?')) return;
    await api.deleteUser(studentId);
    await api.addAuditLog(user!.id, user!.full_name, 'principal', 'Deactivate Student', `Student ID: ${studentId}`);
    loadData();
  };

  const handleEditStudent = async () => {
    if (!editingStudent) return;
    setError('');
    if (!editStudentForm.full_name || !editStudentForm.email) {
      setError('Name and email are required.');
      return;
    }
    await api.editStudent(editingStudent.id, editStudentForm);
    await api.addAuditLog(user!.id, user!.full_name, 'principal', 'Edit Student', `Student: ${editStudentForm.full_name}`);
    setShowEditStudent(false);
    setEditingStudent(null);
    loadData();
  };

  const handleResetPassword = async () => {
    if (!resetPasswordTeacher || !newPassword) return;
    setError('');
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    await api.resetTeacherPassword(resetPasswordTeacher.id, newPassword);
    await api.addAuditLog(user!.id, user!.full_name, 'principal', 'Reset Teacher Password', `Teacher: ${resetPasswordTeacher.full_name}`);
    setShowResetPassword(false);
    setResetPasswordTeacher(null);
    setNewPassword('');
    alert('Password reset successfully. The teacher should change it on next login.');
  };

  const openEditStudent = (student: any) => {
    setEditingStudent(student);
    setEditStudentForm({
      full_name: student.full_name || '',
      email: student.email || '',
      phone: student.phone || '',
      father_name: student.father_name || '',
      class_id: student.class_id || '',
      section_id: student.section_id || '',
      roll_number: student.roll_number || ''
    });
    setShowEditStudent(true);
  };

  const handleAddClass = async () => {
    if (!classForm.name) { setError('Class name required.'); return; }
    await api.createClass(classForm.name, classForm.academic_year);
    await api.addAuditLog(user!.id, user!.full_name, 'principal', 'Create Class', `Class: ${classForm.name}`);
    setShowAddClass(false); setClassForm({ name: '', academic_year: new Date().getFullYear().toString() });
    loadData();
  };

  const handleAddSection = async () => {
    if (!sectionForm.class_id || !sectionForm.name) { setError('All fields required.'); return; }
    await api.createSection(parseInt(sectionForm.class_id), sectionForm.name);
    await api.addAuditLog(user!.id, user!.full_name, 'principal', 'Create Section', `Section: ${sectionForm.name}`);
    setShowAddSection(false); setSectionForm({ class_id: '', name: '' });
    loadData();
  };

  const handleAddSubject = async () => {
    if (!subjectForm.name) { setError('Subject name required.'); return; }
    await api.createSubject(subjectForm.name, subjectForm.category);
    await api.addAuditLog(user!.id, user!.full_name, 'principal', 'Create Subject', `Subject: ${subjectForm.name}`);
    setShowAddSubject(false); setSubjectForm({ name: '', category: '' });
    loadData();
  };

  const handleAssignTeacher = async () => {
    if (!assignForm.teacher_id || !assignForm.class_id || !assignForm.section_id || !assignForm.subject_id) { setError('All fields required.'); return; }
    await api.createAssignment(parseInt(assignForm.teacher_id), parseInt(assignForm.class_id), parseInt(assignForm.section_id), parseInt(assignForm.subject_id));
    await api.addAuditLog(user!.id, user!.full_name, 'principal', 'Assign Teacher', `Teacher ${assignForm.teacher_id}`);
    setShowAssignTeacher(false); setAssignForm({ teacher_id: '', class_id: '', section_id: '', subject_id: '' });
    loadData();
  };

  const handleExportReport = async (type: string, format: 'csv' | 'excel' | 'pdf' = 'csv') => {
    let data: any[] = [];
    if (type === 'students') data = students.map((s: any) => ({ Name: s.full_name, Email: s.email, Class: getClassName(s.class_id), Section: getSectionName(s.section_id), Roll: s.roll_number, Status: s.is_active ? 'Active' : 'Inactive' }));
    else if (type === 'tests') data = tests.map((t: any) => ({ Title: t.title, Subject: getSubjectName(t.subject_id), Class: getClassName(t.class_id), Status: t.status, Start: formatDateTime(t.start_time) }));
    else if (type === 'results') data = attempts.filter((a: any) => a.status === 'submitted').map((a: any) => { const test = tests.find((t: any) => t.id === a.test_id); const student = students.find((s: any) => s.id === a.student_id); return { Student: student?.full_name || '', Test: test?.title || '', Score: `${a.obtained_marks}/${a.total_marks}`, Percentage: a.percentage, Date: formatDate(a.submitted_at || '') }; });
    
    const filename = `${type}_report_${Date.now()}`;
    
    if (format === 'csv') {
      exportToCSV(data, filename);
    } else if (format === 'excel') {
      await exportToExcel(data, filename);
    } else if (format === 'pdf') {
      const columns = Object.keys(data[0] || {});
      const rows = data.map(row => columns.map(col => String(row[col] || '')));
      await exportToPDF(`${type.charAt(0).toUpperCase() + type.slice(1)} Report`, columns, rows, filename);
    }
  };

  const filteredStudents = students.filter((s: any) => {
    const matchSearch = !searchTerm || s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || s.email.toLowerCase().includes(searchTerm.toLowerCase()) || s.roll_number?.includes(searchTerm);
    const matchClass = !filterClass || s.class_id === parseInt(filterClass);
    return matchSearch && matchClass;
  });

  const tabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'students', label: 'Students', icon: Users },
    { id: 'teachers', label: 'Teachers', icon: UserCheck },
    { id: 'classes', label: 'Classes', icon: BookOpen },
    { id: 'subjects', label: 'Subjects', icon: BookOpen },
    { id: 'tests', label: 'Tests', icon: FileText },
    { id: 'results', label: 'Results', icon: BarChart3 },
    { id: 'reports', label: 'Reports', icon: ClipboardList },
    { id: 'audit', label: 'Audit Logs', icon: ClipboardList },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ];

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;

  const COLORS = ['#4f46e5', '#059669', '#d97706', '#dc2626', '#7c3aed'];

  const renderOverview = () => {
    const submittedAttempts = attempts.filter((a: any) => a.status === 'submitted');
    const avgPercentage = submittedAttempts.length > 0 ? Math.round(submittedAttempts.reduce((s: number, a: any) => s + a.percentage, 0) / submittedAttempts.length) : 0;
    const testStatusData = [
      { name: 'Draft', value: tests.filter((t: any) => t.status === 'draft').length },
      { name: 'Active', value: tests.filter((t: any) => t.status === 'active' || t.status === 'upcoming').length },
      { name: 'Completed', value: tests.filter((t: any) => t.status === 'completed' || t.status === 'expired').length },
    ].filter(d => d.value > 0);

    return (
      <div>
        <h2 className="text-2xl font-bold text-theme-primary mb-6">Principal Dashboard</h2>
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
          <StatCard label="Students" value={students.length} color="indigo" />
          <StatCard label="Teachers" value={teachers.length} color="green" />
          <StatCard label="Classes" value={classes.length} color="blue" />
          <StatCard label="Subjects" value={subjects.length} color="purple" />
          <StatCard label="Tests" value={tests.length} color="amber" />
          <StatCard label="Avg Score" value={avgPercentage + '%'} color="indigo" />
        </div>
        {testStatusData.length > 0 && <Card className="p-6 mb-6"><h3 className="font-semibold text-theme-primary mb-4">Test Distribution</h3><ResponsiveContainer width="100%" height={200}><PieChart><Pie data={testStatusData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }: any) => `${name}: ${value}`}>{testStatusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></Card>}
        {students.length === 0 && teachers.length === 0 && tests.length === 0 && <EmptyState icon={LayoutDashboard} title="No data yet" description="Start by creating classes, subjects, and teacher accounts." />}
      </div>
    );
  };

  const renderStudents = () => (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold text-theme-primary">Students ({students.length})</h2>
        <div className="flex gap-2 flex-wrap">
          <input type="text" placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="px-3 py-1.5 border border-theme rounded-lg text-sm w-48" />
          <select value={filterClass} onChange={e => setFilterClass(e.target.value)} className="px-3 py-1.5 border border-theme rounded-lg text-sm"><option value="">All Classes</option>{classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          <button onClick={() => handleExportReport('students')} className="px-3 py-1.5 bg-theme-tertiary text-theme-secondary rounded-lg text-sm hover:bg-theme-border flex items-center gap-1"><Download className="w-3 h-3" /> Export</button>
        </div>
      </div>
      {filteredStudents.length === 0 ? <EmptyState icon={Users} title="No students" description="No students registered yet." /> : (
        <Card className="overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-theme-tertiary"><tr><th className="px-4 py-3 text-left font-medium text-theme-muted">Name</th><th className="px-4 py-3 text-left font-medium text-theme-muted">Email</th><th className="px-4 py-3 text-left font-medium text-theme-muted">Class</th><th className="px-4 py-3 text-left font-medium text-theme-muted">Roll</th><th className="px-4 py-3 text-left font-medium text-theme-muted">Status</th><th className="px-4 py-3 text-left font-medium text-theme-muted">Actions</th></tr></thead><tbody>{filteredStudents.slice(0, 50).map((s: any) => <tr key={s.id} className="border-b border-theme-card hover:bg-theme-tertiary"><td className="px-4 py-3 font-medium text-theme-primary">{s.full_name}</td><td className="px-4 py-3 text-theme-secondary">{s.email}</td><td className="px-4 py-3 text-theme-secondary">{getClassName(s.class_id)}</td><td className="px-4 py-3 text-theme-secondary">{s.roll_number}</td><td className="px-4 py-3"><span className={`px-2 py-0.5 text-xs rounded-full ${s.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{s.is_active ? 'Active' : 'Inactive'}</span></td><td className="px-4 py-3 flex gap-2"><button onClick={() => openEditStudent(s)} className="text-indigo-500 hover:text-indigo-700 text-xs">Edit</button><button onClick={() => handleDeleteStudent(s.id)} className="text-red-500 hover:text-red-700 text-xs">Deactivate</button></td></tr>)}</tbody></table></div></Card>
      )}
    </div>
  );

  const renderTeachers = () => (
    <div>
      <div className="flex items-center justify-between mb-6"><h2 className="text-2xl font-bold text-theme-primary">Teachers ({teachers.length})</h2><div className="flex gap-2"><button onClick={() => setShowAssignTeacher(true)} className="px-3 py-1.5 bg-theme-tertiary text-theme-secondary rounded-lg text-sm hover:bg-theme-border">Assign</button><button onClick={() => setShowAddTeacher(true)} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 flex items-center gap-1"><Plus className="w-3 h-3" /> Add</button></div></div>
      {error && <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">{error}</div>}
      {teachers.length === 0 ? <EmptyState icon={UserCheck} title="No teachers" description="Add your first teacher." /> : (
        <div className="space-y-3">{teachers.map((t: any) => { const tAssignments = assignments.filter((a: any) => a.teacher_id === t.id); return <Card key={t.id} className="p-4"><div className="flex items-center justify-between"><div><h4 className="font-medium text-theme-primary">{t.full_name}</h4><p className="text-sm text-theme-muted">{t.email} · @{t.username}</p>{tAssignments.length > 0 && <div className="mt-1 flex flex-wrap gap-1">{tAssignments.map((a: any) => <span key={a.id} className="text-xs bg-theme-tertiary text-theme-secondary px-2 py-0.5 rounded">{getClassName(a.class_id)}-{getSectionName(a.section_id)} ({getSubjectName(a.subject_id)})</span>)}</div>}</div><div className="flex items-center gap-2"><button onClick={() => { setResetPasswordTeacher(t); setShowResetPassword(true); }} className="px-2 py-1 text-xs bg-amber-100 text-amber-700 rounded hover:bg-amber-200">Reset Password</button><button onClick={() => handleToggleTeacher(t.id, t.is_active)} className={`p-1.5 rounded ${t.is_active ? 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20' : 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'}`}>{t.is_active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}</button></div></div></Card>; })}</div>
      )}
      <Modal isOpen={showAddTeacher} onClose={() => { setShowAddTeacher(false); setError(''); }} title="Add Teacher">
        {error && <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-300 text-sm">{error}</div>}
        <div className="space-y-3">
          <input type="text" placeholder="Full Name *" value={teacherForm.full_name} onChange={e => setTeacherForm({...teacherForm, full_name: e.target.value})} className="w-full px-3 py-2 border border-theme rounded-lg text-sm" />
          <input type="email" placeholder="Email *" value={teacherForm.email} onChange={e => setTeacherForm({...teacherForm, email: e.target.value})} className="w-full px-3 py-2 border border-theme rounded-lg text-sm" />
          <input type="text" placeholder="Username *" value={teacherForm.username} onChange={e => setTeacherForm({...teacherForm, username: e.target.value})} className="w-full px-3 py-2 border border-theme rounded-lg text-sm" />
          <input type="password" placeholder="Password *" value={teacherForm.password} onChange={e => setTeacherForm({...teacherForm, password: e.target.value})} className="w-full px-3 py-2 border border-theme rounded-lg text-sm" />
        </div>
        <div className="flex gap-3 mt-4"><button onClick={() => { setShowAddTeacher(false); setError(''); }} className="flex-1 py-2 bg-theme-tertiary text-theme-secondary rounded-lg text-sm">Cancel</button><button onClick={handleAddTeacher} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm">Add</button></div>
      </Modal>
      <Modal isOpen={showAssignTeacher} onClose={() => { setShowAssignTeacher(false); setError(''); }} title="Assign Teacher">
        <div className="space-y-3">
          <select value={assignForm.teacher_id} onChange={e => setAssignForm({...assignForm, teacher_id: e.target.value})} className="w-full px-3 py-2 border border-theme rounded-lg text-sm"><option value="">Select Teacher</option>{teachers.map((t: any) => <option key={t.id} value={t.id}>{t.full_name}</option>)}</select>
          <select value={assignForm.class_id} onChange={e => setAssignForm({...assignForm, class_id: e.target.value})} className="w-full px-3 py-2 border border-theme rounded-lg text-sm"><option value="">Select Class</option>{classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          <select value={assignForm.section_id} onChange={e => setAssignForm({...assignForm, section_id: e.target.value})} className="w-full px-3 py-2 border border-theme rounded-lg text-sm"><option value="">Select Section</option>{sections.filter((s: any) => assignForm.class_id && s.class_id === parseInt(assignForm.class_id)).map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
          <select value={assignForm.subject_id} onChange={e => setAssignForm({...assignForm, subject_id: e.target.value})} className="w-full px-3 py-2 border border-theme rounded-lg text-sm"><option value="">Select Subject</option>{subjects.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
        </div>
        <div className="flex gap-3 mt-4"><button onClick={() => { setShowAssignTeacher(false); setError(''); }} className="flex-1 py-2 bg-theme-tertiary text-theme-secondary rounded-lg text-sm">Cancel</button><button onClick={handleAssignTeacher} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm">Assign</button></div>
      </Modal>
    </div>
  );

  const renderClasses = () => (
    <div>
      <div className="flex items-center justify-between mb-6"><h2 className="text-2xl font-bold text-theme-primary">Classes & Sections</h2><div className="flex gap-2"><button onClick={() => setShowAddSection(true)} className="px-3 py-1.5 bg-theme-tertiary text-theme-secondary rounded-lg text-sm hover:bg-theme-border">Add Section</button><button onClick={() => setShowAddClass(true)} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 flex items-center gap-1"><Plus className="w-3 h-3" /> Add Class</button></div></div>
      {classes.length === 0 ? <EmptyState icon={BookOpen} title="No classes" description="" /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{classes.map((c: any) => { const classSections = sections.filter((s: any) => s.class_id === c.id); const classStudents = students.filter((s: any) => s.class_id === c.id); return <Card key={c.id} className="p-5"><h4 className="font-semibold text-theme-primary">{c.name}</h4><p className="text-sm text-theme-muted">Year: {c.academic_year} · Students: {classStudents.length}</p><div className="mt-2 flex flex-wrap gap-1">{classSections.map((s: any) => <span key={s.id} className="text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded">{s.name}</span>)}</div><button onClick={async () => { await api.deleteClass(c.id); loadData(); }} className="mt-3 text-xs text-red-500 hover:text-red-700">Delete</button></Card>; })}</div>
      )}
      <Modal isOpen={showAddClass} onClose={() => setShowAddClass(false)} title="Add Class">
        <div className="space-y-3"><input type="text" placeholder="Class Name *" value={classForm.name} onChange={e => setClassForm({...classForm, name: e.target.value})} className="w-full px-3 py-2 border border-theme rounded-lg text-sm" /><input type="text" placeholder="Academic Year" value={classForm.academic_year} onChange={e => setClassForm({...classForm, academic_year: e.target.value})} className="w-full px-3 py-2 border border-theme rounded-lg text-sm" /></div>
        <div className="flex gap-3 mt-4"><button onClick={() => setShowAddClass(false)} className="flex-1 py-2 bg-theme-tertiary text-theme-secondary rounded-lg text-sm">Cancel</button><button onClick={handleAddClass} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm">Add</button></div>
      </Modal>
      <Modal isOpen={showAddSection} onClose={() => setShowAddSection(false)} title="Add Section">
        <div className="space-y-3"><select value={sectionForm.class_id} onChange={e => setSectionForm({...sectionForm, class_id: e.target.value})} className="w-full px-3 py-2 border border-theme rounded-lg text-sm"><option value="">Select Class</option>{classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select><input type="text" placeholder="Section Name *" value={sectionForm.name} onChange={e => setSectionForm({...sectionForm, name: e.target.value})} className="w-full px-3 py-2 border border-theme rounded-lg text-sm" /></div>
        <div className="flex gap-3 mt-4"><button onClick={() => setShowAddSection(false)} className="flex-1 py-2 bg-theme-tertiary text-theme-secondary rounded-lg text-sm">Cancel</button><button onClick={handleAddSection} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm">Add</button></div>
      </Modal>
    </div>
  );

  const renderSubjects = () => (
    <div>
      <div className="flex items-center justify-between mb-6"><h2 className="text-2xl font-bold text-theme-primary">Subjects ({subjects.length})</h2><button onClick={() => setShowAddSubject(true)} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 flex items-center gap-1"><Plus className="w-3 h-3" /> Add</button></div>
      {subjects.length === 0 ? <EmptyState icon={BookOpen} title="No subjects" description="" /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{subjects.map((s: any) => <Card key={s.id} className="p-4 flex items-center justify-between"><div><h4 className="font-medium text-theme-primary">{s.name}</h4>{s.category && <p className="text-sm text-theme-muted">{s.category}</p>}</div><button onClick={async () => { await api.deleteSubject(s.id); loadData(); }} className="text-red-500 hover:text-red-700 text-xs">Delete</button></Card>)}</div>
      )}
      <Modal isOpen={showAddSubject} onClose={() => setShowAddSubject(false)} title="Add Subject">
        <div className="space-y-3"><input type="text" placeholder="Subject Name *" value={subjectForm.name} onChange={e => setSubjectForm({...subjectForm, name: e.target.value})} className="w-full px-3 py-2 border border-theme rounded-lg text-sm" /><input type="text" placeholder="Category (optional)" value={subjectForm.category} onChange={e => setSubjectForm({...subjectForm, category: e.target.value})} className="w-full px-3 py-2 border border-theme rounded-lg text-sm" /></div>
        <div className="flex gap-3 mt-4"><button onClick={() => setShowAddSubject(false)} className="flex-1 py-2 bg-theme-tertiary text-theme-secondary rounded-lg text-sm">Cancel</button><button onClick={handleAddSubject} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm">Add</button></div>
      </Modal>
    </div>
  );

  const renderTests = () => (
    <div>
      <h2 className="text-2xl font-bold text-theme-primary mb-6">All Tests ({tests.length})</h2>
      {tests.length === 0 ? <EmptyState icon={FileText} title="No tests" description="" /> : (
        <Card className="overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-theme-tertiary"><tr><th className="px-4 py-3 text-left font-medium text-theme-muted">Title</th><th className="px-4 py-3 text-left font-medium text-theme-muted">Subject</th><th className="px-4 py-3 text-left font-medium text-theme-muted">Class</th><th className="px-4 py-3 text-left font-medium text-theme-muted">Status</th><th className="px-4 py-3 text-left font-medium text-theme-muted">Attempts</th></tr></thead><tbody>{tests.map((t: any) => <tr key={t.id} className="border-b border-theme-card hover:bg-theme-tertiary"><td className="px-4 py-3 font-medium text-theme-primary">{t.title}</td><td className="px-4 py-3 text-theme-secondary">{getSubjectName(t.subject_id)}</td><td className="px-4 py-3 text-theme-secondary">{getClassName(t.class_id)}</td><td className="px-4 py-3"><span className={`px-2 py-0.5 text-xs rounded-full ${t.status === 'active' ? 'bg-green-100 text-green-700' : t.status === 'draft' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-700'}`}>{t.status}</span></td><td className="px-4 py-3 text-theme-secondary">{attempts.filter((a: any) => a.test_id === t.id).length}</td></tr>)}</tbody></table></div></Card>
      )}
    </div>
  );

  const renderResults = () => (
    <div>
      <div className="flex items-center justify-between mb-6"><h2 className="text-2xl font-bold text-theme-primary">All Results</h2><button onClick={() => handleExportReport('results')} className="px-3 py-1.5 bg-theme-tertiary text-theme-secondary rounded-lg text-sm hover:bg-theme-border flex items-center gap-1"><Download className="w-3 h-3" /> Export</button></div>
      {attempts.filter((a: any) => a.status === 'submitted').length === 0 ? <EmptyState icon={BarChart3} title="No results" description="" /> : (
        <Card className="overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-theme-tertiary"><tr><th className="px-4 py-3 text-left font-medium text-theme-muted">Student</th><th className="px-4 py-3 text-left font-medium text-theme-muted">Test</th><th className="px-4 py-3 text-left font-medium text-theme-muted">Score</th><th className="px-4 py-3 text-left font-medium text-theme-muted">%</th><th className="px-4 py-3 text-left font-medium text-theme-muted">Date</th></tr></thead><tbody>{attempts.filter((a: any) => a.status === 'submitted').sort((a: any, b: any) => new Date(b.submitted_at || '').getTime() - new Date(a.submitted_at || '').getTime()).slice(0, 50).map((a: any) => { const test = tests.find((t: any) => t.id === a.test_id); const student = students.find((s: any) => s.id === a.student_id); return <tr key={a.id} className="border-b border-theme-card hover:bg-theme-tertiary"><td className="px-4 py-3 font-medium text-theme-primary">{student?.full_name || 'Unknown'}</td><td className="px-4 py-3 text-theme-secondary">{test?.title || 'Unknown'}</td><td className="px-4 py-3 text-theme-primary">{a.obtained_marks}/{a.total_marks}</td><td className="px-4 py-3"><span className={`font-medium ${a.percentage >= 60 ? 'text-green-600' : a.percentage >= 40 ? 'text-amber-600' : 'text-red-600'}`}>{a.percentage}%</span></td><td className="px-4 py-3 text-theme-secondary">{formatDate(a.submitted_at || '')}</td></tr>; })}</tbody></table></div></Card>
      )}
    </div>
  );

  const renderReports = () => (
    <div>
      <h2 className="text-2xl font-bold text-theme-primary mb-6">Reports</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <Users className="w-8 h-8 text-indigo-600 mb-3" />
          <h3 className="font-semibold text-theme-primary">Student Report</h3>
          <p className="text-sm text-theme-muted mt-1 mb-4">All student records with class, section, and status.</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => handleExportReport('students', 'csv')} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs hover:bg-indigo-700">CSV</button>
            <button onClick={() => handleExportReport('students', 'excel')} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs hover:bg-green-700">Excel</button>
            <button onClick={() => handleExportReport('students', 'pdf')} className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs hover:bg-red-700">PDF</button>
          </div>
        </Card>
        <Card className="p-6">
          <FileText className="w-8 h-8 text-green-600 mb-3" />
          <h3 className="font-semibold text-theme-primary">Test Report</h3>
          <p className="text-sm text-theme-muted mt-1 mb-4">All tests with subject, class, status, and schedule.</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => handleExportReport('tests', 'csv')} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs hover:bg-indigo-700">CSV</button>
            <button onClick={() => handleExportReport('tests', 'excel')} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs hover:bg-green-700">Excel</button>
            <button onClick={() => handleExportReport('tests', 'pdf')} className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs hover:bg-red-700">PDF</button>
          </div>
        </Card>
        <Card className="p-6">
          <BarChart3 className="w-8 h-8 text-purple-600 mb-3" />
          <h3 className="font-semibold text-theme-primary">Results Report</h3>
          <p className="text-sm text-theme-muted mt-1 mb-4">All test results with scores, percentages, and dates.</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => handleExportReport('results', 'csv')} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs hover:bg-indigo-700">CSV</button>
            <button onClick={() => handleExportReport('results', 'excel')} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs hover:bg-green-700">Excel</button>
            <button onClick={() => handleExportReport('results', 'pdf')} className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs hover:bg-red-700">PDF</button>
          </div>
        </Card>
      </div>
    </div>
  );

  const renderAudit = () => (
    <div>
      <h2 className="text-2xl font-bold text-theme-primary mb-6">Audit Logs</h2>
      {auditLogs.length === 0 ? <EmptyState icon={ClipboardList} title="No logs" description="" /> : (
        <Card className="overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-theme-tertiary"><tr><th className="px-4 py-3 text-left font-medium text-theme-muted">User</th><th className="px-4 py-3 text-left font-medium text-theme-muted">Role</th><th className="px-4 py-3 text-left font-medium text-theme-muted">Action</th><th className="px-4 py-3 text-left font-medium text-theme-muted">Details</th><th className="px-4 py-3 text-left font-medium text-theme-muted">Time</th></tr></thead><tbody>{auditLogs.slice(0, 50).map((log: any) => <tr key={log.id} className="border-b border-theme-card hover:bg-theme-tertiary"><td className="px-4 py-3 font-medium text-theme-primary">{log.user_name}</td><td className="px-4 py-3 text-theme-secondary capitalize">{log.role}</td><td className="px-4 py-3 text-theme-secondary">{log.action}</td><td className="px-4 py-3 text-theme-secondary max-w-xs truncate">{log.details}</td><td className="px-4 py-3 text-theme-muted text-xs">{formatDateTime(log.timestamp)}</td></tr>)}</tbody></table></div></Card>
      )}
    </div>
  );

  return (
    <DashboardLayout role="principal" tabs={tabs} activeTab={activeTab} onTabChange={(tab) => { setActiveTab(tab); setError(''); }}>
      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'students' && renderStudents()}
      {activeTab === 'teachers' && renderTeachers()}
      {activeTab === 'classes' && renderClasses()}
      {activeTab === 'subjects' && renderSubjects()}
      {activeTab === 'tests' && renderTests()}
      {activeTab === 'results' && renderResults()}
      {activeTab === 'reports' && renderReports()}
      {activeTab === 'audit' && renderAudit()}
      {activeTab === 'notifications' && <div><h2 className="text-2xl font-bold text-theme-primary mb-6">Notifications</h2>{notifications.length === 0 ? <EmptyState icon={Bell} title="No notifications" description="" /> : <div className="space-y-3">{notifications.map((n: any) => <Card key={n.id} className="p-4"><h4 className="font-medium text-theme-primary">{n.title}</h4><p className="text-sm text-theme-secondary mt-1">{n.message}</p><p className="text-xs text-theme-muted mt-2">{formatDateTime(n.created_at)}</p></Card>)}</div>}</div>}
      
      {/* Edit Student Modal */}
      <Modal isOpen={showEditStudent} onClose={() => { setShowEditStudent(false); setEditingStudent(null); setError(''); }} title="Edit Student">
        {error && <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-300 text-sm">{error}</div>}
        <div className="space-y-3">
          <input type="text" placeholder="Full Name *" value={editStudentForm.full_name} onChange={e => setEditStudentForm({...editStudentForm, full_name: e.target.value})} className="w-full px-3 py-2 border border-theme rounded-lg text-sm" />
          <input type="email" placeholder="Email *" value={editStudentForm.email} onChange={e => setEditStudentForm({...editStudentForm, email: e.target.value})} className="w-full px-3 py-2 border border-theme rounded-lg text-sm" />
          <input type="text" placeholder="Phone" value={editStudentForm.phone} onChange={e => setEditStudentForm({...editStudentForm, phone: e.target.value})} className="w-full px-3 py-2 border border-theme rounded-lg text-sm" />
          <input type="text" placeholder="Father's Name" value={editStudentForm.father_name} onChange={e => setEditStudentForm({...editStudentForm, father_name: e.target.value})} className="w-full px-3 py-2 border border-theme rounded-lg text-sm" />
          <select value={editStudentForm.class_id} onChange={e => setEditStudentForm({...editStudentForm, class_id: e.target.value})} className="w-full px-3 py-2 border border-theme rounded-lg text-sm">
            <option value="">Select Class</option>
            {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={editStudentForm.section_id} onChange={e => setEditStudentForm({...editStudentForm, section_id: e.target.value})} className="w-full px-3 py-2 border border-theme rounded-lg text-sm">
            <option value="">Select Section</option>
            {sections.filter((s: any) => !editStudentForm.class_id || s.class_id === editStudentForm.class_id).map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input type="text" placeholder="Roll Number" value={editStudentForm.roll_number} onChange={e => setEditStudentForm({...editStudentForm, roll_number: e.target.value})} className="w-full px-3 py-2 border border-theme rounded-lg text-sm" />
        </div>
        <div className="flex gap-3 mt-4">
          <button onClick={() => { setShowEditStudent(false); setEditingStudent(null); setError(''); }} className="flex-1 py-2 bg-theme-tertiary text-theme-secondary rounded-lg text-sm">Cancel</button>
          <button onClick={handleEditStudent} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm">Save Changes</button>
        </div>
      </Modal>

      {/* Reset Password Modal */}
      <Modal isOpen={showResetPassword} onClose={() => { setShowResetPassword(false); setResetPasswordTeacher(null); setNewPassword(''); setError(''); }} title="Reset Teacher Password">
        {error && <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-300 text-sm">{error}</div>}
        {resetPasswordTeacher && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-sm">
            <p className="font-medium text-blue-900 dark:text-blue-300">Resetting password for:</p>
            <p className="text-blue-800 dark:text-blue-200">{resetPasswordTeacher.full_name} ({resetPasswordTeacher.email})</p>
          </div>
        )}
        <div className="space-y-3">
          <input type="password" placeholder="New Password (min 8 characters)" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full px-3 py-2 border border-theme rounded-lg text-sm" />
        </div>
        <div className="flex gap-3 mt-4">
          <button onClick={() => { setShowResetPassword(false); setResetPasswordTeacher(null); setNewPassword(''); setError(''); }} className="flex-1 py-2 bg-theme-tertiary text-theme-secondary rounded-lg text-sm">Cancel</button>
          <button onClick={handleResetPassword} className="flex-1 py-2 bg-amber-600 text-white rounded-lg text-sm">Reset Password</button>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
