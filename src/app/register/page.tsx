import { Suspense } from "react";
import { AuthShell } from "@/components/public/auth-shell";
import { RegisterForm } from "@/components/public/auth-forms";

export default function RegisterPage() {
  return (
    <AuthShell
      eyebrow="Create your account"
      title="Trade with more confidence."
      description="Tell us how you use FarmToMarket. We will tailor your workspace and next steps."
    >
      <Suspense fallback={<div className="h-[560px] animate-pulse rounded-[24px] bg-[var(--sage)]" />}>
        <RegisterForm />
      </Suspense>
    </AuthShell>
  );
}
