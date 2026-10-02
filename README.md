# Superior Test — Online Examination Platform

A comprehensive, professional online examination management platform for schools, colleges, and educational institutions.

## ✨ Features

### 🔐 Authentication & Security
- **Student Login**: Email + OTP verification
- **Staff Login**: Username + Password + OTP (two-factor)
- **Real Password Hashing**: bcrypt with salt rounds
- **Session Management**: Token-based with expiration
- **OTP Security**: 10-minute expiry, 5 attempt limit, 60-second rate limit
- **Tab-Switch Detection**: Auto-submit after 5 warnings
- **Fullscreen Mode**: With exit detection
- **Copy/Right-Click Prevention**: During tests
- **Auto-Save**: Every 10 seconds + local backup

### 🎨 Theme Support
- **Dark Mode**: Full dark theme with smooth transitions
- **Light Mode**: Clean, professional light theme
- **Persistent**: Theme preference saved in localStorage
- **Toggle**: Available on all pages via header button

### 📊 Real Database
- **SQLite via WebAssembly**: Full relational database in the browser
- **Proper Schema**: Foreign keys, indexes, constraints
- **Persistent Storage**: Data survives page refreshes
- **SQL Support**: Full SQL query capability
- **Transactions**: Data integrity maintained

### 👨‍🎓 Student Features
- Register with email verification (OTP)
- View upcoming, active, completed, and missed tests
- Take tests with all questions on one scrollable page
- Auto-save protection against connection issues
- Countdown timer with auto-submission
- View detailed results with correct/incorrect answers
- Performance tracking with charts
- Notification system with preferences
- Profile management

### 👨‍🏫 Teacher Features
- Create tests by pasting MCQ text (smart parser)
- Configure test settings (duration, marks, negative marking, etc.)
- Preview tests before publishing
- Save as draft or publish
- Question bank with automatic saving
- View and export results (CSV)
- Manage assigned classes and sections
- Receive notifications

### 👨‍💼 Principal Features
- Full administrative control
- Manage teachers (create, enable/disable, deactivate)
- Manage students (view, search, deactivate)
- Create and manage classes, sections, and subjects
- Assign teachers to classes/sections/subjects
- View all tests and results
- Comprehensive analytics with charts
- Export reports (CSV)
- Audit logging for all actions
- System-wide notifications

## 🛠️ Technology Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS with custom dark/light theme
- **Database**: SQLite (via sql.js WebAssembly)
- **Authentication**: bcryptjs for password hashing
- **Routing**: React Router (HashRouter)
- **Charts**: Recharts
- **Icons**: Lucide React
- **Exports**: CSV (built-in), structured for PDF/Excel extension

## 📁 Project Structure

```
src/
├── App.tsx              # Main app with routing
├── context.tsx          # Auth + Theme context
├── database.ts          # SQLite database layer (sql.js)
├── api.ts               # API service layer (all DB operations)
├── utils.ts             # MCQ parser, formatters, exports
├── components.tsx       # Shared UI components
├── index.css            # Theme-aware global styles
├── main.tsx             # Entry point
└── pages/
    ├── HomePage.tsx         # Landing page
    ├── StudentRegister.tsx  # Student registration + OTP
    ├── StudentLogin.tsx     # Student login (email + OTP)
    ├── StaffLogin.tsx       # Teacher/Principal login
    ├── PrincipalSetup.tsx   # Initial principal setup
    ├── StudentDashboard.tsx # Student interface
    ├── TeacherDashboard.tsx # Teacher interface
    ├── PrincipalDashboard.tsx # Principal interface
    ├── TestTaking.tsx       # Test-taking interface
    └── TestResult.tsx       # Result display
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/superior-test.git
cd superior-test

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### First-Time Setup

1. Open the application in your browser
2. Click "Setup Principal Account" to create the initial administrator
3. Login as Principal via Staff Login
4. Create Classes and Sections
5. Create Subjects
6. Add Teachers and assign them to classes/sections/subjects
7. Students can then register and take tests

## 📋 MCQ Format

Teachers can paste questions in this format:

```
1. What is the capital of France?
A) London
B) Paris
C) Berlin
D) Madrid
Correct Answer: B

2. Which planet is closest to the Sun?
A) Venus
B) Earth
C) Mercury
D) Mars
Correct Answer: C
```

The parser handles various formatting styles including extra blank lines, markdown markers, and different separators.

## 🔒 Security Notes

- Passwords are hashed using bcrypt (10 salt rounds)
- OTPs expire after 10 minutes
- Rate limiting on OTP requests (60 seconds)
- Session tokens expire after 24 hours
- All admin actions are logged in audit trail
- Test security: tab detection, fullscreen, auto-save

## 🌐 Deployment

### Static Hosting (GitHub Pages, Netlify, Vercel)

```bash
npm run build
# Deploy the dist/ folder
```

The application uses HashRouter for compatibility with static hosting.

### Production Considerations

For a full production deployment with:
- Real email OTP delivery → Integrate SendGrid/AWS SES in `api.ts`
- Server-side database → Replace sql.js with PostgreSQL/MySQL API calls
- Multi-user sync → Add a backend server (Node.js/Express)
- Real-time features → Add WebSockets

The current architecture is designed to be easily extended by replacing the `api.ts` functions with HTTP API calls.

## 📄 License

MIT License
