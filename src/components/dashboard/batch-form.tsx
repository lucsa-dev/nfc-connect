"use client";

import { MinusIcon, PlusIcon } from "lucide-react";
import { useState } from "react";
import { createBatch } from "@/app/dashboard/cartoes/actions";
import { ProductPicker, StylePicker } from "@/components/cards/piece-picker";
import type { ArtData } from "@/components/cards/print-art";
import { useActionFeedback } from "@/components/dashboard/use-action-feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getProduct, getStyle, type ProductId, type StyleId } from "@/lib/card";
import { BATCH_MAX } from "@/lib/cards";

const QUICK = [10, 25, 50, 100];

function Step({ n, title, hint, error, children }: { n: number; title: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-3">
      <div className="flex items-baseline gap-2">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{n}</span>
        <h3 className="font-medium">{title}</h3>
        {hint && <span className="text-sm text-muted-foreground">{hint}</span>}
      </div>
      {children}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </section>
  );
}

export function BatchForm({ art }: { art: ArtData }) {
  const [state, action, pending] = useActionFeedback(createBatch);
  const errors = state.fieldErrors ?? {};
  const v = state.values ?? {};
  const [quantity, setQuantity] = useState(v.quantity ?? "50");
  const [style, setStyle] = useState<StyleId>(getStyle(v.style).id);
  const [product, setProduct] = useState<ProductId>(getProduct(v.product ?? "cartao").id);

  const n = Number(quantity);
  const step = (delta: number) => setQuantity(String(Math.min(BATCH_MAX, Math.max(1, (Number.isFinite(n) ? n : 0) + delta))));
  const chosen = getProduct(product);

  return (
    <form action={action} className="grid gap-8">
      <Step n={1} title="Quantidade" hint={`até ${BATCH_MAX} por lote`} error={errors.quantity?.[0]}>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center">
            <Button type="button" variant="outline" size="icon" onClick={() => step(-1)} aria-label="Menos um">
              <MinusIcon />
            </Button>
            <Input
              name="quantity"
              type="number"
              inputMode="numeric"
              min={1}
              max={BATCH_MAX}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="mx-1 h-9 w-20 text-center text-base tabular-nums"
              aria-label="Quantidade"
              aria-invalid={Boolean(errors.quantity)}
              required
            />
            <Button type="button" variant="outline" size="icon" onClick={() => step(1)} aria-label="Mais um">
              <PlusIcon />
            </Button>
          </div>
          {QUICK.map((q) => (
            <Button key={q} type="button" variant={n === q ? "default" : "secondary"} size="sm" onClick={() => setQuantity(String(q))}>
              {q}
            </Button>
          ))}
        </div>
      </Step>

      <Step n={2} title="Estilo" error={errors.style?.[0]}>
        <StylePicker name="style" value={style} onChange={setStyle} art={art} />
      </Step>

      <Step n={3} title="Produto" hint={`no estilo ${getStyle(style).label.toLowerCase()}`} error={errors.product?.[0]}>
        <ProductPicker name="product" value={product} onChange={setProduct} style={style} art={art} />
      </Step>

      <Step n={4} title="Nome do lote" hint="opcional" error={errors.name?.[0]}>
        <Input name="name" defaultValue={v.name ?? ""} placeholder={`Ex.: ${chosen.label} · gráfica outubro`} maxLength={120} className="max-w-md" />
      </Step>

      <div className="flex flex-wrap items-center gap-3 border-t pt-6">
        <Button type="submit" size="lg" disabled={pending || !(n >= 1 && n <= BATCH_MAX)}>
          {pending ? "Gerando..." : n >= 1 ? `Gerar ${n} × ${chosen.label.toLowerCase()}` : "Gerar lote"}
        </Button>
        <span className="text-sm text-muted-foreground">
          Estilo {getStyle(style).label.toLowerCase()} · {chosen.sides.length > 1 ? "frente e verso" : "só frente"} · cada peça com QR Code único
        </span>
      </div>
    </form>
  );
}
