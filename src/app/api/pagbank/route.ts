import { readOrderPayment, validSignature } from "@/lib/pagbank";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Notificações do Checkout PagBank (URL enviada na criação do checkout).
 * O corpo é assinado com o token da conta (x-authenticity-token); chegam os
 * pedidos com as cobranças e também mudanças do checkout, que são ignoradas.
 */

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const raw = await request.text();
  if (!validSignature(raw, request.headers.get("x-authenticity-token"))) {
    return new Response("Não autorizado", { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return new Response("Corpo inválido", { status: 400 });
  }
  const { referenceId, result } = readOrderPayment(payload);
  if (!result) return Response.json({ ok: true, ignored: true });

  // O reference_id é o id do lead; sem ele, o id do checkout vem no cabeçalho.
  const productId = request.headers.get("x-product-id");
  const supabase = createAdminClient();
  let query = supabase.from("leads").update(
    result === "pago" ? { payment_status: "pago", paid_at: new Date().toISOString() } : { payment_status: "recusado" },
  );
  if (referenceId && UUID.test(referenceId)) query = query.eq("id", referenceId);
  else if (productId?.startsWith("CHEC_")) query = query.eq("checkout_id", productId);
  else return Response.json({ ok: true, ignored: "sem referência" });
  // Uma recusa depois do pagamento (outra tentativa) não desfaz o pago.
  if (result === "recusado") query = query.neq("payment_status", "pago");

  const { data, error } = await query.select("id");
  if (error) {
    console.error("Falha ao gravar o pagamento do PagBank", error);
    return new Response("Erro", { status: 500 });
  }
  if (!data.length) console.error("Pagamento do PagBank sem pedido", { referenceId, productId, result });
  return Response.json({ ok: true });
}
