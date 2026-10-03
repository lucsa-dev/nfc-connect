import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";

export function PageHeader({
  title,
  description,
  breadcrumbs = [],
  actions,
}: {
  title: string;
  description?: React.ReactNode;
  breadcrumbs?: Array<{ href: string; label: string }>;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {breadcrumbs.length > 0 && (
          <nav aria-label="Navegação" className="mb-1 flex items-center gap-1 text-sm text-muted-foreground">
            {breadcrumbs.map((b) => (
              <span key={b.href} className="flex items-center gap-1">
                <Link href={b.href} className="hover:text-foreground">
                  {b.label}
                </Link>
                <ChevronRightIcon className="size-3.5" />
              </span>
            ))}
          </nav>
        )}
        <h1 className="truncate text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <div className="mt-1 text-sm text-muted-foreground">{description}</div>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
