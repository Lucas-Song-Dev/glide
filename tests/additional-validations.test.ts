import { describe, it, expect } from "vitest";
import { z } from "zod";

// Test input sanitization
describe("Input Sanitization", () => {
  const nameSchema = z
    .string()
    .min(1)
    .max(100)
    .refine(
      (value) => {
        // Prevent script injection but allow apostrophes for names like O'Connor
        return !/[<>]/.test(value);
      },
      { message: "Name contains invalid characters" }
    );

  it("should reject names with script tags", () => {
    expect(nameSchema.safeParse("<script>alert('xss')</script>").success).toBe(false);
    expect(nameSchema.safeParse("John<script>").success).toBe(false);
  });

  it("should accept valid names with apostrophes and hyphens", () => {
    expect(nameSchema.safeParse("John Doe").success).toBe(true);
    expect(nameSchema.safeParse("Mary-Jane O'Connor").success).toBe(true);
    expect(nameSchema.safeParse("John & Jane").success).toBe(true);
  });

  it("should enforce max length", () => {
    const longName = "a".repeat(101);
    expect(nameSchema.safeParse(longName).success).toBe(false);
  });
});

// Test amount limits
describe("Amount Limits", () => {
  const amountSchema = z
    .number()
    .positive()
    .min(0.01, "Amount must be greater than $0.00")
    .max(1000000, "Amount cannot exceed $1,000,000");

  it("should reject amounts exceeding maximum", () => {
    expect(amountSchema.safeParse(1000001).success).toBe(false);
    expect(amountSchema.safeParse(2000000).success).toBe(false);
  });

  it("should accept amounts within limits", () => {
    expect(amountSchema.safeParse(0.01).success).toBe(true);
    expect(amountSchema.safeParse(1000000).success).toBe(true);
    expect(amountSchema.safeParse(10000).success).toBe(true);
  });
});

// Test email case conversion notification
describe("Email Case Conversion Notification (VAL-201)", () => {
  it("should detect when email will be converted to lowercase", () => {
    const email = "TEST@EXAMPLE.COM";
    const willBeConverted = email !== email.toLowerCase();
    expect(willBeConverted).toBe(true);
  });

  it("should not flag emails already in lowercase", () => {
    const email = "test@example.com";
    const willBeConverted = email !== email.toLowerCase();
    expect(willBeConverted).toBe(false);
  });
});

// Test transaction retrieval improvement
describe("Transaction Retrieval (PERF-405)", () => {
  it("should use processedAt to identify exact transaction", () => {
    const processedAt = new Date().toISOString();
    const transaction1 = { id: 1, accountId: 1, processedAt };
    const transaction2 = { id: 2, accountId: 1, processedAt: new Date().toISOString() };

    // Simulate query by processedAt
    const findTransaction = (transactions: typeof transaction1[], targetProcessedAt: string) => {
      return transactions.find((t) => t.processedAt === targetProcessedAt);
    };

    const found = findTransaction([transaction1, transaction2], processedAt);
    expect(found).toBe(transaction1);
    expect(found?.id).toBe(1);
  });
});

// Test address sanitization
describe("Address Sanitization", () => {
  const addressSchema = z
    .string()
    .min(1)
    .max(200)
    .refine(
      (value) => {
        return !/[<>]/.test(value);
      },
      { message: "Address contains invalid characters" }
    );

  it("should reject addresses with script tags", () => {
    expect(addressSchema.safeParse("123 Main St<script>").success).toBe(false);
    expect(addressSchema.safeParse("<img src=x>").success).toBe(false);
  });

  it("should accept valid addresses", () => {
    expect(addressSchema.safeParse("123 Main Street").success).toBe(true);
    expect(addressSchema.safeParse("456 Oak Ave, Apt 2B").success).toBe(true);
  });
});

