# SecureBank - SDET Technical Interview

This repository contains a banking application for the Software Development Test Engineer (SDET) technical interview.

## 📋 Challenge Instructions

Please see [CHALLENGE.md](./CHALLENGE.md) for complete instructions and requirements.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start the application
npm run dev

# Open http://localhost:3000
```

## 🛠 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm test` - Run tests in watch mode
- `npm run test:run` - Run tests once
- `npm run test:coverage` - Run tests with coverage report
- `npm run db:list-users` - List all users in database
- `npm run db:list-sessions` - List all sessions
- `npm run db:clear` - Clear all database data
- `npm run db:delete-user` - Delete specific user

## 🧪 Testing

The project uses [Vitest](https://vitest.dev/) for testing. All tests are located in the `tests/` directory.

### Running Tests

```bash
# Run tests in watch mode
npm test

# Run tests once
npm run test:run

# Run tests with coverage
npm run test:coverage
```

### Test Coverage

Tests cover:
- ✅ Validation logic (email, phone, date of birth, passwords, card numbers)
- ✅ Security features (SSN encryption, secure random, XSS prevention)
- ✅ Account operations (balance calculation, transaction sorting)
- ✅ Session management (expiry, logout verification)

## 📚 Documentation

- **[FIXES_DOCUMENTATION.md](./FIXES_DOCUMENTATION.md)** - Comprehensive documentation of all bug fixes
- **[issues.md](./issues.md)** - Issue tracking and prioritization

## 🔒 Security Improvements

All security issues have been addressed:

- **SEC-301**: SSNs are now hashed before storage
- **SEC-302**: Account numbers use cryptographically secure random generation
- **SEC-303**: XSS vulnerability fixed by removing `dangerouslySetInnerHTML`
- **SEC-304**: Session management with limits and invalidation

## ✅ Fixed Issues

**Total Issues Fixed**: 23

### Critical (8)
- SEC-301: SSN Storage Encryption
- SEC-302: Secure Random Number Generation
- SEC-303: XSS Vulnerability
- VAL-202: Date of Birth Validation
- VAL-206: Card Number Validation (Luhn Algorithm)
- VAL-208: Password Complexity Requirements
- PERF-401: Account Creation Error Handling
- PERF-405: Missing Transactions

### High Priority (8)
- VAL-201: Email Validation
- VAL-205: Zero Amount Funding
- VAL-207: Routing Number Requirement
- VAL-210: Card Type Detection
- PERF-403: Session Expiry Buffer
- PERF-406: Balance Calculation
- PERF-407: Performance Optimization (N+1 queries)
- PERF-408: Resource Leak

### Medium Priority (7)
- UI-101: Dark Mode Text Visibility
- VAL-203: State Code Validation
- VAL-204: Phone Number Format
- VAL-209: Amount Input Issues
- PERF-402: Logout Verification
- PERF-404: Transaction Sorting
- SEC-304: Session Management

## 🏗️ Tech Stack

- **Frontend**: Next.js 15 (App Router), TypeScript, React, Tailwind CSS
- **Backend**: tRPC for type-safe APIs
- **Database**: SQLite with Drizzle ORM
- **Auth**: JWT-based sessions
- **Forms**: React Hook Form
- **Testing**: Vitest, Testing Library
- **CI/CD**: GitHub Actions

## 📝 Development

### Database

The app uses SQLite and will automatically create a `bank.db` file on first run.

**Helpful database commands:**

```bash
npm run db:list-users      # List all users
npm run db:list-sessions   # List all sessions
npm run db:clear          # Clear all data
npm run db:delete-user    # Delete specific user
```

### Environment Variables

Create a `.env.local` file:

```env
JWT_SECRET=your-secret-key-here
SSN_SALT=your-ssn-salt-here
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass: `npm run test:run`
6. Submit a pull request

## 📄 License

This project is for interview purposes only.

---

Good luck with the challenge!
