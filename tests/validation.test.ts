import { describe, it, expect } from "vitest";
import { z } from "zod";

// Test email validation
describe("Email Validation (VAL-201)", () => {
  const emailSchema = z
    .string()
    .email("Invalid email format")
    .toLowerCase()
    .refine(
      (value) => {
        const invalidTlds = [".con", ".c0m", ".comm", ".netl", ".orgn"];
        const lowerValue = value.toLowerCase();
        return !invalidTlds.some((tld) => lowerValue.endsWith(tld));
      },
      { message: "Email contains invalid domain extension" }
    )
    .refine(
      (value) => {
        const validTlds = [".com", ".org", ".net", ".edu", ".gov", ".io", ".co", ".us"];
        return validTlds.some((tld) => value.toLowerCase().endsWith(tld)) || /\.([a-z]{2,})$/.test(value);
      },
      { message: "Email must have a valid domain extension" }
    );

  it("should accept valid email addresses", () => {
    expect(emailSchema.safeParse("test@example.com").success).toBe(true);
    expect(emailSchema.safeParse("user@domain.org").success).toBe(true);
    expect(emailSchema.safeParse("name@company.co").success).toBe(true);
  });

  it("should reject emails with common typos", () => {
    expect(emailSchema.safeParse("test@example.con").success).toBe(false);
    expect(emailSchema.safeParse("test@example.c0m").success).toBe(false);
    expect(emailSchema.safeParse("test@example.comm").success).toBe(false);
  });

  it("should convert email to lowercase", () => {
    const result = emailSchema.safeParse("TEST@EXAMPLE.COM");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("test@example.com");
    }
  });
});

// Test date of birth validation
describe("Date of Birth Validation (VAL-202)", () => {
  const dobSchema = z.string().refine(
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
  );

  it("should reject future dates", () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    expect(dobSchema.safeParse(futureDate.toISOString().split("T")[0]).success).toBe(false);
  });

  it("should reject dates for minors", () => {
    const minorDate = new Date();
    minorDate.setFullYear(minorDate.getFullYear() - 17);
    expect(dobSchema.safeParse(minorDate.toISOString().split("T")[0]).success).toBe(false);
  });

  it("should accept dates for adults", () => {
    const adultDate = new Date();
    adultDate.setFullYear(adultDate.getFullYear() - 25);
    expect(dobSchema.safeParse(adultDate.toISOString().split("T")[0]).success).toBe(true);
  });
});

// Test state code validation
describe("State Code Validation (VAL-203)", () => {
  const stateSchema = z
    .string()
    .length(2)
    .toUpperCase()
    .refine(
      (value) => {
        const validStates = [
          "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
          "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
          "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
          "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
          "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
          "DC",
        ];
        return validStates.includes(value);
      },
      { message: "Invalid state code. Please use a valid 2-letter US state code." }
    );

  it("should accept valid state codes", () => {
    expect(stateSchema.safeParse("CA").success).toBe(true);
    expect(stateSchema.safeParse("NY").success).toBe(true);
    expect(stateSchema.safeParse("TX").success).toBe(true);
    expect(stateSchema.safeParse("DC").success).toBe(true);
  });

  it("should reject invalid state codes", () => {
    expect(stateSchema.safeParse("XX").success).toBe(false);
    expect(stateSchema.safeParse("ZZ").success).toBe(false);
    expect(stateSchema.safeParse("AB").success).toBe(false);
  });

  it("should convert to uppercase", () => {
    const result = stateSchema.safeParse("ca");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("CA");
    }
  });
});

// Test phone number validation
describe("Phone Number Validation (VAL-204)", () => {
  const phoneSchema = z
    .string()
    .refine(
      (value) => {
        const usFormat = /^(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/;
        const intlFormat = /^\+\d{1,15}$/;
        return usFormat.test(value.replace(/\s/g, "")) || intlFormat.test(value);
      },
      { message: "Invalid phone number format" }
    )
    .transform((value) => value.replace(/\D/g, ""));

  it("should accept US phone formats", () => {
    expect(phoneSchema.safeParse("(123) 456-7890").success).toBe(true);
    expect(phoneSchema.safeParse("123-456-7890").success).toBe(true);
    expect(phoneSchema.safeParse("1234567890").success).toBe(true);
    expect(phoneSchema.safeParse("+11234567890").success).toBe(true);
  });

  it("should accept international formats", () => {
    expect(phoneSchema.safeParse("+441234567890").success).toBe(true);
    expect(phoneSchema.safeParse("+33123456789").success).toBe(true);
  });

  it("should normalize phone numbers", () => {
    const result = phoneSchema.safeParse("(123) 456-7890");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("1234567890");
    }
  });
});

// Test password complexity
describe("Password Complexity (VAL-208)", () => {
  const passwordSchema = z
    .string()
    .min(8)
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[a-z]/, "Password must contain a lowercase letter")
    .regex(/\d/, "Password must contain a number")
    .regex(/[!@#$%^&*(),.?":{}|<>]/, "Password must contain a special character");

  it("should accept valid passwords", () => {
    expect(passwordSchema.safeParse("Password123!").success).toBe(true);
    expect(passwordSchema.safeParse("MyP@ssw0rd").success).toBe(true);
  });

  it("should reject passwords without uppercase", () => {
    expect(passwordSchema.safeParse("password123!").success).toBe(false);
  });

  it("should reject passwords without lowercase", () => {
    expect(passwordSchema.safeParse("PASSWORD123!").success).toBe(false);
  });

  it("should reject passwords without numbers", () => {
    expect(passwordSchema.safeParse("Password!").success).toBe(false);
  });

  it("should reject passwords without special characters", () => {
    expect(passwordSchema.safeParse("Password123").success).toBe(false);
  });

  it("should reject passwords shorter than 8 characters", () => {
    expect(passwordSchema.safeParse("Pass1!").success).toBe(false);
  });
});

// Test card number validation (Luhn algorithm)
describe("Card Number Validation (VAL-206)", () => {
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

  it("should validate valid card numbers", () => {
    // Valid test card numbers
    expect(luhnCheck("4111111111111111")).toBe(true); // Visa
    expect(luhnCheck("5555555555554444")).toBe(true); // Mastercard
    expect(luhnCheck("378282246310005")).toBe(true); // Amex
  });

  it("should reject invalid card numbers", () => {
    expect(luhnCheck("4111111111111112")).toBe(false);
    expect(luhnCheck("1234567890123456")).toBe(false);
  });
});

// Test amount validation
describe("Amount Validation (VAL-205, VAL-209)", () => {
  const amountSchema = z
    .number()
    .positive()
    .min(0.01, "Amount must be greater than $0.00");

  it("should reject zero amounts", () => {
    expect(amountSchema.safeParse(0).success).toBe(false);
    expect(amountSchema.safeParse(0.0).success).toBe(false);
  });

  it("should reject negative amounts", () => {
    expect(amountSchema.safeParse(-10).success).toBe(false);
  });

  it("should accept positive amounts", () => {
    expect(amountSchema.safeParse(0.01).success).toBe(true);
    expect(amountSchema.safeParse(100).success).toBe(true);
    expect(amountSchema.safeParse(1000.50).success).toBe(true);
  });
});

