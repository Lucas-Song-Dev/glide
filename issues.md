# Issues Documentation

This document groups all reported issues by severity and ranks them by implementation speed (fastest to slowest).

## Critical Severity Issues

### Fastest to Implement

1. **SEC-303: XSS Vulnerability** (Fast - ~15 min)
   - **Location**: `components/TransactionList.tsx:71`
   - **Issue**: `dangerouslySetInnerHTML` used without sanitization
   - **Fix**: Replace with safe text rendering or sanitize HTML
   - **Impact**: Critical security risk

2. **VAL-202: Date of Birth Validation** (Fast - ~20 min)
   - **Location**: `app/signup/page.tsx` (frontend) + `server/routers/auth.ts:19` (backend)
   - **Issue**: No validation for future dates or minimum age
   - **Fix**: Add date validation to ensure age >= 18 and date is in the past
   - **Impact**: Compliance risk with accepting minors

3. **VAL-206: Card Number Validation** (Fast - ~25 min)
   - **Location**: `components/FundingModal.tsx:120-122`
   - **Issue**: Only checks prefix, no Luhn algorithm validation
   - **Fix**: Implement Luhn algorithm for card validation
   - **Impact**: Failed transactions and customer frustration

4. **VAL-208: Weak Password Requirements** (Fast - ~30 min)
   - **Location**: `server/routers/auth.ts:15` + `app/signup/page.tsx`
   - **Issue**: Only checks length (min 8), no complexity requirements
   - **Fix**: Add password complexity validation (uppercase, lowercase, number, special char)
   - **Impact**: Account security risks

5. **PERF-401: Account Creation Error** (Fast - ~30 min)
   - **Location**: `server/routers/account.ts:57-67`
   - **Issue**: Returns hardcoded fallback with $100 balance if DB fetch fails
   - **Fix**: Proper error handling, don't return fallback data
   - **Impact**: Incorrect balance displays

### Medium Implementation Time

6. **SEC-301: SSN Storage** (Medium - ~45 min)
   - **Location**: `lib/db/schema.ts:12` + `server/routers/auth.ts:20,39`
   - **Issue**: SSNs stored in plaintext
   - **Fix**: Hash/encrypt SSNs before storage (requires migration strategy)
   - **Impact**: Severe privacy and compliance risk

7. **PERF-405: Missing Transactions** (Medium - ~1 hour)
   - **Location**: `server/routers/account.ts:123`
   - **Issue**: Transaction query uses `.limit(1)` instead of getting the created transaction
   - **Fix**: Return the created transaction ID or query by accountId and order properly
   - **Impact**: Users cannot verify all transactions

8. **PERF-406: Balance Calculation** (Medium - ~1 hour)
   - **Location**: `server/routers/account.ts:133-141`
   - **Issue**: Incorrect balance calculation loop and float precision issues
   - **Fix**: Remove unnecessary loop, use proper decimal arithmetic
   - **Impact**: Critical financial discrepancies

9. **PERF-408: Resource Leak** (Medium - ~1 hour)
   - **Location**: `lib/db/index.ts:10-14`
   - **Issue**: Database connections stored in array but never closed
   - **Fix**: Implement proper connection pooling or close connections
   - **Impact**: System resource exhaustion

### Slower Implementation

10. **SEC-302: Insecure Random Numbers** (Medium-Slow - ~1.5 hours)
    - **Location**: `server/routers/account.ts:8-12`
    - **Issue**: Uses `Math.random()` for account number generation
    - **Fix**: Use crypto-secure random number generator
    - **Impact**: Potentially predictable account numbers

## High Severity Issues

### Fastest to Implement

1. **VAL-205: Zero Amount Funding** (Fast - ~10 min)
   - **Location**: `components/FundingModal.tsx:77-79` + `server/routers/account.ts:80`
   - **Issue**: Frontend allows 0.0, backend allows 0 via `.positive()` but validation may be bypassed
   - **Fix**: Ensure both frontend and backend reject 0 amounts
   - **Impact**: Creates unnecessary transaction records

2. **VAL-207: Routing Number Optional** (Fast - ~15 min)
   - **Location**: `components/FundingModal.tsx:137-143`
   - **Issue**: Routing number marked as required in frontend but backend allows optional
   - **Fix**: Ensure backend validation requires routing number for bank transfers
   - **Impact**: Failed ACH transfers

3. **VAL-210: Card Type Detection** (Fast - ~20 min)
   - **Location**: `components/FundingModal.tsx:120-122`
   - **Issue**: Only checks for Visa (4) and Mastercard (5), missing Amex, Discover, etc.
   - **Fix**: Expand card type detection to include all major card types
   - **Impact**: Valid cards being rejected

4. **PERF-403: Session Expiry** (Fast - ~25 min)
   - **Location**: `server/trpc.ts:57`
   - **Issue**: Session valid until exact expiry time, no buffer
   - **Fix**: Add buffer time (e.g., invalidate 5 minutes before expiry)
   - **Impact**: Security risk near session expiration

5. **VAL-201: Email Validation Problems** (Fast - ~30 min)
   - **Location**: `app/signup/page.tsx:86` + `server/routers/auth.ts:14`
   - **Issue**: Weak regex pattern, silent lowercase conversion
   - **Fix**: Better email validation, notify user of case conversion
   - **Impact**: Invalid emails accepted

### Medium Implementation Time

6. **PERF-402: Logout Issues** (Medium - ~45 min)
   - **Location**: `server/routers/auth.ts:126-151`
   - **Issue**: Always returns success even if session deletion fails
   - **Fix**: Proper error handling and verification of session deletion
   - **Impact**: Users think they're logged out when they're not

7. **SEC-304: Session Management** (Medium - ~1.5 hours)
   - **Location**: `server/routers/auth.ts:111-115,62-66`
   - **Issue**: Multiple valid sessions per user, no invalidation on new login
   - **Fix**: Invalidate old sessions on new login, add session limit
   - **Impact**: Security risk from unauthorized access

8. **PERF-407: Performance Degradation** (Medium - ~2 hours)
   - **Location**: `server/routers/account.ts:171-178`
   - **Issue**: N+1 query problem - fetches account details for each transaction
   - **Fix**: Optimize query to fetch account once or use JOIN
   - **Impact**: Poor user experience during peak usage

## Medium Severity Issues

### Fastest to Implement

1. **UI-101: Dark Mode Text Visibility** (Fast - ~15 min)
   - **Location**: All form inputs across the app
   - **Issue**: Input text color not set for dark mode
   - **Fix**: Add dark mode text color classes to input fields
   - **Impact**: Poor UX in dark mode

2. **VAL-209: Amount Input Issues** (Fast - ~20 min)
   - **Location**: `components/FundingModal.tsx:70-89`
   - **Issue**: Accepts multiple leading zeros (e.g., "000100.00")
   - **Fix**: Normalize input to remove leading zeros
   - **Impact**: Confusion in transaction records

3. **VAL-203: State Code Validation** (Fast - ~30 min)
   - **Location**: `server/routers/auth.ts:23` + `app/signup/page.tsx`
   - **Issue**: Only checks length, not valid US state codes
   - **Fix**: Validate against list of valid US state codes
   - **Impact**: Address verification issues

4. **VAL-204: Phone Number Format** (Fast - ~30 min)
   - **Location**: `server/routers/auth.ts:18` + `app/signup/page.tsx`
   - **Issue**: Regex too permissive, accepts any 10-15 digit string
   - **Fix**: Better phone number validation (US format + international)
   - **Impact**: Unable to contact customers

### Medium Implementation Time

5. **PERF-404: Transaction Sorting** (Medium - ~30 min)
   - **Location**: `server/routers/account.ts:165-168`
   - **Issue**: No explicit ordering in transaction query
   - **Fix**: Add ORDER BY clause (typically by createdAt DESC)
   - **Impact**: Confusion when reviewing transaction history

## Recommended Issues to Pursue

Based on severity, impact, and implementation speed, I recommend focusing on this subset:

### Phase 1: Critical Security & Financial Integrity (Fast Wins)
1. **SEC-303: XSS Vulnerability** - Critical security, very fast fix
2. **VAL-202: Date of Birth Validation** - Compliance risk, fast fix
3. **VAL-206: Card Number Validation** - Customer impact, fast fix
4. **VAL-208: Weak Password Requirements** - Security risk, fast fix
5. **PERF-401: Account Creation Error** - Financial integrity, fast fix

### Phase 2: High Impact Validation Issues
6. **VAL-205: Zero Amount Funding** - Quick fix, prevents bad data
7. **VAL-207: Routing Number Optional** - Prevents failed transfers
8. **VAL-210: Card Type Detection** - Improves user experience
9. **PERF-403: Session Expiry** - Security improvement

### Phase 3: Critical Financial Logic
10. **PERF-405: Missing Transactions** - Data integrity
11. **PERF-406: Balance Calculation** - Critical financial accuracy

### Phase 4: Security Hardening
12. **SEC-301: SSN Storage** - Compliance requirement (requires migration planning)
13. **PERF-408: Resource Leak** - System stability

### Phase 5: UX Improvements
14. **UI-101: Dark Mode Text Visibility** - Quick UX win
15. **PERF-404: Transaction Sorting** - User experience

This prioritization balances:
- **Security**: Addressing critical vulnerabilities first
- **Financial Integrity**: Fixing balance and transaction issues
- **User Experience**: Quick wins that improve usability
- **Implementation Speed**: Tackling fast fixes first to maximize impact

