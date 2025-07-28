import { z } from 'zod';
import type { UserRole } from '@/types/auth';

// PIN validation schema with complexity requirements
export const pinSchema = z
  .string()
  .min(4, 'PIN must be at least 4 digits')
  .max(8, 'PIN must not exceed 8 digits')
  .regex(/^\d+$/, 'PIN must contain only numbers')
  .refine((pin) => {
    // Check for sequential numbers (1234, 4321)
    const isSequential = /^(?:0123|1234|2345|3456|4567|5678|6789|9876|8765|7654|6543|5432|4321|3210)/.test(pin);
    return !isSequential;
  }, 'PIN cannot be sequential numbers')
  .refine((pin) => {
    // Check for repeated digits (1111, 2222)
    const isRepeated = /^(\d)\1+$/.test(pin);
    return !isRepeated;
  }, 'PIN cannot be all the same digit');

// User role validation
export const userRoleSchema = z.enum(['admin', 'manager', 'cashier'] as const);

// Create user schema
export const createUserSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must not exceed 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
    .toLowerCase(),
  pin: pinSchema,
  confirmPin: z.string(),
  role: userRoleSchema,
}).refine((data) => data.pin === data.confirmPin, {
  message: "PINs don't match",
  path: ["confirmPin"],
});

// Update user schema (without PIN confirmation)
export const updateUserSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must not exceed 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
    .toLowerCase()
    .optional(),
  role: userRoleSchema.optional(),
  isActive: z.boolean().optional(),
});

// Change PIN schema
export const changePinSchema = z.object({
  currentPin: z.string().min(1, 'Current PIN is required'),
  newPin: pinSchema,
  confirmNewPin: z.string(),
}).refine((data) => data.newPin === data.confirmNewPin, {
  message: "New PINs don't match",
  path: ["confirmNewPin"],
}).refine((data) => data.currentPin !== data.newPin, {
  message: "New PIN must be different from current PIN",
  path: ["newPin"],
});

// User query schema for filtering
export const userQuerySchema = z.object({
  role: userRoleSchema.optional(),
  isActive: z.boolean().optional(),
  search: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

// Export types
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ChangePinInput = z.infer<typeof changePinSchema>;
export type UserQueryInput = z.infer<typeof userQuerySchema>;