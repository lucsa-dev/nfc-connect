import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

// Só o painel e o login precisam de sessão; os links públicos (/negocio/link)
// ficam fora para que o redirecionamento seja o mais rápido possível.
export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};
