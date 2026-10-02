// @ts-nocheck
import { db } from './database';
import bcrypt from 'bcryptjs';

// ============ AUTHENTICATION ============
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hashSync(password, 10);
}

export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function generateToken(): string {
  return Array.from({length: 32}, () => Math.floor(Math.random() * 16).toString(16)).join('') + Date.now().toString(36);
}

export async function sendEmail(to: string, subject: string, body: string): Promise<boolean> {
  console.log(`[EMAIL] To: ${to} | Subject: ${subject}`);
  return true;
}

// ============ USER MANAGEMENT ============
export async function createUser(data: any): Promise<number> {
  const passwordHash = data.password ? await hashPassword(data.password) : null;
  return await db.users.add({
    email: data.email,
    password_hash: passwordHash,
    role: data.role,
    full_name: data.full_name,
    phone: data.phone || null,
    father_name: data.father_name || null,
    class_id: data.class_id || null,
    section_id: data.section_id || null,
    roll_number: data.roll_number || null,
    username: data.username || null,
    is_active: 1,
    is_verified: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });
}

export async function getUserByEmail(email: string) {
  return await db.users.where('email').equals(email).first();
}

export async function getUserByUsername(username: string) {
  return await db.users.where('username').equals(username).first();
}

export async function getUserById(id: number) {
  return await db.users.get(id);
}

export async function getUsersByRole(role: string) {
  return await db.users.where('role').equals(role).toArray();
}

export async function updateUser(id: number, data: any): Promise<void> {
  await db.users.update(id, { ...data, updated_at: new Date().toISOString() });
}

export async function deleteUser(id: number): Promise<void> {
  await db.users.update(id, { is_active: 0, updated_at: new Date().toISOString() });
}

// ============ OTP MANAGEMENT ============
export async function createOTP(email: string): Promise<string> {
  const otp = generateOTP();
  const expires_at = Date.now() + 10 * 60 * 1000;
  await db.otp_records.add({
    email,
    otp,
    expires_at,
    attempts: 0,
    used: 0,
    created_at: new Date().toISOString()
  });
  await sendEmail(email, 'Your OTP Code', `Your verification code is: ${otp}. Valid for 10 minutes.`);
  return otp;
}

export async function verifyOTPRecord(email: string, otp: string): Promise<{ success: boolean; message: string }> {
  const record = await db.otp_records
    .where('email').equals(email)
    .filter(r => r.used === 0)
    .reverse()
    .sortBy('created_at');
  
  if (record.length === 0) return { success: false, message: 'No OTP found. Please request a new one.' };
  const latest = record[0];
  
  if (latest.expires_at < Date.now()) return { success: false, message: 'OTP has expired. Please request a new one.' };
  if (latest.attempts >= 5) return { success: false, message: 'Too many incorrect attempts. Request a new OTP.' };
  if (latest.otp !== otp) {
    await db.otp_records.update(latest.id!, { attempts: latest.attempts + 1 });
    return { success: false, message: `Invalid OTP. ${5 - latest.attempts - 1} attempts remaining.` };
  }
  
  await db.otp_records.update(latest.id!, { used: 1 });
  return { success: true, message: 'OTP verified.' };
}

export async function checkOTPRateLimit(email: string): Promise<{ allowed: boolean; waitSeconds?: number }> {
  const last = await db.otp_records
    .where('email').equals(email)
    .reverse()
    .sortBy('created_at');
  
  if (last.length > 0) {
    const elapsed = Date.now() - new Date(last[0].created_at).getTime();
    if (elapsed < 60000) return { allowed: false, waitSeconds: Math.ceil((60000 - elapsed) / 1000) };
  }
  return { allowed: true };
}

// ============ SESSION MANAGEMENT ============
export async function createSession(userId: number): Promise<string> {
  const token = generateToken();
  const expires_at = Date.now() + 24 * 60 * 60 * 1000;
  await db.sessions.add({
    user_id: userId,
    token,
    expires_at,
    created_at: new Date().toISOString()
  });
  return token;
}

export async function validateSession(token: string) {
  const session = await db.sessions.where('token').equals(token).first();
  if (!session || session.expires_at < Date.now()) return null;
  return await getUserById(session.user_id);
}

export async function deleteSession(token: string): Promise<void> {
  await db.sessions.where('token').equals(token).delete();
}

// ============ CLASSES & SECTIONS ============
export async function getClasses() {
  return await db.classes.toArray();
}

export async function createClass(name: string, academic_year: string): Promise<number> {
  return await db.classes.add({
    name,
    academic_year,
    created_at: new Date().toISOString()
  });
}

export async function deleteClass(id: number): Promise<void> {
  await db.sections.where('class_id').equals(id).delete();
  await db.classes.delete(id);
}

export async function getSections(classId?: number) {
  if (classId) return await db.sections.where('class_id').equals(classId).toArray();
  return await db.sections.toArray();
}

export async function createSection(class_id: number, name: string): Promise<number> {
  return await db.sections.add({
    class_id,
    name,
    created_at: new Date().toISOString()
  });
}

export async function deleteSection(id: number): Promise<void> {
  await db.sections.delete(id);
}

// ============ SUBJECTS ============
export async function getSubjects() {
  return await db.subjects.toArray();
}

export async function createSubject(name: string, category?: string): Promise<number> {
  return await db.subjects.add({
    name,
    category: category || null,
    created_at: new Date().toISOString()
  });
}

export async function deleteSubject(id: number): Promise<void> {
  await db.subjects.delete(id);
}

// ============ TEACHER ASSIGNMENTS ============
export async function getTeacherAssignments(teacherId?: number) {
  if (teacherId) return await db.teacher_assignments.where('teacher_id').equals(teacherId).toArray();
  return await db.teacher_assignments.toArray();
}

export async function createAssignment(teacher_id: number, class_id: number, section_id: number, subject_id: number): Promise<number> {
  return await db.teacher_assignments.add({
    teacher_id,
    class_id,
    section_id,
    subject_id,
    created_at: new Date().toISOString()
  });
}

export async function deleteAssignment(id: number): Promise<void> {
  await db.teacher_assignments.delete(id);
}

// ============ TESTS ============
export async function getTests(filters?: { createdBy?: number; classId?: number; status?: string }) {
  let tests = await db.tests.toArray();
  if (filters?.createdBy) tests = tests.filter(t => t.created_by === filters.createdBy);
  if (filters?.classId) tests = tests.filter(t => t.class_id === filters.classId);
  if (filters?.status) tests = tests.filter(t => t.status === filters.status);
  return tests.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function getTest(id: number) {
  return await db.tests.get(id);
}

export async function createTest(data: any): Promise<number> {
  return await db.tests.add({
    title: data.title,
    subject_id: data.subject_id,
    class_id: data.class_id,
    section_id: data.section_id,
    created_by: data.created_by,
    status: data.status || 'draft',
    start_time: data.start_time,
    end_time: data.end_time,
    duration: data.duration,
    marks_per_question: data.marks_per_question || 1,
    negative_marking: data.negative_marking || 0,
    max_attempts: data.max_attempts || 1,
    randomize_questions: data.randomize_questions ? 1 : 0,
    randomize_options: data.randomize_options ? 1 : 0,
    show_result_immediately: data.show_result_immediately ? 1 : 0,
    is_locked: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });
}

export async function updateTest(id: number, data: any): Promise<void> {
  await db.tests.update(id, { ...data, updated_at: new Date().toISOString() });
}

export async function deleteTest(id: number): Promise<void> {
  await db.questions.where('test_id').equals(id).delete();
  await db.tests.delete(id);
}

// ============ QUESTIONS ============
export async function getQuestions(testId: number) {
  return await db.questions.where('test_id').equals(testId).sortBy('question_order');
}

export async function addQuestion(testId: number, data: any, order: number): Promise<number> {
  return await db.questions.add({
    test_id: testId,
    question_text: data.question_text,
    option_a: data.option_a,
    option_b: data.option_b,
    option_c: data.option_c,
    option_d: data.option_d,
    correct_answer: data.correct_answer,
    question_order: order
  });
}

export async function deleteQuestionsByTest(testId: number): Promise<void> {
  await db.questions.where('test_id').equals(testId).delete();
}

// ============ QUESTION BANK ============
export async function getQuestionBank(teacherId: number, filters?: { subjectId?: number; search?: string }) {
  let questions = await db.question_bank.where('teacher_id').equals(teacherId).toArray();
  if (filters?.subjectId) questions = questions.filter(q => q.subject_id === filters.subjectId);
  if (filters?.search) questions = questions.filter(q => q.question_text.toLowerCase().includes(filters.search!.toLowerCase()));
  return questions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function addToQuestionBank(data: any): Promise<number> {
  return await db.question_bank.add({
    teacher_id: data.teacher_id,
    subject_id: data.subject_id,
    class_id: data.class_id || null,
    chapter: data.chapter || null,
    difficulty: data.difficulty || null,
    question_text: data.question_text,
    option_a: data.option_a,
    option_b: data.option_b,
    option_c: data.option_c,
    option_d: data.option_d,
    correct_answer: data.correct_answer,
    created_at: new Date().toISOString()
  });
}

export async function deleteFromQuestionBank(id: number): Promise<void> {
  await db.question_bank.delete(id);
}

// ============ TEST ATTEMPTS ============
export async function getAttempts(filters?: { testId?: number; studentId?: number; status?: string }) {
  let attempts = await db.test_attempts.toArray();
  if (filters?.testId) attempts = attempts.filter(a => a.test_id === filters.testId);
  if (filters?.studentId) attempts = attempts.filter(a => a.student_id === filters.studentId);
  if (filters?.status) attempts = attempts.filter(a => a.status === filters.status);
  return attempts.sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
}

export async function getAttempt(id: number) {
  return await db.test_attempts.get(id);
}

export async function createAttempt(data: any): Promise<number> {
  return await db.test_attempts.add({
    test_id: data.test_id,
    student_id: data.student_id,
    attempt_number: data.attempt_number,
    started_at: new Date().toISOString(),
    submitted_at: null,
    status: 'in_progress',
    total_marks: 0,
    obtained_marks: 0,
    percentage: 0,
    correct_count: 0,
    wrong_count: 0,
    unanswered_count: 0,
    tab_switch_count: 0
  });
}

export async function updateAttempt(id: number, data: any): Promise<void> {
  await db.test_attempts.update(id, data);
}

// ============ STUDENT ANSWERS ============
export async function getStudentAnswers(attemptId: number) {
  return await db.student_answers.where('attempt_id').equals(attemptId).toArray();
}

export async function saveStudentAnswer(attemptId: number, questionId: number, answer: string): Promise<void> {
  const existing = await db.student_answers
    .where('attempt_id').equals(attemptId)
    .and(a => a.question_id === questionId)
    .first();
  
  if (existing) {
    await db.student_answers.update(existing.id!, {
      selected_answer: answer,
      saved_at: new Date().toISOString()
    });
  } else {
    await db.student_answers.add({
      attempt_id: attemptId,
      question_id: questionId,
      selected_answer: answer,
      is_correct: 0,
      marks_obtained: 0,
      saved_at: new Date().toISOString()
    });
  }
}

export async function gradeAttempt(attemptId: number): Promise<void> {
  const attempt = await db.test_attempts.get(attemptId);
  if (!attempt) return;
  const test = await db.tests.get(attempt.test_id);
  if (!test) return;
  
  const questions = await db.questions.where('test_id').equals(test.id!).toArray();
  const answers = await db.student_answers.where('attempt_id').equals(attemptId).toArray();
  
  let correct = 0, wrong = 0, unanswered = 0, obtained = 0;
  
  for (const q of questions) {
    const ans = answers.find(a => a.question_id === q.id);
    if (!ans || !ans.selected_answer) {
      unanswered++;
    } else if (ans.selected_answer === q.correct_answer) {
      correct++;
      obtained += test.marks_per_question;
      await db.student_answers.update(ans.id!, { is_correct: 1, marks_obtained: test.marks_per_question });
    } else {
      wrong++;
      obtained -= test.negative_marking;
      await db.student_answers.update(ans.id!, { is_correct: 0, marks_obtained: -test.negative_marking });
    }
  }
  
  const total = questions.length * test.marks_per_question;
  const percentage = total > 0 ? Math.max(0, Math.round((obtained / total) * 10000) / 100) : 0;
  
  await db.test_attempts.update(attemptId, {
    status: 'submitted',
    submitted_at: new Date().toISOString(),
    total_marks: total,
    obtained_marks: obtained,
    percentage,
    correct_count: correct,
    wrong_count: wrong,
    unanswered_count: unanswered
  });
}

// ============ NOTIFICATIONS ============
export async function getNotifications(userId: number, limit = 50) {
  const notifs = await db.notifications.where('user_id').equals(userId).reverse().sortBy('created_at');
  return notifs.slice(0, limit);
}

export async function createNotification(userId: number, title: string, message: string, type: string): Promise<void> {
  await db.notifications.add({
    user_id: userId,
    title,
    message,
    type,
    is_read: 0,
    created_at: new Date().toISOString()
  });
}

export async function markNotificationRead(id: number): Promise<void> {
  await db.notifications.update(id, { is_read: 1 });
}

export async function getNotificationPrefs(userId: number) {
  const prefs = await db.notification_preferences.where('user_id').equals(userId).first();
  if (!prefs) {
    const id = await db.notification_preferences.add({
      user_id: userId,
      email_test_assigned: 1,
      email_test_reminder: 1,
      email_result_available: 1,
      inapp_test_assigned: 1,
      inapp_test_reminder: 1,
      inapp_result_available: 1
    });
    return await db.notification_preferences.get(id);
  }
  return prefs;
}

export async function updateNotificationPrefs(userId: number, data: any): Promise<void> {
  const existing = await db.notification_preferences.where('user_id').equals(userId).first();
  if (existing) {
    await db.notification_preferences.update(existing.id!, data);
  }
}

// ============ AUDIT LOGS ============
export async function addAuditLog(userId: number, userName: string, role: string, action: string, details: string): Promise<void> {
  await db.audit_logs.add({
    user_id: userId,
    user_name: userName,
    role,
    action,
    details,
    timestamp: new Date().toISOString()
  });
}

export async function getAuditLogs(filters?: { userId?: number; limit?: number }) {
  let logs = await db.audit_logs.toArray();
  if (filters?.userId) logs = logs.filter(l => l.user_id === filters.userId);
  logs = logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return logs.slice(0, filters?.limit || 100);
}

// ============ UPDATE TEST STATUS ============
export async function updateTestStatuses(): Promise<void> {
  const now = new Date();
  const allTests = await db.tests.toArray();
  
  for (const test of allTests) {
    const startTime = new Date(test.start_time);
    const endTime = new Date(test.end_time);
    
    if (test.status === 'upcoming' && startTime <= now && endTime >= now) {
      await db.tests.update(test.id!, { status: 'active', is_locked: 1 });
    } else if ((test.status === 'upcoming' || test.status === 'active') && endTime < now) {
      await db.tests.update(test.id!, { status: 'expired' });
    }
  }
}
