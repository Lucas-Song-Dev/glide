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
- ✅ Validation logic (email, phone, date of birth, passwords, card numbers, amounts)
- ✅ Security features (SSN encryption, secure random, XSS prevention, input sanitization)
- ✅ Account operations (balance calculation, transaction sorting, transaction retrieval)
- ✅ Session management (expiry, logout verification, session limits)
- ✅ Additional validations (input sanitization, amount limits, email notifications)

**Total Tests**: 56 tests, all passing

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

**Total Issues Fixed**: 23 core issues + 5 additional improvements = **28 total fixes**

### Critical (8)
- ✅ SEC-301: SSN Storage Encryption (hashed with SHA-256)
- ✅ SEC-302: Secure Random Number Generation (crypto.randomBytes)
- ✅ SEC-303: XSS Vulnerability (removed dangerouslySetInnerHTML)
- ✅ VAL-202: Date of Birth Validation (age >= 18, no future dates)
- ✅ VAL-206: Card Number Validation (Luhn Algorithm implemented)
- ✅ VAL-208: Password Complexity Requirements (uppercase, lowercase, number, special char)
- ✅ PERF-401: Account Creation Error Handling (removed fallback data)
- ✅ PERF-405: Missing Transactions (improved retrieval using processedAt)

### High Priority (8)
- ✅ VAL-201: Email Validation (enhanced regex, TLD validation, case conversion notification)
- ✅ VAL-205: Zero Amount Funding (min 0.01, max $1,000,000)
- ✅ VAL-207: Routing Number Requirement (required for bank transfers)
- ✅ VAL-210: Card Type Detection (Visa, Mastercard, Amex, Discover, Diners Club)
- ✅ PERF-403: Session Expiry Buffer (5-minute buffer before expiry)
- ✅ PERF-406: Balance Calculation (proper decimal arithmetic)
- ✅ PERF-407: Performance Optimization (N+1 queries fixed with JOIN)
- ✅ PERF-408: Resource Leak (connection management fixed)

### Medium Priority (7)
- ✅ UI-101: Dark Mode Text Visibility (text-gray-900 dark:text-gray-100)
- ✅ VAL-203: State Code Validation (valid US state codes list)
- ✅ VAL-204: Phone Number Format (US + international formats)
- ✅ VAL-209: Amount Input Issues (leading zeros normalization)
- ✅ PERF-402: Logout Verification (session deletion verification)
- ✅ PERF-404: Transaction Sorting (ORDER BY createdAt DESC)
- ✅ SEC-304: Session Management (limit 5 sessions, invalidation)

### Additional Improvements (5)
- ✅ Email case conversion user notification
- ✅ Input sanitization (prevent script injection in names/addresses)
- ✅ Transaction retrieval improvement (using processedAt timestamp)
- ✅ Amount limits (maximum $1,000,000)
- ✅ Enhanced error handling throughout

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
