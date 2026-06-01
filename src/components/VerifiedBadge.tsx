import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function VerifiedBadge({ className, size = 18 }: { className?: string; size?: number }) {
  return (
    <span
      aria-label="Verified profile"
      title="Verified profile"
      className={cn("inline-flex items-center text-sky-400", className)}
    >
      <BadgeCheck strokeWidth={2.4} fill="currentColor" className="text-sky-400 [&_path]:stroke-white" style={{ width: size, height: size }} />
    </span>
  );
}
