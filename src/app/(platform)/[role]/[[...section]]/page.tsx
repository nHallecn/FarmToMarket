import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BuyerWorkspace } from "@/components/platform/buyer-workspace";
import { FarmerWorkspace } from "@/components/platform/farmer-workspace";
import { OperationsWorkspace } from "@/components/platform/operations-workspace";
import { PlatformShell } from "@/components/platform/platform-shell";

const roles = ["farmer", "buyer", "operations"] as const;
type PlatformRole = (typeof roles)[number];

function isPlatformRole(role: string): role is PlatformRole {
  return roles.includes(role as PlatformRole);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ role: string; section?: string[] }>;
}): Promise<Metadata> {
  const { role, section } = await params;
  if (!isPlatformRole(role)) return {};
  const label = section?.[0]?.replaceAll("-", " ") ?? "dashboard";
  return {
    title: `${label.replace(/\b\w/g, (letter) => letter.toUpperCase())} · ${role.replace(/\b\w/g, (letter) => letter.toUpperCase())}`,
    robots: { index: false, follow: false },
  };
}

export default async function PlatformPage({
  params,
}: {
  params: Promise<{ role: string; section?: string[] }>;
}) {
  const { role, section: sectionParts } = await params;
  if (!isPlatformRole(role)) notFound();

  const section = sectionParts?.[0] ?? "dashboard";

  return (
    <PlatformShell role={role} section={section}>
      {role === "buyer" ? <BuyerWorkspace section={section} /> : null}
      {role === "farmer" ? <FarmerWorkspace section={section} /> : null}
      {role === "operations" ? <OperationsWorkspace section={section} /> : null}
    </PlatformShell>
  );
}
