// @ts-nocheck
import initSqlJs from 'sql.js';

let db: any = null;
let initPromise: Promise<void> | null = null;

const DB_KEY = 'superior_test_db_v2';

export async function getDB(): Promise<any> {
  if (db) return db;
  if (initPromise) { await initPromise; return db!; }
  
  initPromise = (async () => {
    const SQL = await initSqlJs({
      locateFile: (file: string) => `https://sql.js.org/dist/${file}`
    });
    
    const saved = localStorage.getItem(DB_KEY);
    if (saved) {
      try {
        const buf = Uint8Array.from(atob(saved), c => c.charCodeAt(0));
        db = new SQL.Database(buf);
      } catch(e) {
        db = new SQL.Database();
      }
    } else {
      db = new SQL.Database();
    }
    
    createSchema();
    saveDB();
  })();
  
  await initPromise;
  return db!;
}

export function saveDB(): void {
  if (!db) return;
  try {
    const data = db.export();
    const buffer = btoa(String.fromCharCode(...data));
    localStorage.setItem(DB_KEY, buffer);
  } catch(e) {
    console.error('DB save error:', e);
  }
}

function createSchema(): void {
  if (!db) return;
  
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      role TEXT NOT NULL,
      full_name TEXT NOT NULL,
      phone TEXT,
      father_name TEXT,
      class_id INTEGER,
      section_id INTEGER,
      roll_number TEXT,
      username TEXT UNIQUE,
      is_active INTEGER DEFAULT 1,
      is_verified INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS otp_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      otp TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      attempts INTEGER DEFAULT 0,
      used INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`CREATE TABLE IF NOT EXISTS classes (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, academic_year TEXT, created_at TEXT DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS sections (
    id INTEGER PRIMARY KEY AUTOINCREMENT, class_id INTEGER NOT NULL, name TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS subjects (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, category TEXT, created_at TEXT DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS teacher_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT, teacher_id INTEGER NOT NULL, class_id INTEGER NOT NULL, section_id INTEGER NOT NULL, subject_id INTEGER NOT NULL, created_at TEXT DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS tests (
    id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, subject_id INTEGER NOT NULL, class_id INTEGER NOT NULL, section_id INTEGER NOT NULL,
    created_by INTEGER NOT NULL, status TEXT DEFAULT 'draft', start_time TEXT NOT NULL, end_time TEXT NOT NULL,
    duration INTEGER NOT NULL, marks_per_question REAL DEFAULT 1, negative_marking REAL DEFAULT 0,
    max_attempts INTEGER DEFAULT 1, randomize_questions INTEGER DEFAULT 0, randomize_options INTEGER DEFAULT 0,
    show_result_immediately INTEGER DEFAULT 1, is_locked INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT, test_id INTEGER NOT NULL, question_text TEXT NOT NULL,
    option_a TEXT NOT NULL, option_b TEXT NOT NULL, option_c TEXT NOT NULL, option_d TEXT NOT NULL,
    correct_answer TEXT NOT NULL, question_order INTEGER NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS question_bank (
    id INTEGER PRIMARY KEY AUTOINCREMENT, teacher_id INTEGER NOT NULL, subject_id INTEGER NOT NULL,
    class_id INTEGER, chapter TEXT, difficulty TEXT, question_text TEXT NOT NULL,
    option_a TEXT NOT NULL, option_b TEXT NOT NULL, option_c TEXT NOT NULL, option_d TEXT NOT NULL,
    correct_answer TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS test_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT, test_id INTEGER NOT NULL, student_id INTEGER NOT NULL,
    attempt_number INTEGER NOT NULL, started_at TEXT NOT NULL, submitted_at TEXT,
    status TEXT DEFAULT 'in_progress', total_marks REAL DEFAULT 0, obtained_marks REAL DEFAULT 0,
    percentage REAL DEFAULT 0, correct_count INTEGER DEFAULT 0, wrong_count INTEGER DEFAULT 0,
    unanswered_count INTEGER DEFAULT 0, tab_switch_count INTEGER DEFAULT 0
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS student_answers (
    id INTEGER PRIMARY KEY AUTOINCREMENT, attempt_id INTEGER NOT NULL, question_id INTEGER NOT NULL,
    selected_answer TEXT DEFAULT '', is_correct INTEGER DEFAULT 0, marks_obtained REAL DEFAULT 0,
    saved_at TEXT DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, title TEXT NOT NULL,
    message TEXT NOT NULL, type TEXT DEFAULT 'system', is_read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS notification_preferences (
    id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL UNIQUE,
    email_test_assigned INTEGER DEFAULT 1, email_test_reminder INTEGER DEFAULT 1,
    email_result_available INTEGER DEFAULT 1, inapp_test_assigned INTEGER DEFAULT 1,
    inapp_test_reminder INTEGER DEFAULT 1, inapp_result_available INTEGER DEFAULT 1
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, user_name TEXT NOT NULL,
    role TEXT NOT NULL, action TEXT NOT NULL, details TEXT, timestamp TEXT DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, token TEXT UNIQUE NOT NULL,
    expires_at INTEGER NOT NULL, created_at TEXT DEFAULT (datetime('now'))
  )`);

  // Create indexes
  db.run(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_tests_status ON tests(status)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_tests_class ON tests(class_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_attempts_student ON test_attempts(student_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_attempts_test ON test_attempts(test_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)`);
}

export function runSQL(sql: string, params: any[] = []): void {
  if (!db) throw new Error('Database not initialized');
  db.run(sql, params);
  saveDB();
}

export function querySQL<T = any>(sql: string, params: any[] = []): T[] {
  if (!db) throw new Error('Database not initialized');
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  const results: T[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return results;
}

export function queryOne<T = any>(sql: string, params: any[] = []): T | null {
  const results = querySQL<T>(sql, params);
  return results.length > 0 ? results[0] : null;
}

export function insertAndGetId(sql: string, params: any[] = []): number {
  if (!db) throw new Error('Database not initialized');
  db.run(sql, params);
  const result = queryOne<{ id: number }>('SELECT last_insert_rowid() as id');
  saveDB();
  return result?.id || 0;
}

export function resetDatabase(): void {
  localStorage.removeItem(DB_KEY);
  if (db) { try { db.close(); } catch(e){} }
  db = null;
  initPromise = null;
}
