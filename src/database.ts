// Database Layer - Firestore Implementation
// Uses Firestore API (collections, documents, queries)
// Works locally with localStorage - NO Firebase dependency required!

import * as firestore from './firestore';

// Initialize database - instant, no async operations
export async function initDatabase(): Promise<void> {
  // Database is ready immediately - using localStorage
  console.log('✓ Database initialized (local mode - localStorage)');
}

// Collection references
export const collections = {
  users: firestore.collection('users'),
  otp_records: firestore.collection('otp_records'),
  classes: firestore.collection('classes'),
  sections: firestore.collection('sections'),
  subjects: firestore.collection('subjects'),
  teacher_assignments: firestore.collection('teacher_assignments'),
  tests: firestore.collection('tests'),
  questions: firestore.collection('questions'),
  question_bank: firestore.collection('question_bank'),
  test_attempts: firestore.collection('test_attempts'),
  student_answers: firestore.collection('student_answers'),
  notifications: firestore.collection('notifications'),
  notification_preferences: firestore.collection('notification_preferences'),
  audit_logs: firestore.collection('audit_logs'),
  sessions: firestore.collection('sessions')
};

// Re-export Firestore utilities
export { firestore };
