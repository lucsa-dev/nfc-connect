"use client";

import { CheckIcon, MinusIcon, PlusIcon } from "lucide-react";
import { useState } from "react";
import { createBatch } from "@/app/dashboard/cartoes/actions";
import { ArtPreview, type ArtData } from "@/components/cards/print-art";
import { useActionFeedback } from "@/components/dashboard/use-action-feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getProduct, getStyle, PRODUCTS, STYLES, type ProductId, type StyleId } from "@/lib/card";
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

/** Opção visual (rádio escondido + cartão clicável). */
function Option({
  name,
  value,
  checked,
  onSelect,
  label,
  description,
  compact = false,
  children,
}: {
  compact?: boolean;
  name: string;
  value: string;
  checked: boolean;
  onSelect: () => void;
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <label className="relative grid cursor-pointer content-between gap-3 rounded-xl p-3 ring-1 ring-foreground/10 transition hover:ring-primary/50 has-checked:ring-2 has-checked:ring-primary has-focus-visible:outline-2 has-focus-visible:outline-ring">
      <input type="radio" name={name} value={value} checked={checked} onChange={onSelect} className="sr-only" />
      {checked && (
        <span className="absolute top-2 right-2 z-10 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <CheckIcon className="size-3.5" />
        </span>
      )}
      <div className={`flex items-center justify-center rounded-lg bg-muted/50 ${compact ? "h-20 p-2 sm:h-36 sm:p-3" : "h-36 p-3"}`}>{children}</div>
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className={`text-xs text-muted-foreground ${compact ? "hidden sm:block" : ""}`}>{description}</div>
      </div>
    </label>
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
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {STYLES.map((s) => (
            <Option key={s.id} compact name="style" value={s.id} checked={style === s.id} onSelect={() => setStyle(s.id)} label={s.label} description={s.description}>
              <ArtPreview product="cartao" style={s.id} data={art} className="w-full max-w-44" />
            </Option>
          ))}
        </div>
      </Step>

      <Step n={3} title="Produto" hint={`no estilo ${getStyle(style).label.toLowerCase()}`} error={errors.product?.[0]}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PRODUCTS.map((p) => (
            <Option key={p.id} name="product" value={p.id} checked={product === p.id} onSelect={() => setProduct(p.id)} label={p.label} description={p.description}>
              {p.sides.length > 1 ? (
                // Cartão: frente e verso lado a lado (o verso tem o QR Code único).
                <div className={`flex h-full items-center justify-center gap-1.5 ${p.height > p.width ? "" : "flex-col"}`}>
                  <ArtPreview product={p.id} style={style} side="front" data={art} className={p.height > p.width ? "h-full" : "h-[48%]"} />
                  <ArtPreview product={p.id} style={style} side="back" data={art} className={p.height > p.width ? "h-full" : "h-[48%]"} />
                </div>
              ) : (
                <ArtPreview product={p.id} style={style} data={art} className="h-full" />
              )}
            </Option>
          ))}
        </div>
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
