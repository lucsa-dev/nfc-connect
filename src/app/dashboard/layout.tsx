import { LogOutIcon, NfcIcon } from "lucide-react";
import Link from "next/link";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";
import { Button } from "@/components/ui/button";
import { getCurrentUserEmail } from "@/lib/data";

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const email = await getCurrentUserEmail();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
            <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <NfcIcon className="size-4" />
            </span>
            NFC Connect
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
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
