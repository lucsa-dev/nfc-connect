"use client";

import { CreditCardIcon, InboxIcon, RadarIcon, SettingsIcon, StoreIcon, TrendingUpIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/dashboard/pedidos", label: "Pedidos", short: "Pedidos", icon: InboxIcon },
  { href: "/dashboard/prospeccao", label: "Prospecção", short: "Prospectar", icon: RadarIcon },
  { href: "/dashboard/cartoes", label: "Cartões", short: "Cartões", icon: CreditCardIcon },
  { href: "/dashboard/evolucao", label: "Evolução", short: "Evolução", icon: TrendingUpIcon },
  { href: "/dashboard/configuracoes", label: "Configurações", short: "Ajustes", icon: SettingsIcon },
];
// Negócios vem primeiro e é a seção das demais rotas (/dashboard/[businessId]/...).
const NAV = [{ href: "/dashboard", label: "Negócios", short: "Negócios", icon: StoreIcon }, ...ITEMS];

function useCurrent() {
  const pathname = usePathname();
  const section = ITEMS.find((i) => pathname === i.href || pathname.startsWith(`${i.href}/`));
  return section?.href ?? "/dashboard";
}

/** Menu do topo, a partir de telas médias. */
export function TopNav() {
  const current = useCurrent();
  return (
    <nav aria-label="Painel" className="ml-2 hidden gap-1 text-sm md:flex">
      {NAV.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          aria-current={i.href === current ? "page" : undefined}
          className="rounded-md px-2 py-1 text-muted-foreground hover:bg-muted hover:text-foreground aria-[current=page]:bg-muted aria-[current=page]:text-foreground"
        >
          {i.label}
        </Link>
      ))}
    </nav>
  );
}

/** Barra de abas fixa no rodapé, no celular. */
export function BottomNav() {
  const current = useCurrent();
  return (
    <nav
      aria-label="Painel"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden print:hidden"
    >
      <div className="grid grid-cols-6">
        {NAV.map(({ href, short, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={href === current ? "page" : undefined}
            className="flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground aria-[current=page]:text-primary"
          >
            <Icon className="size-5" />
            {short}
          </Link>
        ))}
      </div>
    </nav>
  );
}
