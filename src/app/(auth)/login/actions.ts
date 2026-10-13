"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { ensureClientRow } from "@/lib/clients";
import {
  nameSchema,
  emailSchema,
  requiredPhoneSchema,
  passwordSchema,
} from "@/lib/validation";

/**
 * Powers the login page's progressive "enter your email first" step:
 * true if an account with this email already exists (staff or
 * client, however it was created), false otherwise -- nothing else
 * about the account is revealed. Backed by the email_exists() RPC
 * (supabase/migrations/20250102000000_profiles_email_and_checks.sql),
 * a narrow SECURITY DEFINER function grantable to anon.
 */
export async function checkEmailExists(email: string): Promise<boolean> {
  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) return false;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("email_exists", {
    check_email: parsed.data,
  });
  // Fail open to "doesn't exist": worst case, someone with an
  // existing account sees the signup form and signUp() itself then
  // reports the email is taken -- better than blocking sign-in on an
  // RPC hiccup.
  if (error) return false;
  return data ?? false;
}

export type SignInState = { error?: string } | null;

export async function signInWithPassword(
  prevState: SignInState,
  formData: FormData
): Promise<SignInState> {
  const parsedEmail = emailSchema.safeParse(formData.get("email"));
  const password = formData.get("password");
  const next = (formData.get("next") as string) || "/dashboard";

  if (!parsedEmail.success || typeof password !== "string" || !password) {
    return { error: "Enter your email and password." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsedEmail.data,
    password,
  });
  if (error) {
    return { error: "Incorrect email or password." };
  }

  redirect(next);
}

const signUpSchema = z
  .object({
    fullName: nameSchema,
    email: emailSchema,
    phone: requiredPhoneSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export type SignUpState = { error?: string; checkEmail?: boolean } | null;

export async function signUp(
  prevState: SignUpState,
  formData: FormData
): Promise<SignUpState> {
  const next = (formData.get("next") as string) || "/dashboard";

  const parsed = signUpSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const { fullName, email, phone, password } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName, phone } },
  });
  if (error) {
    return { error: error.message };
  }
  if (!data.user) {
    return { error: "Account created, but something went wrong. Please try signing in." };
  }

  await ensureClientRow(data.user.id, fullName, email, phone);

  if (!data.session) {
    // This project currently requires confirming your email before a
    // session is issued -- the account exists (handle_new_user has
    // already created their 'client' profile), but there's nowhere to
    // redirect them to yet.
    return { checkEmail: true };
  }

  redirect(next);
}
