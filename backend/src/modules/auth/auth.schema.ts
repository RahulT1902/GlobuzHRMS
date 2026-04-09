import { z } from "zod";

export const loginSchema = z.object({
  identifier: z.string().min(1, "Identity (Phone/Email) is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Valid email required"),
});

export const resetPasswordSchema = z.object({
  email: z.string().email(),
  tempPassword: z.string().min(6),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  profileImage: z.string().url().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
