import { LogOutIcon, SettingsIcon } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";
import { Button } from "@/components/ui/button";
import { getCurrentUserEmail } from "@/lib/data";

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const email = await getCurrentUserEmail();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur print:hidden">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4">
          <Link href="/dashboard" className="flex items-center gap-2" aria-label="TopTap: painel">
            <Logo className="h-7" />
            <span className="hidden rounded-md bg-secondary px-1.5 py-0.5 text-xs font-medium text-secondary-foreground sm:inline">
              Painel
            </span>
          </Link>
          <nav aria-label="Painel" className="ml-1 flex gap-0.5 text-sm sm:ml-2 sm:gap-1">
            <Link href="/dashboard" className="rounded-md px-2 py-1 text-muted-foreground hover:bg-muted hover:text-foreground">
              Negócios
            </Link>
            <Link href="/dashboard/pedidos" className="rounded-md px-2 py-1 text-muted-foreground hover:bg-muted hover:text-foreground">
              Pedidos
            </Link>
            <Link
              href="/dashboard/configuracoes"
              className="flex items-center gap-1 rounded-md px-2 py-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Configurações"
            >
              <SettingsIcon className="size-4 sm:hidden" />
              <span className="hidden sm:inline">Configurações</span>
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-1">
            {email && <span className="mr-2 hidden text-sm text-muted-foreground sm:inline">{email}</span>}
            <ThemeSwitcher />
            <form action="/auth/signout" method="post">
              <Button type="submit" variant="ghost" size="icon" aria-label="Sair" title="Sair">
                <LogOutIcon />
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 print:m-0 print:max-w-none print:p-0">{children}</main>
    </div>
  );
}
