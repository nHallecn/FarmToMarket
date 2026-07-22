import { AuthShell } from "@/components/public/auth-shell";
import { OtpForm } from "@/components/public/auth-forms";

export default function VerifyOtpPage() {
  return (
    <AuthShell
      eyebrow="Phone verification"
      title="Confirm it is really you."
      description="A quick phone check keeps marketplace identities and transactions more trustworthy."
    >
      <OtpForm />
    </AuthShell>
  );
}
