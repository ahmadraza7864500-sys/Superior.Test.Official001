# Firestore Database Implementation

## Overview

Superior Test now uses **Google Firestore** as its database architecture. The application uses a Firestore-compatible API that works locally with localStorage when Firebase credentials are not configured, and seamlessly switches to cloud Firestore when you add your Firebase project credentials.

## Architecture

```
┌─────────────────────────────────────────┐
│         React Application               │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│      API Layer (src/api.ts)             │
│  - User management                      │
│  - Test operations                      │
│  - Authentication                       │
│  - Notifications                        │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│   Firestore Service (src/firestore.ts)  │
│  - collection(), doc(), query()         │
│  - getDoc(), setDoc(), updateDoc()      │
│  - addDoc(), deleteDoc()                │
│  - where(), orderBy()                   │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│   Database Layer (src/database.ts)      │
│  - Collection references                │
│  - Initialization                       │
└──────────────┬──────────────────────────┘
               │
        ┌──────┴──────┐
        │             │
        ▼             ▼
┌──────────────┐  ┌──────────────────┐
│   Local Mode │  │  Firebase Mode   │
│ (localStorage)│  │ (Cloud Firestore)│
└──────────────┘  └──────────────────┘
```

## Current Mode: Local

The application is currently running in **local mode**, which means:
- ✅ All data is stored in your browser's localStorage
- ✅ Works offline
- ✅ No Firebase configuration needed
- ✅ Perfect for development and testing
- ✅ Data persists across page refreshes

## Connecting to Real Firebase

To use cloud Firestore with real-time sync across devices:

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter project name (e.g., "superior-test")
4. Disable Google Analytics (optional)
5. Click "Create project"

### Step 2: Enable Firestore

1. In Firebase Console, go to "Firestore Database"
2. Click "Create database"
3. Choose "Start in test mode" (for development)
4. Select your preferred location
5. Click "Enable"

### Step 3: Get Configuration

1. In Firebase Console, click the gear icon ⚙️ → "Project settings"
2. Scroll down to "Your apps"
3. Click the web icon `</>`
4. Register your app with a nickname (e.g., "Superior Test Web")
5. Copy the configuration object

### Step 4: Update Configuration File

Open `src/firebase.config.ts` and replace the placeholder values:

```typescript
const firebaseConfig = {
  apiKey: "AIzaSyC..........................",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123..."
};
```

### Step 5: Update Firestore Rules

In Firebase Console → Firestore Database → Rules, update to:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read their own data
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null;
    }
    
    // Public collections (classes, subjects)
    match /classes/{doc} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    match /sections/{doc} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    match /subjects/{doc} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Tests and questions
    match /tests/{doc} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    match /questions/{doc} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Test attempts and answers
    match /test_attempts/{doc} {
      allow read, write: if request.auth != null;
    }
    
    match /student_answers/{doc} {
      allow read, write: if request.auth != null;
    }
    
    // Notifications
    match /notifications/{doc} {
      allow read, write: if request.auth != null;
    }
    
    // Audit logs
    match /audit_logs/{doc} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

### Step 6: Deploy

```bash
npm run build
# Deploy the dist/ folder to your hosting service
```

## Firestore Collections

The application uses the following collections:

| Collection | Description | Key Fields |
|------------|-------------|------------|
| `users` | All user accounts | email, role, full_name, class_id, section_id |
| `otp_records` | OTP verification records | email, otp, expires_at, used |
| `sessions` | Authentication sessions | user_id, token, expires_at |
| `classes` | Class/grade records | name, academic_year |
| `sections` | Section records | class_id, name |
| `subjects` | Subject records | name, category |
| `teacher_assignments` | Teacher-class mappings | teacher_id, class_id, section_id, subject_id |
| `tests` | Test definitions | title, subject_id, class_id, start_time, end_time |
| `questions` | Test questions | test_id, question_text, options, correct_answer |
| `question_bank` | Reusable questions | teacher_id, subject_id, question_text |
| `test_attempts` | Student test attempts | test_id, student_id, status, percentage |
| `student_answers` | Individual answers | attempt_id, question_id, selected_answer |
| `notifications` | User notifications | user_id, title, message, is_read |
| `notification_preferences` | Notification settings | user_id, email_*, inapp_* |
| `audit_logs` | Activity logs | user_id, action, details, timestamp |

## API Methods

All database operations use Firestore-compatible methods:

### Document Operations
```typescript
// Get a document
const doc = await getDoc(doc(collection('users'), 'userId'));

// Set/create a document
await setDoc(doc(collection('users'), 'userId'), { name: 'John' });

// Add a new document (auto-generated ID)
const docRef = await addDoc(collection('users'), { name: 'John' });

// Update a document
await updateDoc(doc(collection('users'), 'userId'), { name: 'Jane' });

// Delete a document
await deleteDoc(doc(collection('users'), 'userId'));
```

### Query Operations
```typescript
// Simple query
const q = query(collection('users'), where('role', '==', 'student'));
const snapshot = await getDocs(q);

// Multiple conditions
const q = query(
  collection('tests'),
  where('class_id', '==', 'class123'),
  where('status', '==', 'active')
);

// Ordering
const q = query(
  collection('audit_logs'),
  orderBy('timestamp', 'desc')
);
```

## Switching Between Local and Cloud

The application automatically detects which mode to use:

- **Local Mode**: When Firebase credentials are placeholders
- **Cloud Mode**: When real Firebase credentials are provided

You can check the current mode in the browser console:
```javascript
// Check if using placeholder credentials
console.log('Using local storage:', isUsingPlaceholderCredentials);
```

## Data Migration

To migrate from local to cloud:

1. Export data from localStorage (browser DevTools → Application → Local Storage)
2. Import data into Firestore using Firebase Console or a script
3. Update Firebase credentials in `src/firebase.config.ts`
4. Deploy the application

## Security Considerations

### Local Mode
- Data is stored in the browser's localStorage
- Accessible only on the same device/browser
- No server-side validation
- Suitable for development and single-user testing

### Cloud Mode
- Data is stored in Google Cloud Firestore
- Real-time sync across devices
- Server-side security rules
- Firebase Authentication integration (recommended)
- Suitable for production use

## Performance

### Local Mode
- ⚡ Instant reads/writes (localStorage)
- 📦 No network requests
- 💾 Limited to browser storage (~5-10MB)

### Cloud Mode
- 🌐 Network latency (typically 50-200ms)
- 🔄 Real-time updates
- 💾 Unlimited storage (Firestore limits apply)
- 📊 Built-in indexing and queries

## Troubleshooting

### "Real Firebase not configured" Error
This error appears when trying to use cloud Firestore without proper credentials.

**Solution**: Update `src/firebase.config.ts` with your Firebase project credentials.

### Data Not Syncing
If data isn't syncing across devices:

1. Verify Firebase credentials are correct
2. Check Firestore security rules allow the operations
3. Ensure you're online
4. Check browser console for errors

### Local Storage Full
If you get "QuotaExceededError":

1. Clear old data: `localStorage.clear()`
2. Switch to cloud Firestore
3. Implement data cleanup/pagination

## Next Steps

1. **Add Firebase Authentication**: Replace the custom OTP system with Firebase Auth
2. **Enable Firestore Indexes**: Add composite indexes for complex queries
3. **Set Up Monitoring**: Use Firebase Performance Monitoring
4. **Implement Offline Support**: Use Firestore's offline persistence
5. **Add Cloud Functions**: For server-side logic (email sending, etc.)

## Resources

- [Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase Console](https://console.firebase.google.com/)
- [Firestore Pricing](https://firebase.google.com/pricing#firestore)

## Support

For issues or questions:
1. Check the browser console for errors
2. Verify Firebase configuration
3. Review Firestore security rules
4. Check the [Firebase Status Dashboard](https://status.firebase.google.com/)
