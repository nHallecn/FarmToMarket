"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  Mail,
  Phone,
  Sprout,
  UserRound,
  Users,
} from "lucide-react";

type Role = "buyer" | "farmer" | "operations";

const roleOptions: Array<{
  value: Role;
  label: string;
  shortLabel: string;
  description: string;
  icon: typeof Building2;
}> = [
  {
    value: "buyer",
    label: "Business buyer",
    shortLabel: "Buyer",
    description: "Source produce for your business",
    icon: Building2,
  },
  {
    value: "farmer",
    label: "Farmer or cooperative",
    shortLabel: "Farmer",
    description: "Sell and manage your harvest",
    icon: Sprout,
  },
  {
    value: "operations",
    label: "Operations team",
    shortLabel: "Operations",
    description: "Coordinate orders and delivery",
    icon: Users,
  },
];

const roleRoutes: Record<Role, string> = {
  buyer: "/buyer/dashboard",
  farmer: "/farmer/dashboard",
  operations: "/operations/dashboard",
};

function saveRole(role: Role, authenticated = false) {
  localStorage.setItem("farmtomarket-role", role);
  if (authenticated) localStorage.setItem("farmtomarket-authenticated", "true");
}

function RolePicker({ role, onChange }: { role: Role; onChange: (role: Role) => void }) {
  return (
    <fieldset>
      <legend className="mb-3 text-sm font-bold text-[var(--ink)]">Choose your workspace</legend>
      <div className="grid grid-cols-3 gap-2">
        {roleOptions.map((option) => {
          const Icon = option.icon;
          const active = option.value === role;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(option.value)}
              className={`relative flex min-h-[90px] flex-col items-center justify-center gap-2 rounded-[18px] border px-2.5 py-3 text-center transition-all sm:min-h-[96px] ${
                active
                  ? "border-[var(--forest)] bg-[var(--sage)] text-[var(--forest)] shadow-sm"
                  : "border-[var(--line)] bg-[var(--white)] text-[var(--muted)] hover:border-[var(--forest)]/35"
              }`}
            >
              {active ? (
                <span className="absolute right-2 top-2 grid size-4 place-items-center rounded-full bg-[var(--forest)] text-[var(--white)]">
                  <Check aria-hidden="true" className="size-2.5" strokeWidth={3} />
                </span>
              ) : null}
              <Icon aria-hidden="true" className="size-5" />
              <span className="text-[11px] font-bold leading-4 sm:text-xs">{option.shortLabel}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-[var(--muted)]">{roleOptions.find((option) => option.value === role)?.description}</p>
    </fieldset>
  );
}

const fieldClassName =
  "h-13 w-full rounded-[16px] border border-[var(--line)] bg-[var(--white)] pl-11 pr-4 text-[15px] text-[var(--ink)] outline-none transition placeholder:text-[var(--muted)]/60 focus:border-[var(--forest)] focus:ring-4 focus:ring-[var(--sage)]";

export function LoginForm() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("buyer");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    saveRole(role, true);
    router.push(roleRoutes[role]);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <RolePicker role={role} onChange={setRole} />

      <div className="space-y-2">
        <label htmlFor="identity" className="text-sm font-bold text-[var(--ink)]">Phone number or email</label>
        <div className="relative">
          <UserRound aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-[var(--muted)]" />
          <input id="identity" name="identity" type="text" autoComplete="username" required placeholder="+237 6XX XXX XXX" className={fieldClassName} />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="password" className="text-sm font-bold text-[var(--ink)]">Password</label>
          <button type="button" onClick={() => setNotice("Password reset is available in the connected production service.")} className="text-xs font-bold text-[var(--forest)] hover:underline">Forgot password?</button>
        </div>
        <div className="relative">
          <LockKeyhole aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-[var(--muted)]" />
          <input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" minLength={6} required placeholder="Enter your password" className={`${fieldClassName} pr-12`} />
          <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((visible) => !visible)} className="absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-[var(--muted)] hover:bg-[var(--sage)] hover:text-[var(--forest)]">
            {showPassword ? <EyeOff aria-hidden="true" className="size-[18px]" /> : <Eye aria-hidden="true" className="size-[18px]" />}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-[var(--muted)]">
          <input type="checkbox" name="remember" className="size-4 rounded border-[var(--line)] accent-[var(--forest)]" /> Keep me signed in
        </label>
        <span className="inline-flex items-center gap-1.5 text-xs text-[var(--muted)]"><KeyRound aria-hidden="true" className="size-3.5" /> Role-based access</span>
      </div>

      {notice ? <p role="status" className="rounded-[14px] bg-[var(--sage)] px-4 py-3 text-xs leading-5 text-[var(--forest)]">{notice}</p> : null}

      <button type="submit" disabled={pending} className="group inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[var(--forest)] px-6 text-sm font-bold text-[var(--white)] shadow-lg transition-all hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-75">
        {pending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : null}
        {pending ? "Opening workspace…" : "Sign in to your workspace"}
        {!pending ? <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-1" /> : null}
      </button>

      <p className="text-center text-sm text-[var(--muted)]">New to FarmToMarket? <Link href="/register" className="font-bold text-[var(--forest)] hover:underline">Create an account</Link></p>
      <p className="text-center text-[11px] leading-5 text-[var(--muted)]">Demo mode: use any valid-looking details to enter the selected workspace.</p>
    </form>
  );
}

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedRole = searchParams.get("role");
  const initialRole: Role = requestedRole === "farmer" || requestedRole === "operations" ? requestedRole : "buyer";
  const [role, setRole] = useState<Role>(initialRole);
  const [phone, setPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    saveRole(role);
    localStorage.setItem("farmtomarket-pending-phone", phone);
    router.push("/verify-otp");
  }

  const organisationLabel = role === "farmer" ? "Farm or cooperative name" : role === "buyer" ? "Business name" : "Team or department";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <RolePicker role={role} onChange={setRole} />

      {role === "operations" ? (
        <p className="rounded-[14px] border border-[var(--line)] bg-[var(--sage)] px-4 py-3 text-xs leading-5 text-[var(--forest)]">Operations access is normally activated by an administrator. This demo continues with a staff profile.</p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-bold text-[var(--ink)]">Your full name</label>
          <div className="relative">
            <UserRound aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-[var(--muted)]" />
            <input id="name" name="name" type="text" autoComplete="name" required placeholder="e.g. Amina N." className={fieldClassName} />
          </div>
        </div>
        <div className="space-y-2">
          <label htmlFor="organisation" className="text-sm font-bold text-[var(--ink)]">{organisationLabel}</label>
          <div className="relative">
            <Building2 aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-[var(--muted)]" />
            <input id="organisation" name="organisation" type="text" autoComplete="organization" required placeholder="Your organisation" className={fieldClassName} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="phone" className="text-sm font-bold text-[var(--ink)]">Mobile number</label>
          <div className="relative">
            <Phone aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-[var(--muted)]" />
            <input id="phone" name="phone" type="tel" autoComplete="tel" required value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+237 6XX XXX XXX" className={fieldClassName} />
          </div>
        </div>
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-bold text-[var(--ink)]">Email <span className="font-normal text-[var(--muted)]">(optional)</span></label>
          <div className="relative">
            <Mail aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-[var(--muted)]" />
            <input id="email" name="email" type="email" autoComplete="email" placeholder="you@business.cm" className={fieldClassName} />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="new-password" className="text-sm font-bold text-[var(--ink)]">Create a password</label>
        <div className="relative">
          <LockKeyhole aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-[var(--muted)]" />
          <input id="new-password" name="password" type={showPassword ? "text" : "password"} autoComplete="new-password" minLength={6} required placeholder="At least 6 characters" className={`${fieldClassName} pr-12`} />
          <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((visible) => !visible)} className="absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-[var(--muted)] hover:bg-[var(--sage)] hover:text-[var(--forest)]">
            {showPassword ? <EyeOff aria-hidden="true" className="size-[18px]" /> : <Eye aria-hidden="true" className="size-[18px]" />}
          </button>
        </div>
      </div>

      <label className="flex cursor-pointer items-start gap-3 text-xs leading-5 text-[var(--muted)]">
        <input type="checkbox" required className="mt-0.5 size-4 shrink-0 rounded border-[var(--line)] accent-[var(--forest)]" />
        <span>I agree to the <Link href="/terms" className="font-bold text-[var(--forest)] underline-offset-2 hover:underline">FarmToMarket terms</Link> and consent to account verification for trusted marketplace access.</span>
      </label>

      <button type="submit" disabled={pending} className="group inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[var(--forest)] px-6 text-sm font-bold text-[var(--white)] shadow-lg transition-all hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-75">
        {pending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : null}
        {pending ? "Preparing verification…" : "Continue to phone verification"}
        {!pending ? <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-1" /> : null}
      </button>

      <p className="text-center text-sm text-[var(--muted)]">Already registered? <Link href="/login" className="font-bold text-[var(--forest)] hover:underline">Sign in</Link></p>
    </form>
  );
}

function maskPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 4) return value || "+237 6•• •• •• ••";
  return `${value.slice(0, Math.min(7, value.length))} ••• ${digits.slice(-2)}`;
}

export function OtpForm() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("buyer");
  const [phone, setPhone] = useState("");
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [seconds, setSeconds] = useState(42);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    const hydrateStoredDetails = window.setTimeout(() => {
      const storedRole = localStorage.getItem("farmtomarket-role");
      if (storedRole === "buyer" || storedRole === "farmer" || storedRole === "operations") setRole(storedRole);
      setPhone(localStorage.getItem("farmtomarket-pending-phone") ?? "");
    }, 0);
    return () => window.clearTimeout(hydrateStoredDetails);
  }, []);

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = window.setInterval(() => setSeconds((current) => current - 1), 1000);
    return () => window.clearInterval(timer);
  }, [seconds]);

  function applyCode(value: string) {
    const next = value.replace(/\D/g, "").slice(0, 6).split("");
    if (next.length === 0) return;
    setDigits(Array.from({ length: 6 }, (_, index) => next[index] ?? ""));
    inputRefs.current[Math.min(next.length, 5)]?.focus();
    setMessage("");
  }

  function handleDigit(index: number, value: string) {
    if (value.length > 1) {
      applyCode(value);
      return;
    }
    const clean = value.replace(/\D/g, "");
    setDigits((current) => current.map((digit, digitIndex) => digitIndex === index ? clean : digit));
    setMessage("");
    if (clean && index < 5) inputRefs.current[index + 1]?.focus();
  }

  function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (digits.some((digit) => !digit)) {
      setMessage("Enter all six digits to continue.");
      inputRefs.current[digits.findIndex((digit) => !digit)]?.focus();
      return;
    }
    setPending(true);
    saveRole(role, true);
    router.push(roleRoutes[role]);
  }

  function handleResend() {
    setSeconds(42);
    setDigits(["", "", "", "", "", ""]);
    setMessage("A new demo code is ready. Enter any six digits.");
    inputRefs.current[0]?.focus();
  }

  const selectedRole = roleOptions.find((option) => option.value === role) ?? roleOptions[0];
  const RoleIcon = selectedRole.icon;

  return (
    <form onSubmit={handleVerify} className="space-y-6">
      <div className="flex items-center justify-between gap-4 rounded-[18px] border border-[var(--line)] bg-[var(--white)] p-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-[14px] bg-[var(--sage)] text-[var(--forest)]"><RoleIcon aria-hidden="true" className="size-5" /></span>
          <div className="min-w-0">
            <p className="text-xs text-[var(--muted)]">Continuing as</p>
            <p className="truncate text-sm font-bold text-[var(--ink)]">{selectedRole.label}</p>
          </div>
        </div>
        <Link href="/register" className="shrink-0 text-xs font-bold text-[var(--forest)] hover:underline">Change</Link>
      </div>

      <div>
        <p className="text-sm leading-6 text-[var(--muted)]">Enter the 6-digit code sent to <span className="font-bold text-[var(--ink)]">{maskPhone(phone)}</span></p>
        <div className="mt-4 grid grid-cols-6 gap-2 sm:gap-3" onPaste={(event) => { event.preventDefault(); applyCode(event.clipboardData.getData("text")); }}>
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(node) => { inputRefs.current[index] = node; }}
              aria-label={`Verification digit ${index + 1}`}
              inputMode="numeric"
              autoComplete={index === 0 ? "one-time-code" : "off"}
              maxLength={1}
              value={digit}
              onChange={(event) => handleDigit(index, event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Backspace" && !digits[index] && index > 0) inputRefs.current[index - 1]?.focus();
                if (event.key === "ArrowLeft" && index > 0) inputRefs.current[index - 1]?.focus();
                if (event.key === "ArrowRight" && index < 5) inputRefs.current[index + 1]?.focus();
              }}
              className="aspect-square min-w-0 rounded-[16px] border border-[var(--line)] bg-[var(--white)] text-center text-xl font-bold text-[var(--ink)] outline-none transition focus:border-[var(--forest)] focus:ring-4 focus:ring-[var(--sage)]"
            />
          ))}
        </div>
      </div>

      {message ? <p role="status" className="rounded-[14px] bg-[var(--sage)] px-4 py-3 text-xs leading-5 text-[var(--forest)]">{message}</p> : null}

      <button type="submit" disabled={pending} className="group inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[var(--forest)] px-6 text-sm font-bold text-[var(--white)] shadow-lg transition-all hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-75">
        {pending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : null}
        {pending ? "Verifying…" : "Verify and open workspace"}
        {!pending ? <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-1" /> : null}
      </button>

      <div className="text-center text-sm text-[var(--muted)]">
        {seconds > 0 ? (
          <p>Did not receive it? Resend in <span className="font-bold text-[var(--ink)]">0:{String(seconds).padStart(2, "0")}</span></p>
        ) : (
          <button type="button" onClick={handleResend} className="font-bold text-[var(--forest)] hover:underline">Resend verification code</button>
        )}
        <p className="mt-2 text-[11px]">Demo mode: any six digits will work.</p>
      </div>

      <Link href="/register" className="mx-auto flex w-fit items-center gap-2 text-xs font-bold text-[var(--forest)] hover:underline"><ArrowLeft aria-hidden="true" className="size-3.5" /> Back to account details</Link>
    </form>
  );
}
