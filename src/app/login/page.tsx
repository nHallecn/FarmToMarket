import { AuthShell } from "@/components/public/auth-shell";
import { LoginForm } from "@/components/public/auth-forms";

export default function LoginPage() {
  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Your market is waiting."
      description="Sign in to manage supply, source produce, or keep fulfillment moving."
    >
      <LoginForm />
    </AuthShell>
  );
}
