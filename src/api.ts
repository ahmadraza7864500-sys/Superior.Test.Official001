import { getDB, runSQL, querySQL, queryOne, insertAndGetId } from './database';
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

// Simulated email service - in production, integrate with SendGrid/AWS SES
export async function sendEmail(to: string, subject: string, body: string): Promise<boolean> {
  console.log(`[EMAIL SERVICE] To: ${to} | Subject: ${subject}`);
  console.log(`[EMAIL SERVICE] Body: ${body}`);
  return true;
}

// ============ USER MANAGEMENT ============
export interface UserRow {
  id: number; email: string; password_hash: string | null; role: string;
  full_name: string; phone: string | null; father_name: string | null;
  class_id: number | null; section_id: number | null; roll_number: string | null;
  username: string | null; is_active: number; is_verified: number;
  created_at: string; updated_at: string;
}

export async function createUser(data: {
  email: string; password?: string; role: string; full_name: string;
  phone?: string; father_name?: string; class_id?: number; section_id?: number;
  roll_number?: string; username?: string;
}): Promise<number> {
  await getDB();
  const passwordHash = data.password ? await hashPassword(data.password) : null;
  return insertAndGetId(
    `INSERT INTO users (email, password_hash, role, full_name, phone, father_name, class_id, section_id, roll_number, username, is_active, is_verified)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0)`,
    [data.email, passwordHash, data.role, data.full_name, data.phone || null, data.father_name || null,
     data.class_id || null, data.section_id || null, data.roll_number || null, data.username || null]
  );
}

export async function getUserByEmail(email: string): Promise<UserRow | null> {
  await getDB();
  return queryOne<UserRow>('SELECT * FROM users WHERE email = ?', [email]);
}

export async function getUserByUsername(username: string): Promise<UserRow | null> {
  await getDB();
  return queryOne<UserRow>('SELECT * FROM users WHERE username = ?', [username]);
}

export async function getUserById(id: number): Promise<UserRow | null> {
  await getDB();
  return queryOne<UserRow>('SELECT * FROM users WHERE id = ?', [id]);
}

export async function getUsersByRole(role: string): Promise<UserRow[]> {
  await getDB();
  return querySQL<UserRow>('SELECT * FROM users WHERE role = ? ORDER BY created_at DESC', [role]);
}

export async function updateUser(id: number, data: Partial<{
  full_name: string; email: string; phone: string; father_name: string;
  class_id: number; section_id: number; roll_number: string; is_active: number;
  password_hash: string; username: string;
}>): Promise<void> {
  await getDB();
  const fields: string[] = [];
  const values: any[] = [];
  for (const [key, val] of Object.entries(data)) {
    fields.push(`${key} = ?`);
    values.push(val);
  }
  fields.push("updated_at = datetime('now')");
  values.push(id);
  runSQL(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
}

export async function deleteUser(id: number): Promise<void> {
  await getDB();
  runSQL('UPDATE users SET is_active = 0, updated_at = datetime(\'now\') WHERE id = ?', [id]);
}

// ============ OTP MANAGEMENT ============
export async function createOTP(email: string): Promise<string> {
  await getDB();
  const otp = generateOTP();
  const expiresAt = Date.now() + 10 * 60 * 1000;
  insertAndGetId('INSERT INTO otp_records (email, otp, expires_at) VALUES (?, ?, ?)', [email, otp, expiresAt]);
  await sendEmail(email, 'Your OTP Code', `Your verification code is: ${otp}. Valid for 10 minutes.`);
  return otp;
}

export async function verifyOTPRecord(email: string, otp: string): Promise<{ success: boolean; message: string }> {
  await getDB();
  const record = queryOne<any>(
    'SELECT * FROM otp_records WHERE email = ? AND used = 0 ORDER BY created_at DESC LIMIT 1', [email]
  );
  if (!record) return { success: false, message: 'No OTP found. Please request a new one.' };
  if (record.expires_at < Date.now()) return { success: false, message: 'OTP has expired. Please request a new one.' };
  if (record.attempts >= 5) return { success: false, message: 'Too many incorrect attempts. Request a new OTP.' };
  if (record.otp !== otp) {
    runSQL('UPDATE otp_records SET attempts = attempts + 1 WHERE id = ?', [record.id]);
    return { success: false, message: `Invalid OTP. ${5 - record.attempts - 1} attempts remaining.` };
  }
  runSQL('UPDATE otp_records SET used = 1 WHERE id = ?', [record.id]);
  return { success: true, message: 'OTP verified.' };
}

export async function checkOTPRateLimit(email: string): Promise<{ allowed: boolean; waitSeconds?: number }> {
  await getDB();
  const last = queryOne<any>('SELECT created_at FROM otp_records WHERE email = ? ORDER BY id DESC LIMIT 1', [email]);
  if (last) {
    const elapsed = Date.now() - new Date(last.created_at + 'Z').getTime();
    if (elapsed < 60000) return { allowed: false, waitSeconds: Math.ceil((60000 - elapsed) / 1000) };
  }
  return { allowed: true };
}

// ============ SESSION MANAGEMENT ============
export async function createSession(userId: number): Promise<string> {
  await getDB();
  const token = generateToken();
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
  insertAndGetId('INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)', [userId, token, expiresAt]);
  return token;
}

export async function validateSession(token: string): Promise<UserRow | null> {
  await getDB();
  const session = queryOne<any>('SELECT * FROM sessions WHERE token = ? AND expires_at > ?', [token, Date.now()]);
  if (!session) return null;
  return getUserById(session.user_id);
}

export async function deleteSession(token: string): Promise<void> {
  await getDB();
  runSQL('DELETE FROM sessions WHERE token = ?', [token]);
}

// ============ CLASSES & SECTIONS ============
export async function getClasses() {
  await getDB();
  return querySQL('SELECT * FROM classes ORDER BY name');
}

export async function createClass(name: string, academicYear: string): Promise<number> {
  await getDB();
  return insertAndGetId('INSERT INTO classes (name, academic_year) VALUES (?, ?)', [name, academicYear]);
}

export async function deleteClass(id: number): Promise<void> {
  await getDB();
  runSQL('DELETE FROM sections WHERE class_id = ?', [id]);
  runSQL('DELETE FROM classes WHERE id = ?', [id]);
}

export async function getSections(classId?: number) {
  await getDB();
  if (classId) return querySQL('SELECT * FROM sections WHERE class_id = ? ORDER BY name', [classId]);
  return querySQL('SELECT * FROM sections ORDER BY name');
}

export async function createSection(classId: number, name: string): Promise<number> {
  await getDB();
  return insertAndGetId('INSERT INTO sections (class_id, name) VALUES (?, ?)', [classId, name]);
}

export async function deleteSection(id: number): Promise<void> {
  await getDB();
  runSQL('DELETE FROM sections WHERE id = ?', [id]);
}

// ============ SUBJECTS ============
export async function getSubjects() {
  await getDB();
  return querySQL('SELECT * FROM subjects ORDER BY name');
}

export async function createSubject(name: string, category?: string): Promise<number> {
  await getDB();
  return insertAndGetId('INSERT INTO subjects (name, category) VALUES (?, ?)', [name, category || null]);
}

export async function deleteSubject(id: number): Promise<void> {
  await getDB();
  runSQL('DELETE FROM subjects WHERE id = ?', [id]);
}

// ============ TEACHER ASSIGNMENTS ============
export async function getTeacherAssignments(teacherId?: number) {
  await getDB();
  if (teacherId) return querySQL('SELECT * FROM teacher_assignments WHERE teacher_id = ?', [teacherId]);
  return querySQL('SELECT * FROM teacher_assignments');
}

export async function createAssignment(teacherId: number, classId: number, sectionId: number, subjectId: number): Promise<number> {
  await getDB();
  return insertAndGetId('INSERT INTO teacher_assignments (teacher_id, class_id, section_id, subject_id) VALUES (?, ?, ?, ?)',
    [teacherId, classId, sectionId, subjectId]);
}

export async function deleteAssignment(id: number): Promise<void> {
  await getDB();
  runSQL('DELETE FROM teacher_assignments WHERE id = ?', [id]);
}

// ============ TESTS ============
export async function getTests(filters?: { createdBy?: number; classId?: number; status?: string }) {
  await getDB();
  let sql = 'SELECT * FROM tests WHERE 1=1';
  const params: any[] = [];
  if (filters?.createdBy) { sql += ' AND created_by = ?'; params.push(filters.createdBy); }
  if (filters?.classId) { sql += ' AND class_id = ?'; params.push(filters.classId); }
  if (filters?.status) { sql += ' AND status = ?'; params.push(filters.status); }
  sql += ' ORDER BY created_at DESC';
  return querySQL(sql, params);
}

export async function getTest(id: number) {
  await getDB();
  return queryOne('SELECT * FROM tests WHERE id = ?', [id]);
}

export async function createTest(data: any): Promise<number> {
  await getDB();
  return insertAndGetId(
    `INSERT INTO tests (title, subject_id, class_id, section_id, created_by, status, start_time, end_time,
     duration, marks_per_question, negative_marking, max_attempts, randomize_questions, randomize_options,
     show_result_immediately) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.title, data.subject_id, data.class_id, data.section_id, data.created_by, data.status || 'draft',
     data.start_time, data.end_time, data.duration, data.marks_per_question || 1, data.negative_marking || 0,
     data.max_attempts || 1, data.randomize_questions ? 1 : 0, data.randomize_options ? 1 : 0,
     data.show_result_immediately ? 1 : 0]
  );
}

export async function updateTest(id: number, data: any): Promise<void> {
  await getDB();
  const fields: string[] = [];
  const values: any[] = [];
  for (const [key, val] of Object.entries(data)) {
    fields.push(`${key} = ?`);
    values.push(typeof val === 'boolean' ? (val ? 1 : 0) : val);
  }
  fields.push("updated_at = datetime('now')");
  values.push(id);
  runSQL(`UPDATE tests SET ${fields.join(', ')} WHERE id = ?`, values);
}

export async function deleteTest(id: number): Promise<void> {
  await getDB();
  runSQL('DELETE FROM questions WHERE test_id = ?', [id]);
  runSQL('DELETE FROM tests WHERE id = ?', [id]);
}

// ============ QUESTIONS ============
export async function getQuestions(testId: number) {
  await getDB();
  return querySQL('SELECT * FROM questions WHERE test_id = ? ORDER BY question_order', [testId]);
}

export async function addQuestion(testId: number, data: any, order: number): Promise<number> {
  await getDB();
  return insertAndGetId(
    `INSERT INTO questions (test_id, question_text, option_a, option_b, option_c, option_d, correct_answer, question_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [testId, data.question_text, data.option_a, data.option_b, data.option_c, data.option_d, data.correct_answer, order]
  );
}

export async function deleteQuestionsByTest(testId: number): Promise<void> {
  await getDB();
  runSQL('DELETE FROM questions WHERE test_id = ?', [testId]);
}

// ============ QUESTION BANK ============
export async function getQuestionBank(teacherId: number, filters?: { subjectId?: number; search?: string }) {
  await getDB();
  let sql = 'SELECT * FROM question_bank WHERE teacher_id = ?';
  const params: any[] = [teacherId];
  if (filters?.subjectId) { sql += ' AND subject_id = ?'; params.push(filters.subjectId); }
  if (filters?.search) { sql += ' AND question_text LIKE ?'; params.push(`%${filters.search}%`); }
  sql += ' ORDER BY created_at DESC';
  return querySQL(sql, params);
}

export async function addToQuestionBank(data: any): Promise<number> {
  await getDB();
  return insertAndGetId(
    `INSERT INTO question_bank (teacher_id, subject_id, class_id, chapter, difficulty, question_text, option_a, option_b, option_c, option_d, correct_answer)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.teacher_id, data.subject_id, data.class_id || null, data.chapter || null, data.difficulty || null,
     data.question_text, data.option_a, data.option_b, data.option_c, data.option_d, data.correct_answer]
  );
}

export async function deleteFromQuestionBank(id: number): Promise<void> {
  await getDB();
  runSQL('DELETE FROM question_bank WHERE id = ?', [id]);
}

// ============ TEST ATTEMPTS ============
export async function getAttempts(filters?: { testId?: number; studentId?: number; status?: string }) {
  await getDB();
  let sql = 'SELECT * FROM test_attempts WHERE 1=1';
  const params: any[] = [];
  if (filters?.testId) { sql += ' AND test_id = ?'; params.push(filters.testId); }
  if (filters?.studentId) { sql += ' AND student_id = ?'; params.push(filters.studentId); }
  if (filters?.status) { sql += ' AND status = ?'; params.push(filters.status); }
  sql += ' ORDER BY started_at DESC';
  return querySQL(sql, params);
}

export async function getAttempt(id: number) {
  await getDB();
  return queryOne('SELECT * FROM test_attempts WHERE id = ?', [id]);
}

export async function createAttempt(data: any): Promise<number> {
  await getDB();
  return insertAndGetId(
    `INSERT INTO test_attempts (test_id, student_id, attempt_number, started_at, status) VALUES (?, ?, ?, datetime('now'), 'in_progress')`,
    [data.test_id, data.student_id, data.attempt_number]
  );
}

export async function updateAttempt(id: number, data: any): Promise<void> {
  await getDB();
  const fields: string[] = [];
  const values: any[] = [];
  for (const [key, val] of Object.entries(data)) {
    fields.push(`${key} = ?`);
    values.push(val);
  }
  values.push(id);
  runSQL(`UPDATE test_attempts SET ${fields.join(', ')} WHERE id = ?`, values);
}

// ============ STUDENT ANSWERS ============
export async function getStudentAnswers(attemptId: number) {
  await getDB();
  return querySQL('SELECT * FROM student_answers WHERE attempt_id = ?', [attemptId]);
}

export async function saveStudentAnswer(attemptId: number, questionId: number, answer: string): Promise<void> {
  await getDB();
  const existing = queryOne('SELECT id FROM student_answers WHERE attempt_id = ? AND question_id = ?', [attemptId, questionId]);
  if (existing) {
    runSQL('UPDATE student_answers SET selected_answer = ?, saved_at = datetime(\'now\') WHERE id = ?', [answer, existing.id]);
  } else {
    insertAndGetId('INSERT INTO student_answers (attempt_id, question_id, selected_answer) VALUES (?, ?, ?)', [attemptId, questionId, answer]);
  }
}

export async function gradeAttempt(attemptId: number): Promise<void> {
  await getDB();
  const attempt = queryOne<any>('SELECT * FROM test_attempts WHERE id = ?', [attemptId]);
  if (!attempt) return;
  const test = queryOne<any>('SELECT * FROM tests WHERE id = ?', [attempt.test_id]);
  if (!test) return;
  
  const questions = querySQL<any>('SELECT * FROM questions WHERE test_id = ?', [test.id]);
  const answers = querySQL<any>('SELECT * FROM student_answers WHERE attempt_id = ?', [attemptId]);
  
  let correct = 0, wrong = 0, unanswered = 0, obtained = 0;
  
  for (const q of questions) {
    const ans = answers.find((a: any) => a.question_id === q.id);
    if (!ans || !ans.selected_answer) {
      unanswered++;
    } else if (ans.selected_answer === q.correct_answer) {
      correct++;
      obtained += test.marks_per_question;
      runSQL('UPDATE student_answers SET is_correct = 1, marks_obtained = ? WHERE id = ?', [test.marks_per_question, ans.id]);
    } else {
      wrong++;
      obtained -= test.negative_marking;
      runSQL('UPDATE student_answers SET is_correct = 0, marks_obtained = ? WHERE id = ?', [-test.negative_marking, ans.id]);
    }
  }
  
  const total = questions.length * test.marks_per_question;
  const percentage = total > 0 ? Math.max(0, Math.round((obtained / total) * 10000) / 100) : 0;
  
  runSQL(
    `UPDATE test_attempts SET status = 'submitted', submitted_at = datetime('now'), total_marks = ?, obtained_marks = ?,
     percentage = ?, correct_count = ?, wrong_count = ?, unanswered_count = ? WHERE id = ?`,
    [total, obtained, percentage, correct, wrong, unanswered, attemptId]
  );
}

// ============ NOTIFICATIONS ============
export async function getNotifications(userId: number, limit = 50) {
  await getDB();
  return querySQL('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?', [userId, limit]);
}

export async function createNotification(userId: number, title: string, message: string, type: string): Promise<void> {
  await getDB();
  insertAndGetId('INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)', [userId, title, message, type]);
}

export async function markNotificationRead(id: number): Promise<void> {
  await getDB();
  runSQL('UPDATE notifications SET is_read = 1 WHERE id = ?', [id]);
}

export async function getNotificationPrefs(userId: number) {
  await getDB();
  const prefs = queryOne('SELECT * FROM notification_preferences WHERE user_id = ?', [userId]);
  if (!prefs) {
    insertAndGetId('INSERT INTO notification_preferences (user_id) VALUES (?)', [userId]);
    return queryOne('SELECT * FROM notification_preferences WHERE user_id = ?', [userId]);
  }
  return prefs;
}

export async function updateNotificationPrefs(userId: number, data: any): Promise<void> {
  await getDB();
  const existing = queryOne('SELECT id FROM notification_preferences WHERE user_id = ?', [userId]);
  if (existing) {
    const fields: string[] = [];
    const values: any[] = [];
    for (const [k, v] of Object.entries(data)) {
      fields.push(`${k} = ?`);
      values.push(v ? 1 : 0);
    }
    values.push(userId);
    runSQL(`UPDATE notification_preferences SET ${fields.join(', ')} WHERE user_id = ?`, values);
  }
}

// ============ AUDIT LOGS ============
export async function addAuditLog(userId: number, userName: string, role: string, action: string, details: string): Promise<void> {
  await getDB();
  insertAndGetId('INSERT INTO audit_logs (user_id, user_name, role, action, details) VALUES (?, ?, ?, ?, ?)',
    [userId, userName, role, action, details]);
}

export async function getAuditLogs(filters?: { userId?: number; limit?: number }) {
  await getDB();
  let sql = 'SELECT * FROM audit_logs WHERE 1=1';
  const params: any[] = [];
  if (filters?.userId) { sql += ' AND user_id = ?'; params.push(filters.userId); }
  sql += ' ORDER BY timestamp DESC LIMIT ?';
  params.push(filters?.limit || 100);
  return querySQL(sql, params);
}

// ============ REPORTS ============
export async function getStudentReport(classId?: number, sectionId?: number) {
  await getDB();
  let sql = `SELECT u.id, u.full_name, u.email, u.roll_number, u.is_active,
    c.name as class_name, s.name as section_name,
    (SELECT COUNT(*) FROM test_attempts ta WHERE ta.student_id = u.id AND ta.status = 'submitted') as tests_taken,
    (SELECT COALESCE(AVG(ta.percentage), 0) FROM test_attempts ta WHERE ta.student_id = u.id AND ta.status = 'submitted') as avg_percentage
    FROM users u
    LEFT JOIN classes c ON u.class_id = c.id
    LEFT JOIN sections s ON u.section_id = s.id
    WHERE u.role = 'student'`;
  const params: any[] = [];
  if (classId) { sql += ' AND u.class_id = ?'; params.push(classId); }
  if (sectionId) { sql += ' AND u.section_id = ?'; params.push(sectionId); }
  sql += ' ORDER BY u.full_name';
  return querySQL(sql, params);
}

export async function getResultReport(testId?: number, classId?: number) {
  await getDB();
  let sql = `SELECT ta.id, ta.attempt_number, ta.obtained_marks, ta.total_marks, ta.percentage,
    ta.correct_count, ta.wrong_count, ta.unanswered_count, ta.submitted_at,
    u.full_name as student_name, u.roll_number, t.title as test_title,
    sub.name as subject_name, c.name as class_name
    FROM test_attempts ta
    JOIN users u ON ta.student_id = u.id
    JOIN tests t ON ta.test_id = t.id
    LEFT JOIN subjects sub ON t.subject_id = sub.id
    LEFT JOIN classes c ON t.class_id = c.id
    WHERE ta.status = 'submitted'`;
  const params: any[] = [];
  if (testId) { sql += ' AND ta.test_id = ?'; params.push(testId); }
  if (classId) { sql += ' AND t.class_id = ?'; params.push(classId); }
  sql += ' ORDER BY ta.submitted_at DESC';
  return querySQL(sql, params);
}

// ============ UPDATE TEST STATUS ============
export async function updateTestStatuses(): Promise<void> {
  await getDB();
  const now = new Date().toISOString();
  runSQL(`UPDATE tests SET status = 'active' WHERE status = 'upcoming' AND start_time <= ? AND end_time >= ?`, [now, now]);
  runSQL(`UPDATE tests SET status = 'expired' WHERE status IN ('upcoming', 'active') AND end_time < ?`, [now]);
  runSQL(`UPDATE tests SET is_locked = 1 WHERE status = 'active'`);
}
