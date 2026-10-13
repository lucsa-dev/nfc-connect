import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

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
  const parent = breadcrumbs.at(-1);

  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {parent && (
          <>
            {/* Celular: só o nível anterior, como "voltar". */}
            <Link
              href={parent.href}
              className="-ml-1 mb-1 flex w-fit max-w-full items-center gap-0.5 py-1 text-sm text-muted-foreground hover:text-foreground sm:hidden"
            >
              <ChevronLeftIcon className="size-4 shrink-0" />
              <span className="truncate">{parent.label}</span>
            </Link>
            <nav aria-label="Navegação" className="mb-1 hidden min-w-0 items-center gap-1 text-sm text-muted-foreground sm:flex">
              {breadcrumbs.map((b) => (
                <span key={b.href} className="flex min-w-0 items-center gap-1">
                  <Link href={b.href} className="truncate hover:text-foreground">
                    {b.label}
                  </Link>
                  <ChevronRightIcon className="size-3.5 shrink-0" />
                </span>
              ))}
            </nav>
          </>
        )}
        <h1 className="text-2xl font-semibold tracking-tight break-words sm:truncate">{title}</h1>
        {description && <div className="mt-1 text-sm text-muted-foreground">{description}</div>}
      </div>
      {actions && <div className="flex flex-wrap gap-2 *:flex-1 sm:*:flex-none">{actions}</div>}
    </div>
  );
}
