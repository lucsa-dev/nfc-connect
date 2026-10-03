"use client";

import { useState } from "react";
import type { Bucket, DailyBucket } from "@/lib/analytics";
import { formatNumber } from "@/lib/format";

const dayLabel = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", timeZone: "UTC" });
const weekdayLabel = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long", timeZone: "UTC" });

const asDate = (d: string) => new Date(`${d}T12:00:00Z`);

export function StatTile({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-1 text-3xl font-semibold tabular-nums">{formatNumber(value)}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

/** Acessos por dia: série única, cor de destaque do tema, tooltip por barra. */
export function DailyChart({ data }: { data: DailyBucket[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.count));
  const active = hover !== null ? data[hover] : null;
  const labelEvery = Math.ceil(data.length / 6);

  return (
    <figure className="grid gap-2">
      <div className="h-5 text-sm" aria-live="polite">
        {active ? (
          <span>
            <span className="font-medium tabular-nums">{formatNumber(active.count)}</span>{" "}
            <span className="text-muted-foreground">
              {active.count === 1 ? "acesso" : "acessos"} · {weekdayLabel.format(asDate(active.date))}
            </span>
          </span>
        ) : (
          <span className="text-muted-foreground">Passe o mouse sobre as barras</span>
        )}
      </div>
      <div
        className="relative flex h-40 items-end gap-0.5 border-b border-border"
        onMouseLeave={() => setHover(null)}
        role="img"
        aria-label={`Acessos por dia nos últimos ${data.length} dias`}
      >
        {/* linha de referência do valor máximo */}
        <div className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-border" />
        <span className="pointer-events-none absolute -top-2.5 right-0 bg-card pl-1 text-[10px] text-muted-foreground tabular-nums">
          {formatNumber(max)}
        </span>
        {data.map((d, i) => (
          <button
            key={d.date}
            type="button"
            className="group flex h-full flex-1 items-end focus-visible:outline-none"
            onMouseEnter={() => setHover(i)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(null)}
            aria-label={`${weekdayLabel.format(asDate(d.date))}: ${d.count} acessos`}
          >
            <span
              className="w-full rounded-t-[4px] bg-primary transition-opacity group-focus-visible:ring-2 group-focus-visible:ring-ring"
              style={{
                height: d.count ? `${Math.max(2, (d.count / max) * 100)}%` : 0,
                opacity: hover === null || hover === i ? 1 : 0.45,
              }}
            />
          </button>
        ))}
      </div>
      <div className="flex text-[11px] text-muted-foreground">
        {data.map((d, i) => (
          <span key={d.date} className="flex-1 text-center whitespace-nowrap">
            {i % labelEvery === 0 ? dayLabel.format(asDate(d.date)) : ""}
          </span>
        ))}
      </div>
    </figure>
  );
}

/** Quebra por categoria em barras horizontais (comprimento = participação). */
export function Breakdown({ title, data }: { title: string; data: Bucket[] }) {
  const total = data.reduce((sum, b) => sum + b.count, 0);

  return (
    <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <h3 className="mb-3 text-sm font-medium">{title}</h3>
      {total === 0 ? (
        <p className="text-sm text-muted-foreground">Sem dados no período.</p>
      ) : (
        <ul className="grid gap-2.5">
          {data.map((b) => {
            const pct = (b.count / total) * 100;
            return (
              <li key={b.label} className="grid gap-1" title={`${b.label}: ${b.count} (${pct.toFixed(1)}%)`}>
                <div className="flex justify-between gap-2 text-sm">
                  <span className="truncate">{b.label}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {formatNumber(b.count)} · {pct.toFixed(0)}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(pct, 1)}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
