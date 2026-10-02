import Dexie from 'dexie';

export const db = new Dexie('SuperiorTestDB');

db.version(1).stores({
  users: '++id, email, username, role, is_active',
  otp_records: '++id, email, expires_at',
  classes: '++id, name',
  sections: '++id, class_id, name',
  subjects: '++id, name',
  teacher_assignments: '++id, teacher_id, class_id, section_id, subject_id',
  tests: '++id, created_by, class_id, section_id, subject_id, status, start_time, end_time',
  questions: '++id, test_id, question_order',
  question_bank: '++id, teacher_id, subject_id',
  test_attempts: '++id, test_id, student_id, status',
  student_answers: '++id, attempt_id, question_id',
  notifications: '++id, user_id, is_read',
  notification_preferences: '++id, user_id',
  audit_logs: '++id, user_id, timestamp',
  sessions: '++id, user_id, token'
});

export async function initDatabase() {
  try {
    await db.open();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}
