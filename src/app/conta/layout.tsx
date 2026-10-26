import { LogOutIcon } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";
import { Button } from "@/components/ui/button";
import { getCurrentUserEmail } from "@/lib/data";

/** Área do dono do negócio: entra pelo link mágico enviado na ativação da peça. */
export default async function AccountLayout({ children }: LayoutProps<"/conta">) {
  const email = await getCurrentUserEmail();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-4xl items-center gap-3 px-4">
          <Link href="/conta" aria-label="TopTap: minha conta">
            <Logo className="h-7" />
          </Link>
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
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
