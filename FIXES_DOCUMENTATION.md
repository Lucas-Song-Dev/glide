# Bug Fixes Documentation

This document provides detailed information about all bugs fixed in the SecureBank application, including root causes, solutions, and preventive measures.

## Table of Contents

1. [Security Issues](#security-issues)
2. [Validation Issues](#validation-issues)
3. [Performance & Logic Issues](#performance--logic-issues)
4. [UI Issues](#ui-issues)

---

## Security Issues

### SEC-301: SSN Storage in Plaintext

**Severity**: Critical  
**Location**: `lib/db/schema.ts`, `server/routers/auth.ts`

**Root Cause**:  
Social Security Numbers (SSNs) were being stored in plaintext in the database, creating a severe privacy and compliance risk. If the database were compromised, all SSNs would be immediately accessible.

**Solution**:  
Implemented one-way hashing using SHA-256 with a salt before storing SSNs. The SSN is hashed using `crypto.createHash()` with a salt from environment variables.

```typescript
function hashSSN(ssn: string): string {
  return createHash("sha256")
    .update(ssn + (process.env.SSN_SALT || "default-salt"))
    .digest("hex");
}
```

**Preventive Measures**:
- Always hash sensitive PII before storage
- Use environment variables for salts
- Never log or display SSNs in plaintext
- Consider using dedicated encryption libraries for production

---

### SEC-302: Insecure Random Number Generation

**Severity**: High  
**Location**: `server/routers/account.ts`

**Root Cause**:  
Account numbers were generated using `Math.random()`, which is not cryptographically secure and can be predictable, potentially allowing account number guessing attacks.

**Solution**:  
Replaced `Math.random()` with `crypto.randomBytes()` for cryptographically secure random number generation.

```typescript
function generateAccountNumber(): string {
  const randomNum = randomBytes(4).readUInt32BE(0);
  return randomNum.toString().padStart(10, "0");
}
```

**Preventive Measures**:
- Always use `crypto.randomBytes()` or similar secure random generators for sensitive data
- Never use `Math.random()` for security-critical operations
- Review code for any other uses of insecure random number generation

---

### SEC-303: XSS Vulnerability

**Severity**: Critical  
**Location**: `components/TransactionList.tsx`

**Root Cause**:  
Transaction descriptions were rendered using `dangerouslySetInnerHTML` without sanitization, allowing potential cross-site scripting (XSS) attacks if malicious HTML/JavaScript was injected into transaction descriptions.

**Solution**:  
Removed `dangerouslySetInnerHTML` and replaced it with safe text rendering. React automatically escapes HTML entities when rendering text content.

```typescript
// Before
{transaction.description ? (
  <span dangerouslySetInnerHTML={{ __html: transaction.description }} />
) : "-"}

// After
{transaction.description || "-"}
```

**Preventive Measures**:
- Never use `dangerouslySetInnerHTML` without proper sanitization
- Use React's built-in text rendering which automatically escapes HTML
- If HTML rendering is necessary, use a sanitization library like DOMPurify
- Validate and sanitize all user input on the backend

---

### SEC-304: Session Management

**Severity**: High  
**Location**: `server/routers/auth.ts`

**Root Cause**:  
Multiple valid sessions could exist per user with no limit or invalidation mechanism. This created a security risk where old sessions could remain active even after new logins, potentially allowing unauthorized access.

**Solution**:  
Implemented session limiting to 5 active sessions per user. When a new session is created (signup or login), old sessions are invalidated if the limit is exceeded, keeping only the 4 most recent sessions.

```typescript
// Invalidate old sessions for this user (limit to 5 active sessions)
const existingSessions = await db.select()
  .from(sessions)
  .where(eq(sessions.userId, user.id));

if (existingSessions.length >= 5) {
  const sessionsToDelete = existingSessions
    .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
    .slice(4);
  
  for (const session of sessionsToDelete) {
    await db.delete(sessions).where(eq(sessions.token, session.token));
  }
}
```

**Preventive Measures**:
- Implement session limits per user
- Invalidate old sessions on new logins
- Add session expiration checks
- Monitor for suspicious session activity

---

## Validation Issues

### VAL-201: Email Validation Problems

**Severity**: High  
**Location**: `app/signup/page.tsx`, `server/routers/auth.ts`

**Root Cause**:  
Email validation used a weak regex pattern (`/^\S+@\S+$/i`) that accepted many invalid formats. Additionally, emails were silently converted to lowercase without notifying users, and common typos like ".con" instead of ".com" were not caught.

**Solution**:  
Enhanced email validation with:
1. Better regex pattern: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/i`
2. Detection of common TLD typos (`.con`, `.c0m`, `.comm`, etc.)
3. Validation of valid TLD extensions
4. Frontend validation to match backend

```typescript
email: z
  .string()
  .email("Invalid email format")
  .toLowerCase()
  .refine(
    (value) => {
      const invalidTlds = [".con", ".c0m", ".comm", ".netl", ".orgn"];
      return !invalidTlds.some((tld) => value.toLowerCase().endsWith(tld));
    },
    { message: "Email contains invalid domain extension" }
  )
```

**Preventive Measures**:
- Use comprehensive email validation libraries when possible
- Validate on both frontend and backend
- Provide clear error messages for invalid formats
- Consider email verification via confirmation links

---

### VAL-202: Date of Birth Validation

**Severity**: Critical  
**Location**: `app/signup/page.tsx`, `server/routers/auth.ts`

**Root Cause**:  
No validation existed for date of birth, allowing future dates and accepting minors, which could lead to compliance issues.

**Solution**:  
Added validation to ensure:
1. Date is not in the future
2. User is at least 18 years old
3. Proper age calculation accounting for month and day

```typescript
dateOfBirth: z.string().refine(
  (value) => {
    const birthDate = new Date(value);
    const today = new Date();
    if (birthDate > today) return false;
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    const dayDiff = today.getDate() - birthDate.getDate();
    const actualAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;
    return actualAge >= 18;
  },
  { message: "You must be at least 18 years old and date cannot be in the future" }
)
```

**Preventive Measures**:
- Always validate date inputs
- Use proper age calculation (accounting for month/day)
- Store dates in consistent formats
- Consider timezone handling for international users

---

### VAL-203: State Code Validation

**Severity**: Medium  
**Location**: `app/signup/page.tsx`, `server/routers/auth.ts`

**Root Cause**:  
Only the length of state codes was validated (2 characters), allowing invalid codes like "XX" to be accepted.

**Solution**:  
Added validation against a list of all valid US state codes (50 states + DC).

```typescript
state: z
  .string()
  .length(2)
  .toUpperCase()
  .refine(
    (value) => {
      const validStates = [
        "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
        // ... all 50 states + DC
      ];
      return validStates.includes(value);
    },
    { message: "Invalid state code. Please use a valid 2-letter US state code." }
  )
```

**Preventive Measures**:
- Validate against known valid values for enum-like fields
- Keep validation lists up-to-date
- Consider using a validation library for address validation

---

### VAL-204: Phone Number Format

**Severity**: Medium  
**Location**: `app/signup/page.tsx`, `server/routers/auth.ts`

**Root Cause**:  
Phone number validation was too permissive, accepting any 10-15 digit string without proper format validation.

**Solution**:  
Implemented comprehensive phone number validation supporting:
1. US formats: `(xxx) xxx-xxxx`, `xxx-xxx-xxxx`, `xxx.xxx.xxxx`, `xxxxxxxxxx`, `+1xxxxxxxxxx`
2. International formats: `+xxxxxxxxxxxxx`
3. Normalization to digits-only for storage

```typescript
phoneNumber: z
  .string()
  .refine(
    (value) => {
      const usFormat = /^(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/;
      const intlFormat = /^\+\d{1,15}$/;
      return usFormat.test(value.replace(/\s/g, "")) || intlFormat.test(value);
    },
    { message: "Invalid phone number format" }
  )
  .transform((value) => value.replace(/\D/g, ""))
```

**Preventive Measures**:
- Use phone number validation libraries (e.g., libphonenumber-js)
- Normalize phone numbers for storage
- Validate on both frontend and backend
- Consider SMS verification for important operations

---

### VAL-205: Zero Amount Funding

**Severity**: High  
**Location**: `components/FundingModal.tsx`, `server/routers/account.ts`

**Root Cause**:  
Frontend validation allowed 0.0 amounts, and backend validation could be bypassed, creating unnecessary transaction records.

**Solution**:  
Added strict validation on both frontend and backend to reject amounts <= 0.

```typescript
// Frontend
validate: {
  minAmount: (value) => {
    const num = parseFloat(value);
    if (isNaN(num) || num <= 0) {
      return "Amount must be greater than $0.00";
    }
    return true;
  }
}

// Backend
amount: z.number().positive().min(0.01, "Amount must be greater than $0.00")
```

**Preventive Measures**:
- Validate business rules on both frontend and backend
- Use consistent validation logic
- Test edge cases (0, negative, very large numbers)

---

### VAL-206: Card Number Validation

**Severity**: Critical  
**Location**: `components/FundingModal.tsx`

**Root Cause**:  
Card validation only checked prefix (Visa starts with 4, Mastercard with 5), without implementing the Luhn algorithm, allowing invalid card numbers to be accepted.

**Solution**:  
Implemented the Luhn algorithm for card number validation and expanded card type detection to include Visa, Mastercard, American Express, Discover, and Diners Club.

```typescript
const luhnCheck = (cardNumber: string): boolean => {
  let sum = 0;
  let isEven = false;
  for (let i = cardNumber.length - 1; i >= 0; i--) {
    let digit = parseInt(cardNumber[i]);
    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    isEven = !isEven;
  }
  return sum % 10 === 0;
};
```

**Preventive Measures**:
- Always use Luhn algorithm for card validation
- Support all major card types
- Never store full card numbers (use tokenization)
- Use PCI-compliant payment processors

---

### VAL-207: Routing Number Optional

**Severity**: High  
**Location**: `components/FundingModal.tsx`, `server/routers/account.ts`

**Root Cause**:  
Routing number was marked as required in frontend but optional in backend, allowing bank transfers without routing numbers, causing ACH transfer failures.

**Solution**:  
Added backend validation to require routing number for bank transfers using Zod's `refine` method.

```typescript
fundingSource: z
  .object({
    type: z.enum(["card", "bank"]),
    accountNumber: z.string(),
    routingNumber: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.type === "bank") {
        return data.routingNumber !== undefined && data.routingNumber.length > 0;
      }
      return true;
    },
    {
      message: "Routing number is required for bank transfers",
      path: ["routingNumber"],
    }
  )
```

**Preventive Measures**:
- Keep frontend and backend validation in sync
- Use conditional validation based on form state
- Test all form combinations
- Validate required fields based on context

---

### VAL-208: Weak Password Requirements

**Severity**: Critical  
**Location**: `app/signup/page.tsx`, `server/routers/auth.ts`

**Root Cause**:  
Password validation only checked minimum length (8 characters), without requiring complexity (uppercase, lowercase, numbers, special characters).

**Solution**:  
Added password complexity requirements:
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

```typescript
password: z
  .string()
  .min(8)
  .regex(/[A-Z]/, "Password must contain an uppercase letter")
  .regex(/[a-z]/, "Password must contain a lowercase letter")
  .regex(/\d/, "Password must contain a number")
  .regex(/[!@#$%^&*(),.?":{}|<>]/, "Password must contain a special character")
```

**Preventive Measures**:
- Enforce strong password policies
- Consider password strength meters
- Implement password history to prevent reuse
- Use secure password hashing (bcrypt, Argon2)

---

### VAL-209: Amount Input Issues

**Severity**: Medium  
**Location**: `components/FundingModal.tsx`

**Root Cause**:  
System accepted amounts with multiple leading zeros (e.g., "000100.00"), causing confusion in transaction records.

**Solution**:  
Added validation to reject amounts with multiple leading zeros.

```typescript
validate: {
  noLeadingZeros: (value) => {
    if (/^0{2,}/.test(value)) {
      return "Please remove leading zeros";
    }
    return true;
  }
}
```

**Preventive Measures**:
- Normalize numeric inputs
- Validate input format
- Provide clear formatting guidelines
- Test edge cases

---

### VAL-210: Card Type Detection

**Severity**: High  
**Location**: `components/FundingModal.tsx`

**Root Cause**:  
Card type validation only checked for Visa (starts with 4) and Mastercard (starts with 5), missing American Express, Discover, and other valid card types.

**Solution**:  
Expanded card type detection to include:
- Visa (4)
- Mastercard (5)
- American Express (34, 37)
- Discover (6011, 65)
- Diners Club (30, 36, 38)

```typescript
const cardTypes = [
  { prefix: "4", name: "Visa" },
  { prefix: "5", name: "Mastercard" },
  { prefix: "34", name: "American Express" },
  { prefix: "37", name: "American Express" },
  { prefix: "6011", name: "Discover" },
  { prefix: "65", name: "Discover" },
  // ... more types
];
```

**Preventive Measures**:
- Support all major card types
- Keep card type detection up-to-date
- Use payment processing libraries when possible

---

## Performance & Logic Issues

### PERF-401: Account Creation Error

**Severity**: Critical  
**Location**: `server/routers/account.ts`

**Root Cause**:  
If database fetch failed after account creation, the code returned a hardcoded fallback object with a $100 balance, causing incorrect balance displays.

**Solution**:  
Removed fallback data and implemented proper error handling that throws an error instead of returning incorrect data.

```typescript
// Before
return (
  account || {
    id: 0,
    userId: ctx.user.id,
    accountNumber: accountNumber!,
    accountType: input.accountType,
    balance: 100, // ❌ Hardcoded fallback
    status: "pending",
    createdAt: new Date().toISOString(),
  }
);

// After
if (!account) {
  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "Failed to create account",
  });
}
return account;
```

**Preventive Measures**:
- Never return fallback data that could be mistaken for real data
- Use proper error handling
- Log errors for debugging
- Use database transactions for atomic operations

---

### PERF-402: Logout Issues

**Severity**: Medium  
**Location**: `server/routers/auth.ts`

**Root Cause**:  
Logout always returned success even when session deletion failed, making users think they were logged out when they weren't.

**Solution**:  
Added verification of session deletion and throw error if deletion fails.

```typescript
if (token) {
  await db.delete(sessions).where(eq(sessions.token, token));
  // Verify deletion was successful
  const remainingSession = await db.select()
    .from(sessions)
    .where(eq(sessions.token, token))
    .get();
  deleted = !remainingSession;
}

if (ctx.user && !deleted) {
  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "Failed to delete session",
  });
}
```

**Preventive Measures**:
- Verify critical operations
- Return accurate status messages
- Log failures for debugging
- Test error scenarios

---

### PERF-403: Session Expiry

**Severity**: High  
**Location**: `server/trpc.ts`

**Root Cause**:  
Sessions were considered valid until the exact expiry time, creating a security risk near expiration where sessions could be used right up to the last second.

**Solution**:  
Added a 5-minute buffer before expiry, invalidating sessions 5 minutes before their actual expiration time.

```typescript
// Add 5 minute buffer before expiry
const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds
const expiryTime = new Date(session.expiresAt).getTime() - bufferTime;
if (session && expiryTime > new Date().getTime()) {
  // Session is valid
}
```

**Preventive Measures**:
- Add buffer time for session expiration
- Implement refresh token mechanism
- Monitor session usage patterns
- Set appropriate session lifetimes

---

### PERF-404: Transaction Sorting

**Severity**: Medium  
**Location**: `server/routers/account.ts`

**Root Cause**:  
Transaction queries had no explicit ordering, causing transactions to appear in random order, confusing users when reviewing transaction history.

**Solution**:  
Added `ORDER BY createdAt DESC` to sort transactions by date, most recent first.

```typescript
const accountTransactions = await db
  .select({...})
  .from(transactions)
  .innerJoin(accounts, eq(transactions.accountId, accounts.id))
  .where(eq(transactions.accountId, input.accountId))
  .orderBy(desc(transactions.createdAt));
```

**Preventive Measures**:
- Always specify ordering for list queries
- Use consistent sorting (typically newest first)
- Consider pagination for large result sets
- Test with various data sets

---

### PERF-405: Missing Transactions

**Severity**: Critical  
**Location**: `server/routers/account.ts`

**Root Cause**:  
After creating a transaction, the code used `.limit(1)` to fetch "the created transaction", but this would return any transaction, not necessarily the one just created, causing missing transactions in history.

**Solution**:  
Properly fetch the created transaction by querying with the account ID and ordering by creation date, or use the transaction ID if available.

```typescript
// Create transaction
const processedAt = new Date().toISOString();
await db.insert(transactions).values({...});

// Fetch the created transaction
const insertedTransaction = await db
  .select()
  .from(transactions)
  .where(eq(transactions.accountId, input.accountId))
  .orderBy(desc(transactions.createdAt))
  .limit(1)
  .get();
```

**Preventive Measures**:
- Use database transactions for atomic operations
- Return created record IDs when possible
- Query by specific criteria, not just limit
- Test transaction creation and retrieval

---

### PERF-406: Balance Calculation

**Severity**: Critical  
**Location**: `server/routers/account.ts`

**Root Cause**:  
Balance calculation had an unnecessary loop that added the amount 100 times, and used floating-point arithmetic without proper decimal handling, causing incorrect balances.

**Solution**:  
Removed the incorrect loop and implemented proper decimal arithmetic using rounding.

```typescript
// Before
let finalBalance = account.balance;
for (let i = 0; i < 100; i++) {
  finalBalance = finalBalance + amount / 100; // ❌ Incorrect loop
}

// After
const newBalance = Math.round((account.balance + amount) * 100) / 100;
```

**Preventive Measures**:
- Use proper decimal arithmetic (round to 2 decimal places for currency)
- Avoid unnecessary loops
- Test with various amounts
- Consider using decimal libraries for financial calculations

---

### PERF-407: Performance Degradation

**Severity**: High  
**Location**: `server/routers/account.ts`

**Root Cause**:  
N+1 query problem: for each transaction, a separate query was made to fetch account details, causing performance degradation with many transactions.

**Solution**:  
Optimized query to use a JOIN, fetching all data in a single query.

```typescript
// Before: N+1 queries
for (const transaction of accountTransactions) {
  const accountDetails = await db.select()
    .from(accounts)
    .where(eq(accounts.id, transaction.accountId))
    .get();
}

// After: Single query with JOIN
const accountTransactions = await db
  .select({
    id: transactions.id,
    // ... transaction fields
    accountType: accounts.accountType,
  })
  .from(transactions)
  .innerJoin(accounts, eq(transactions.accountId, accounts.id))
  .where(eq(transactions.accountId, input.accountId))
  .orderBy(desc(transactions.createdAt));
```

**Preventive Measures**:
- Use JOINs instead of multiple queries
- Identify and fix N+1 query problems
- Use query analyzers to find performance issues
- Add database indexes for frequently queried fields

---

### PERF-408: Resource Leak

**Severity**: Critical  
**Location**: `lib/db/index.ts`

**Root Cause**:  
Database connections were stored in an array but never closed, potentially causing resource exhaustion over time.

**Solution**:  
Removed the unnecessary connection tracking array. better-sqlite3 uses a single connection instance that's managed automatically.

```typescript
// Before
const connections: Database.Database[] = [];
export function initDb() {
  const conn = new Database(dbPath);
  connections.push(conn); // ❌ Never closed
  // ...
}

// After
// better-sqlite3 uses a single connection instance
// No need to track connections as they're managed by the Database instance
export function initDb() {
  // ...
}
```

**Preventive Measures**:
- Understand how your database library manages connections
- Close connections when done (if required)
- Use connection pooling when appropriate
- Monitor resource usage

---

## UI Issues

### UI-101: Dark Mode Text Visibility

**Severity**: Medium  
**Location**: All form input components

**Root Cause**:  
Input fields didn't specify text color for dark mode, causing text to appear white on white background, making it impossible to see what users were typing.

**Solution**:  
Added dark mode text color classes to all input fields.

```typescript
className="... text-gray-900 dark:text-gray-100"
```

**Preventive Measures**:
- Test UI in both light and dark modes
- Use Tailwind's dark mode utilities
- Ensure sufficient contrast ratios
- Test with various screen readers

---

## Testing

All fixes have been verified with comprehensive test suites covering:

- **Validation Tests**: Email, date of birth, state codes, phone numbers, passwords, card numbers, amounts
- **Security Tests**: SSN encryption, secure random generation, XSS prevention
- **Account Tests**: Balance calculation, transaction sorting, zero amount validation
- **Session Tests**: Expiry buffers, session management, logout verification

Tests run automatically on GitHub Actions for every push and pull request.

---

## Summary

**Total Issues Fixed**: 23  
**Critical Issues**: 8  
**High Priority Issues**: 8  
**Medium Priority Issues**: 7  

All fixes follow security best practices and include proper error handling, validation, and testing. The application is now more secure, performant, and user-friendly.

