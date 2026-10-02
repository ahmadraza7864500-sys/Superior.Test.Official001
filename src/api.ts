// API Layer - Firestore Implementation
// All database operations using Firestore API

import { collections, firestore } from './database';
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
export async function createUser(data: any): Promise<string> {
  const passwordHash = data.password ? await hashPassword(data.password) : null;
  const docRef = await firestore.addDoc(collections.users, {
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
  return docRef.id;
}

export async function getUserByEmail(email: string) {
  const q = firestore.query(collections.users, firestore.where('email', '==', email));
  const snapshot = await q.get();
  return snapshot.docs[0]?.data() || null;
}

export async function getUserByUsername(username: string) {
  const q = firestore.query(collections.users, firestore.where('username', '==', username));
  const snapshot = await q.get();
  return snapshot.docs[0]?.data() || null;
}

export async function getUserById(id: string) {
  const docRef = firestore.doc(collections.users, id);
  const docSnap = await firestore.getDoc(docRef);
  return docSnap.exists() ? { ...docSnap.data(), id: docSnap.id } : null;
}

export async function getUsersByRole(role: string) {
  const q = firestore.query(collections.users, firestore.where('role', '==', role));
  const snapshot = await q.get();
  return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
}

export async function updateUser(id: string, data: any): Promise<void> {
  const docRef = firestore.doc(collections.users, id);
  await firestore.updateDoc(docRef, { ...data, updated_at: new Date().toISOString() });
}

export async function deleteUser(id: string): Promise<void> {
  const docRef = firestore.doc(collections.users, id);
  await firestore.updateDoc(docRef, { is_active: 0, updated_at: new Date().toISOString() });
}

// ============ OTP MANAGEMENT ============
export async function createOTP(email: string): Promise<string> {
  const otp = generateOTP();
  const expires_at = Date.now() + 10 * 60 * 1000;
  await firestore.addDoc(collections.otp_records, {
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
  const q = firestore.query(collections.otp_records, firestore.where('email', '==', email));
  const snapshot = await q.get();
  const records = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  
  // Find latest unused OTP
  const unusedRecords = records.filter(r => r.used === 0);
  if (unusedRecords.length === 0) return { success: false, message: 'No OTP found. Please request a new one.' };
  
  const latest = unusedRecords.sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )[0];
  
  if (latest.expires_at < Date.now()) return { success: false, message: 'OTP has expired. Please request a new one.' };
  if (latest.attempts >= 5) return { success: false, message: 'Too many incorrect attempts. Request a new OTP.' };
  if (latest.otp !== otp) {
    const docRef = firestore.doc(collections.otp_records, latest.id);
    await firestore.updateDoc(docRef, { attempts: latest.attempts + 1 });
    return { success: false, message: `Invalid OTP. ${5 - latest.attempts - 1} attempts remaining.` };
  }
  
  const docRef = firestore.doc(collections.otp_records, latest.id);
  await firestore.updateDoc(docRef, { used: 1 });
  return { success: true, message: 'OTP verified.' };
}

export async function checkOTPRateLimit(email: string): Promise<{ allowed: boolean; waitSeconds?: number }> {
  const q = firestore.query(collections.otp_records, firestore.where('email', '==', email));
  const snapshot = await q.get();
  const records = snapshot.docs.map(doc => doc.data());
  
  if (records.length > 0) {
    const latest = records.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
    const elapsed = Date.now() - new Date(latest.created_at).getTime();
    if (elapsed < 60000) return { allowed: false, waitSeconds: Math.ceil((60000 - elapsed) / 1000) };
  }
  return { allowed: true };
}

// ============ SESSION MANAGEMENT ============
export async function createSession(userId: string): Promise<string> {
  const token = generateToken();
  const expires_at = Date.now() + 24 * 60 * 60 * 1000;
  await firestore.addDoc(collections.sessions, {
    user_id: userId,
    token,
    expires_at,
    created_at: new Date().toISOString()
  });
  return token;
}

export async function validateSession(token: string) {
  const q = firestore.query(collections.sessions, firestore.where('token', '==', token));
  const snapshot = await q.get();
  const session = snapshot.docs[0]?.data();
  
  if (!session || session.expires_at < Date.now()) return null;
  return await getUserById(session.user_id);
}

export async function deleteSession(token: string): Promise<void> {
  const q = firestore.query(collections.sessions, firestore.where('token', '==', token));
  const snapshot = await q.get();
  if (snapshot.docs[0]) {
    const docRef = firestore.doc(collections.sessions, snapshot.docs[0].id);
    await firestore.deleteDoc(docRef);
  }
}

// ============ CLASSES & SECTIONS ============
export async function getClasses() {
  const snapshot = await firestore.getDocs(collections.classes);
  return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
}

export async function createClass(name: string, academic_year: string): Promise<string> {
  const docRef = await firestore.addDoc(collections.classes, {
    name,
    academic_year,
    created_at: new Date().toISOString()
  });
  return docRef.id;
}

export async function deleteClass(id: string): Promise<void> {
  // Delete associated sections
  const sectionsQ = firestore.query(collections.sections, firestore.where('class_id', '==', id));
  const sectionsSnapshot = await sectionsQ.get();
  for (const doc of sectionsSnapshot.docs) {
    await firestore.deleteDoc(firestore.doc(collections.sections, doc.id));
  }
  // Delete class
  const docRef = firestore.doc(collections.classes, id);
  await firestore.deleteDoc(docRef);
}

export async function getSections(classId?: string) {
  if (classId) {
    const q = firestore.query(collections.sections, firestore.where('class_id', '==', classId));
    const snapshot = await q.get();
    return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  }
  const snapshot = await firestore.getDocs(collections.sections);
  return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
}

export async function createSection(class_id: string, name: string): Promise<string> {
  const docRef = await firestore.addDoc(collections.sections, {
    class_id,
    name,
    created_at: new Date().toISOString()
  });
  return docRef.id;
}

export async function deleteSection(id: string): Promise<void> {
  const docRef = firestore.doc(collections.sections, id);
  await firestore.deleteDoc(docRef);
}

// ============ SUBJECTS ============
export async function getSubjects() {
  const snapshot = await firestore.getDocs(collections.subjects);
  return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
}

export async function createSubject(name: string, category?: string): Promise<string> {
  const docRef = await firestore.addDoc(collections.subjects, {
    name,
    category: category || null,
    created_at: new Date().toISOString()
  });
  return docRef.id;
}

export async function deleteSubject(id: string): Promise<void> {
  const docRef = firestore.doc(collections.subjects, id);
  await firestore.deleteDoc(docRef);
}

// ============ TEACHER ASSIGNMENTS ============
export async function getTeacherAssignments(teacherId?: string) {
  if (teacherId) {
    const q = firestore.query(collections.teacher_assignments, firestore.where('teacher_id', '==', teacherId));
    const snapshot = await q.get();
    return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  }
  const snapshot = await firestore.getDocs(collections.teacher_assignments);
  return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
}

export async function createAssignment(teacher_id: string, class_id: string, section_id: string, subject_id: string): Promise<string> {
  const docRef = await firestore.addDoc(collections.teacher_assignments, {
    teacher_id,
    class_id,
    section_id,
    subject_id,
    created_at: new Date().toISOString()
  });
  return docRef.id;
}

export async function deleteAssignment(id: string): Promise<void> {
  const docRef = firestore.doc(collections.teacher_assignments, id);
  await firestore.deleteDoc(docRef);
}

// ============ TESTS ============
export async function getTests(filters?: { createdBy?: string; classId?: string; status?: string }) {
  const snapshot = await firestore.getDocs(collections.tests);
  let tests = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  
  if (filters?.createdBy) tests = tests.filter((t: any) => t.created_by === filters.createdBy);
  if (filters?.classId) tests = tests.filter((t: any) => t.class_id === filters.classId);
  if (filters?.status) tests = tests.filter((t: any) => t.status === filters.status);
  
  return tests.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function getTest(id: string) {
  const docRef = firestore.doc(collections.tests, id);
  const docSnap = await firestore.getDoc(docRef);
  return docSnap.exists() ? { ...docSnap.data(), id: docSnap.id } : null;
}

export async function createTest(data: any): Promise<string> {
  const docRef = await firestore.addDoc(collections.tests, {
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
  return docRef.id;
}

export async function updateTest(id: string, data: any): Promise<void> {
  const docRef = firestore.doc(collections.tests, id);
  await firestore.updateDoc(docRef, { ...data, updated_at: new Date().toISOString() });
}

export async function deleteTest(id: string): Promise<void> {
  // Delete associated questions
  const questionsQ = firestore.query(collections.questions, firestore.where('test_id', '==', id));
  const questionsSnapshot = await questionsQ.get();
  for (const doc of questionsSnapshot.docs) {
    await firestore.deleteDoc(firestore.doc(collections.questions, doc.id));
  }
  // Delete test
  const docRef = firestore.doc(collections.tests, id);
  await firestore.deleteDoc(docRef);
}

// ============ QUESTIONS ============
export async function getQuestions(testId: string) {
  const q = firestore.query(collections.questions, firestore.where('test_id', '==', testId));
  const snapshot = await q.get();
  return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })).sort((a: any, b: any) => a.question_order - b.question_order);
}

export async function addQuestion(testId: string, data: any, order: number): Promise<string> {
  const docRef = await firestore.addDoc(collections.questions, {
    test_id: testId,
    question_text: data.question_text,
    option_a: data.option_a,
    option_b: data.option_b,
    option_c: data.option_c,
    option_d: data.option_d,
    correct_answer: data.correct_answer,
    question_order: order
  });
  return docRef.id;
}

export async function deleteQuestionsByTest(testId: string): Promise<void> {
  const q = firestore.query(collections.questions, firestore.where('test_id', '==', testId));
  const snapshot = await q.get();
  for (const doc of snapshot.docs) {
    await firestore.deleteDoc(firestore.doc(collections.questions, doc.id));
  }
}

// ============ QUESTION BANK ============
export async function getQuestionBank(teacherId: string, filters?: { subjectId?: string; search?: string }) {
  const q = firestore.query(collections.question_bank, firestore.where('teacher_id', '==', teacherId));
  const snapshot = await q.get();
  let questions = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  
  if (filters?.subjectId) questions = questions.filter((q: any) => q.subject_id === filters.subjectId);
  if (filters?.search) questions = questions.filter((q: any) => q.question_text.toLowerCase().includes(filters.search!.toLowerCase()));
  
  return questions.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function addToQuestionBank(data: any): Promise<string> {
  const docRef = await firestore.addDoc(collections.question_bank, {
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
  return docRef.id;
}

export async function deleteFromQuestionBank(id: string): Promise<void> {
  const docRef = firestore.doc(collections.question_bank, id);
  await firestore.deleteDoc(docRef);
}

// ============ TEST ATTEMPTS ============
export async function getAttempts(filters?: { testId?: string; studentId?: string; status?: string }) {
  const snapshot = await firestore.getDocs(collections.test_attempts);
  let attempts = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  
  if (filters?.testId) attempts = attempts.filter((a: any) => a.test_id === filters.testId);
  if (filters?.studentId) attempts = attempts.filter((a: any) => a.student_id === filters.studentId);
  if (filters?.status) attempts = attempts.filter((a: any) => a.status === filters.status);
  
  return attempts.sort((a: any, b: any) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
}

export async function getAttempt(id: string) {
  const docRef = firestore.doc(collections.test_attempts, id);
  const docSnap = await firestore.getDoc(docRef);
  return docSnap.exists() ? { ...docSnap.data(), id: docSnap.id } : null;
}

export async function createAttempt(data: any): Promise<string> {
  const docRef = await firestore.addDoc(collections.test_attempts, {
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
  return docRef.id;
}

export async function updateAttempt(id: string, data: any): Promise<void> {
  const docRef = firestore.doc(collections.test_attempts, id);
  await firestore.updateDoc(docRef, data);
}

// ============ STUDENT ANSWERS ============
export async function getStudentAnswers(attemptId: string) {
  const q = firestore.query(collections.student_answers, firestore.where('attempt_id', '==', attemptId));
  const snapshot = await q.get();
  return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
}

export async function saveStudentAnswer(attemptId: string, questionId: string, answer: string): Promise<void> {
  const q = firestore.query(collections.student_answers, 
    firestore.where('attempt_id', '==', attemptId),
    firestore.where('question_id', '==', questionId)
  );
  const snapshot = await q.get();
  
  if (snapshot.docs.length > 0) {
    const docRef = firestore.doc(collections.student_answers, snapshot.docs[0].id);
    await firestore.updateDoc(docRef, {
      selected_answer: answer,
      saved_at: new Date().toISOString()
    });
  } else {
    await firestore.addDoc(collections.student_answers, {
      attempt_id: attemptId,
      question_id: questionId,
      selected_answer: answer,
      is_correct: 0,
      marks_obtained: 0,
      saved_at: new Date().toISOString()
    });
  }
}

export async function gradeAttempt(attemptId: string): Promise<void> {
  const attempt = await getAttempt(attemptId);
  if (!attempt) return;
  const test = await getTest(attempt.test_id);
  if (!test) return;
  
  const questions = await getQuestions(test.id!);
  const answers = await getStudentAnswers(attemptId);
  
  let correct = 0, wrong = 0, unanswered = 0, obtained = 0;
  
  for (const q of questions) {
    const ans = answers.find((a: any) => a.question_id === q.id);
    if (!ans || !ans.selected_answer) {
      unanswered++;
    } else if (ans.selected_answer === q.correct_answer) {
      correct++;
      obtained += test.marks_per_question;
      const docRef = firestore.doc(collections.student_answers, ans.id);
      await firestore.updateDoc(docRef, { is_correct: 1, marks_obtained: test.marks_per_question });
    } else {
      wrong++;
      obtained -= test.negative_marking;
      const docRef = firestore.doc(collections.student_answers, ans.id);
      await firestore.updateDoc(docRef, { is_correct: 0, marks_obtained: -test.negative_marking });
    }
  }
  
  const total = questions.length * test.marks_per_question;
  const percentage = total > 0 ? Math.max(0, Math.round((obtained / total) * 10000) / 100) : 0;
  
  const docRef = firestore.doc(collections.test_attempts, attemptId);
  await firestore.updateDoc(docRef, {
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
export async function getNotifications(userId: string, limit = 50) {
  const q = firestore.query(collections.notifications, firestore.where('user_id', '==', userId));
  const snapshot = await q.get();
  const notifs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  return notifs.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, limit);
}

export async function createNotification(userId: string, title: string, message: string, type: string): Promise<void> {
  await firestore.addDoc(collections.notifications, {
    user_id: userId,
    title,
    message,
    type,
    is_read: 0,
    created_at: new Date().toISOString()
  });
}

export async function markNotificationRead(id: string): Promise<void> {
  const docRef = firestore.doc(collections.notifications, id);
  await firestore.updateDoc(docRef, { is_read: 1 });
}

export async function getNotificationPrefs(userId: string) {
  const q = firestore.query(collections.notification_preferences, firestore.where('user_id', '==', userId));
  const snapshot = await q.get();
  
  if (snapshot.docs.length === 0) {
    const docRef = await firestore.addDoc(collections.notification_preferences, {
      user_id: userId,
      email_test_assigned: 1,
      email_test_reminder: 1,
      email_result_available: 1,
      inapp_test_assigned: 1,
      inapp_test_reminder: 1,
      inapp_result_available: 1
    });
    const docSnap = await firestore.getDoc(firestore.doc(collections.notification_preferences, docRef.id));
    return { ...docSnap.data(), id: docSnap.id };
  }
  
  return { ...snapshot.docs[0].data(), id: snapshot.docs[0].id };
}

export async function updateNotificationPrefs(userId: string, data: any): Promise<void> {
  const q = firestore.query(collections.notification_preferences, firestore.where('user_id', '==', userId));
  const snapshot = await q.get();
  
  if (snapshot.docs.length > 0) {
    const docRef = firestore.doc(collections.notification_preferences, snapshot.docs[0].id);
    await firestore.updateDoc(docRef, data);
  }
}

// ============ AUDIT LOGS ============
export async function addAuditLog(userId: string, userName: string, role: string, action: string, details: string): Promise<void> {
  await firestore.addDoc(collections.audit_logs, {
    user_id: userId,
    user_name: userName,
    role,
    action,
    details,
    timestamp: new Date().toISOString()
  });
}

export async function getAuditLogs(filters?: { userId?: string; limit?: number }) {
  const snapshot = await firestore.getDocs(collections.audit_logs);
  let logs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  
  if (filters?.userId) logs = logs.filter((l: any) => l.user_id === filters.userId);
  logs = logs.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return logs.slice(0, filters?.limit || 100);
}

// ============ UPDATE TEST STATUS ============
export async function updateTestStatuses(): Promise<void> {
  const now = new Date();
  const snapshot = await firestore.getDocs(collections.tests);
  const allTests = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  
  for (const test of allTests) {
    const startTime = new Date(test.start_time);
    const endTime = new Date(test.end_time);
    
    if (test.status === 'upcoming' && startTime <= now && endTime >= now) {
      const docRef = firestore.doc(collections.tests, test.id);
      await firestore.updateDoc(docRef, { status: 'active', is_locked: 1 });
    } else if ((test.status === 'upcoming' || test.status === 'active') && endTime < now) {
      const docRef = firestore.doc(collections.tests, test.id);
      await firestore.updateDoc(docRef, { status: 'expired' });
    }
  }
}
