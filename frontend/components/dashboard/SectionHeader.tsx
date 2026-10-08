import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function SectionHeader({ title, href }: { title: string; href: string }) {
  return (
    <div className="flex items-center justify-between px-3 pb-1 pt-3">
      <h2 className="text-sm font-semibold">{title}</h2>
      <Link href={href} className="flex items-center text-xs font-medium text-zoom-blue hover:underline">
        View all <ChevronRight className="h-3.5 w-3.5" aria-hidden />
      </Link>
    </div>
  );
}
