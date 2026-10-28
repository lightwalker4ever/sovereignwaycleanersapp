"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { emailSchema } from "@/lib/validation";
import {
  checkEmailExists,
  signInWithPassword,
  signUp,
  type SignInState,
  type SignUpState,
} from "@/app/(auth)/login/actions";
import { GoogleSignInButton } from "./GoogleSignInButton";

type Step = "email" | "signin" | "signup" | "check-email";

export function AuthForm({
  redirectTo,
  initialEmail,
  emailIsKnownRegistered,
}: {
  redirectTo?: string;
  initialEmail?: string;
  /** Set only when the caller has already confirmed this email belongs
   *  to a registered account (the quote journey's "sign in to
   *  continue" prompt, after its own checkEmailExists check) -- skips
   *  straight to the password step instead of re-checking. A caller
   *  that isn't sure (e.g. "set a password" for a possibly-new
   *  customer) should prefill the email but leave this false, so the
   *  normal "email" step still runs its own check and routes to
   *  signin/signup correctly either way. */
  emailIsKnownRegistered?: boolean;
}) {
  const [step, setStep] = useState<Step>(initialEmail && emailIsKnownRegistered ? "signin" : "email");
  const [email, setEmail] = useState(initialEmail ?? "");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [checking, startChecking] = useTransition();

  function handleContinue(e: React.FormEvent) {
    e.preventDefault();
    setEmailError(null);
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setEmailError(parsed.error.issues[0].message);
      return;
    }
    startChecking(async () => {
      const exists = await checkEmailExists(parsed.data);
      setStep(exists ? "signin" : "signup");
    });
  }

  if (step === "check-email") {
    return (
      <p className="text-center text-sm text-gray-700">
        Almost there — we&apos;ve sent a confirmation link to{" "}
        <span className="font-medium">{email}</span>. Click it to finish
        setting up your account.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <GoogleSignInButton redirectTo={redirectTo} />

      <div className="flex items-center gap-3 text-xs text-gray-400">
        <div className="h-px flex-1 bg-gray-200" />
        or
        <div className="h-px flex-1 bg-gray-200" />
      </div>

      {step === "email" && (
        <form onSubmit={handleContinue} className="flex flex-col gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="auth-email">Email</Label>
            <Input
              id="auth-email"
              type="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          {emailError && <p className="text-sm text-red-600">{emailError}</p>}
          <Button type="submit" disabled={checking} className="gap-2 bg-dash-brand-700 hover:bg-dash-brand-900">
            {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            Continue
          </Button>
        </form>
      )}

      {(step === "signin" || step === "signup") && (
        // Keyed by email+step so switching to a different email (or
        // re-checking the same one) remounts this subtree, giving the
        // signIn/signUp action state and uncontrolled fields a clean
        // slate instead of showing a stale error from a previous
        // email's failed attempt.
        <SignInOrSignUpStep
          key={`${step}:${email}`}
          mode={step}
          email={email}
          redirectTo={redirectTo}
          onUseDifferentEmail={() => setStep("email")}
          onNeedsEmailConfirmation={() => setStep("check-email")}
        />
      )}
    </div>
  );
}

function SignInOrSignUpStep({
  mode,
  email,
  redirectTo,
  onUseDifferentEmail,
  onNeedsEmailConfirmation,
}: {
  mode: "signin" | "signup";
  email: string;
  redirectTo?: string;
  onUseDifferentEmail: () => void;
  onNeedsEmailConfirmation: () => void;
}) {
  const [signInState, signInAction, signInPending] = useActionState<SignInState, FormData>(
    signInWithPassword,
    null
  );
  const [signUpState, signUpAction, signUpPending] = useActionState<SignUpState, FormData>(
    signUp,
    null
  );

  // React to signUp() reporting that email confirmation is required.
  // This notifies a different component (AuthForm) than the one
  // whose state changed, so it can't use the "adjust state during
  // render" pattern (that's only safe for a component updating its
  // own state) -- a useEffect is the correct tool here.
  useEffect(() => {
    if (signUpState?.checkEmail) {
      onNeedsEmailConfirmation();
    }
  }, [signUpState, onNeedsEmailConfirmation]);

  if (mode === "signin") {
    return (
      <form action={signInAction} className="flex flex-col gap-3">
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="next" value={redirectTo ?? ""} />
        <div className="space-y-1.5">
          <Label>Email</Label>
          <p className="text-sm text-gray-700">{email}</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="auth-password">Password</Label>
          <Input
            id="auth-password"
            name="password"
            type="password"
            autoComplete="current-password"
            autoFocus
            required
          />
        </div>
        {signInState?.error && <p className="text-sm text-red-600">{signInState.error}</p>}
        <Button type="submit" disabled={signInPending} className="gap-2 bg-dash-brand-700 hover:bg-dash-brand-900">
          {signInPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Sign in
        </Button>
        <button
          type="button"
          onClick={onUseDifferentEmail}
          className="text-xs text-gray-500 underline-offset-2 hover:underline"
        >
          Use a different email
        </button>
      </form>
    );
  }

  return (
    <form action={signUpAction} className="flex flex-col gap-3">
      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="next" value={redirectTo ?? ""} />
      <div className="space-y-1.5">
        <Label>Email</Label>
        <p className="text-sm text-gray-700">{email}</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="signup-name">Name</Label>
        <Input id="signup-name" name="fullName" autoComplete="name" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="signup-phone">Phone</Label>
        <Input id="signup-phone" name="phone" type="tel" autoComplete="tel" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="signup-password">Password</Label>
        <Input
          id="signup-password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={6}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="signup-confirm">Confirm password</Label>
        <Input
          id="signup-confirm"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={6}
          required
        />
      </div>
      {signUpState?.error && <p className="text-sm text-red-600">{signUpState.error}</p>}
      <Button type="submit" disabled={signUpPending} className="gap-2 bg-dash-brand-700 hover:bg-dash-brand-900">
        {signUpPending && <Loader2 className="h-4 w-4 animate-spin" />}
        Sign up
      </Button>
      <button
        type="button"
        onClick={onUseDifferentEmail}
        className="text-xs text-gray-500 underline-offset-2 hover:underline"
      >
        Use a different email
      </button>
    </form>
  );
}
