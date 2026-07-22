import Link from "next/link";
import { Sprout } from "lucide-react";

type BrandProps = {
  inverse?: boolean;
  className?: string;
};

export function Brand({ inverse = false, className = "" }: BrandProps) {
  return (
    <Link
      href="/"
      aria-label="FarmToMarket home"
      className={`inline-flex items-center gap-2.5 ${className}`}
    >
      <span
        className={`grid size-10 place-items-center rounded-[14px] ${
          inverse
            ? "bg-[var(--lime)] text-[var(--forest)]"
            : "bg-[var(--forest)] text-[var(--lime)]"
        }`}
      >
        <Sprout aria-hidden="true" className="size-5" strokeWidth={2.25} />
      </span>
      <span
        className={`text-[1.05rem] font-bold tracking-[-0.035em] ${
          inverse ? "text-[var(--white)]" : "text-[var(--forest)]"
        }`}
      >
        Farm<span className={inverse ? "text-[var(--lime)]" : "text-[var(--orange)]"}>To</span>Market
      </span>
    </Link>
  );
}
