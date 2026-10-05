"use client";

import {
  ArrowLeftIcon,
  BarChart3Icon,
  CheckCircle2Icon,
  CheckIcon,
  CircleAlertIcon,
  Loader2Icon,
  MessageCircleIcon,
  MinusIcon,
  OctagonAlertIcon,
  PlusIcon,
  QrCodeIcon,
  RefreshCwIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useReducer, useState, useTransition } from "react";
import { saveLead, type LeadPayload } from "@/app/comecar/actions";
import { Logo } from "@/components/brand/logo";
import { ArtPreview, type ArtData } from "@/components/cards/print-art";
import { BusinessSearch } from "@/components/quiz/business-search";
import { loadState, persist, reducer, STEPS, STORAGE_KEY, type QuizState, type StepKey } from "@/components/quiz/state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getStyle, STYLES } from "@/lib/card";
import {
  CLIENT_BANDS,
  describeKit,
  diagnose,
  estimateTimeline,
  goalOptions,
  kitPriceLabel,
  monthlyNewReviews,
  normalizeBrPhone,
  PROJECTION,
  recommendKit,
  SPOTS,
  whatsappSummary,
  type Tone,
} from "@/lib/quiz";
import { contactHref } from "@/lib/site-config";

type Dispatch = React.Dispatch<Parameters<typeof reducer>[1]>;
interface StepProps {
  state: QuizState;
  dispatch: Dispatch;
  art: ArtData;
}

const businessName = (s: QuizState) => s.business?.name ?? "seu negócio";

function toPayload(state: QuizState, includeContact = false): LeadPayload {
  return {
    sessionId: state.sessionId,
    step: STEPS[state.step]!,
    business: state.business,
    goal: state.goal,
    spots: state.spots,
    clients: state.clients,
    counters: state.counters,
    tables: state.tables,
    style: state.style,
    contact: includeContact ? state.contact : null,
    utm: state.utm,
  };
}

// Peças visuais -------------------------------------------------------------------

function Title({ children }: { children: React.ReactNode }) {
  return <h1 className="text-2xl leading-tight font-semibold tracking-tight text-balance sm:text-3xl">{children}</h1>;
}

function Lead({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-pretty text-muted-foreground">{children}</p>;
}

function Highlight({ children }: { children: React.ReactNode }) {
  return <span className="text-primary">{children}</span>;
}

function Option({
  selected,
  onClick,
  children,
  hint,
  multi = false,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  hint?: string;
  multi?: boolean;
}) {
  return (
    <button
      type="button"
      role={multi ? "checkbox" : "radio"}
      aria-checked={selected}
      onClick={onClick}
      className={`flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3.5 text-left ring-1 transition ${
        selected ? "bg-secondary ring-2 ring-primary" : "ring-foreground/15 hover:ring-foreground/30"
      }`}
    >
      <span>
        <span className="block font-medium">{children}</span>
        {hint && <span className="block text-sm text-muted-foreground">{hint}</span>}
      </span>
      <span
        className={`flex size-6 shrink-0 items-center justify-center ${multi ? "rounded-md" : "rounded-full"} ${
          selected ? "bg-primary text-primary-foreground" : "ring-1 ring-foreground/25"
        }`}
      >
        {selected && <CheckIcon className="size-4" />}
      </span>
    </button>
  );
}

function Stepper({ label, value, onChange, max }: { label: string; value: number; onChange: (v: number) => void; max: number }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl px-4 py-3 ring-1 ring-foreground/15">
      <span className="font-medium">{label}</span>
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={() => onChange(value - 1)} disabled={value <= 1} aria-label={`Menos: ${label}`}>
          <MinusIcon />
        </Button>
        <span className="w-8 text-center text-lg font-semibold tabular-nums" aria-live="polite">
          {value}
        </span>
        <Button variant="outline" size="icon" onClick={() => onChange(value + 1)} disabled={value >= max} aria-label={`Mais: ${label}`}>
          <PlusIcon />
        </Button>
      </div>
    </div>
  );
}

// Telas ----------------------------------------------------------------------------

function StepBusiness({ state, dispatch }: StepProps) {
  return (
    <>
      <Title>Vamos preparar a sua placa TopTap</Title>
      <Lead>Qual é o nome do seu negócio no Google? Busque como ele aparece no Google Maps.</Lead>
      <div className="mt-6">
        <BusinessSearch
          value={state.business}
          sessionToken={state.placesToken}
          onChange={(business) => dispatch({ type: "business", business })}
        />
      </div>
    </>
  );
}

function StepHowItWorks({ state, art }: StepProps) {
  const items = [
    { icon: CheckCircle2Icon, text: "O cliente aproxima o celular da placa e a avaliação abre na hora" },
    { icon: QrCodeIcon, text: "QR Code de reserva: funciona em qualquer celular, com ou sem NFC" },
    { icon: RefreshCwIcon, text: "O destino pode ser trocado sem reimprimir a placa" },
    { icon: BarChart3Icon, text: "Cada toque é contado: NFC ou QR Code, por dia" },
  ];
  return (
    <>
      <Title>
        Como a placa vai funcionar na <Highlight>{businessName(state)}</Highlight>
      </Title>
      <div className="mt-6 grid items-center gap-6 sm:grid-cols-[1fr_1.2fr]">
        <ArtPreview product="placa-quadrada" style={state.style} data={art} className="mx-auto w-full max-w-[14rem]" />
        <ul className="grid gap-3">
          {items.map(({ icon: Icon, text }) => (
            <li key={text} className="flex gap-3">
              <Icon className="mt-0.5 size-5 shrink-0 text-primary" />
              <span>{text}</span>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

function StepGoal({ state, dispatch }: StepProps) {
  const current = state.business?.reviews ?? null;
  const options = goalOptions(current);
  return (
    <>
      <Title>
        {current !== null ? (
          <>
            Hoje a <Highlight>{businessName(state)}</Highlight> tem {current.toLocaleString("pt-BR")}{" "}
            {current === 1 ? "avaliação" : "avaliações"} no Google. Onde você quer chegar?
          </>
        ) : (
          <>Quantas avaliações você quer ter no Google?</>
        )}
      </Title>
      <div className="mt-6 grid gap-3" role="radiogroup">
        {options.map((g) => (
          <Option key={g} selected={state.goal === g} onClick={() => dispatch({ type: "goal", goal: g })}>
            {g.toLocaleString("pt-BR")} avaliações
          </Option>
        ))}
      </div>
    </>
  );
}

function StepSpots({ state, dispatch }: StepProps) {
  return (
    <>
      <Title>Onde o cliente está quando termina o atendimento?</Title>
      <Lead>Marque todos que se aplicam. É aí que a placa ou o cartão fazem mais efeito.</Lead>
      <div className="mt-6 grid gap-3">
        {SPOTS.map((s) => (
          <Option key={s.id} multi hint={s.hint} selected={state.spots.includes(s.id)} onClick={() => dispatch({ type: "toggleSpot", spot: s.id })}>
            {s.label}
          </Option>
        ))}
      </div>
    </>
  );
}

function StepClients({ state, dispatch }: StepProps) {
  return (
    <>
      <Title>
        Quantos clientes a <Highlight>{businessName(state)}</Highlight> atende por dia?
      </Title>
      <div className="mt-6 grid gap-3" role="radiogroup">
        {CLIENT_BANDS.map((b) => (
          <Option key={b.id} selected={state.clients === b.id} onClick={() => dispatch({ type: "clients", clients: b.id })}>
            {b.label}
          </Option>
        ))}
      </div>
    </>
  );
}

function StepPoints({ state, dispatch }: StepProps) {
  const plaque = state.spots.some((s) => SPOTS.find((x) => x.id === s)?.kind === "plaque") || state.spots.length === 0;
  const cards = state.spots.some((s) => SPOTS.find((x) => x.id === s)?.kind === "card");
  return (
    <>
      <Title>Quantos pontos de atendimento?</Title>
      <Lead>Assim montamos o kit certo: uma placa em cada balcão e um cartão em cada mesa ou com cada atendente.</Lead>
      <div className="mt-6 grid gap-3">
        {plaque && (
          <Stepper label="Balcões, caixas ou recepções" value={state.counters} max={20} onChange={(value) => dispatch({ type: "counters", value })} />
        )}
        {cards && <Stepper label="Mesas ou atendentes" value={state.tables} max={200} onChange={(value) => dispatch({ type: "tables", value })} />}
      </div>
    </>
  );
}

const CALC_ITEMS = ["Avaliações atuais", "Meta de avaliações", "Clientes por dia", "Pontos de atendimento", "Prazo estimado"];

function StepCalculating({ dispatch }: StepProps) {
  const [done, setDone] = useState(0);
  useEffect(() => {
    const tick = setInterval(() => setDone((d) => Math.min(d + 1, CALC_ITEMS.length)), 600);
    const finish = setTimeout(() => dispatch({ type: "next" }), 3600);
    return () => {
      clearInterval(tick);
      clearTimeout(finish);
    };
  }, [dispatch]);
  return (
    <div className="flex flex-col items-center py-8 text-center" aria-live="polite">
      <Loader2Icon className="mb-5 size-10 animate-spin text-primary motion-reduce:animate-none" />
      <Title>Montando o seu plano...</Title>
      <ul className="mt-6 grid w-full max-w-xs gap-2 text-left">
        {CALC_ITEMS.map((item, i) => (
          <li key={item} className={`flex items-center gap-2 transition ${i < done ? "text-foreground" : "text-muted-foreground/50"}`}>
            <CheckIcon className={`size-4 ${i < done ? "text-[#34A853]" : ""}`} /> {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

const TONE: Record<Tone, { icon: typeof CheckIcon; className: string }> = {
  bom: { icon: CheckCircle2Icon, className: "text-[#188038]" },
  atencao: { icon: CircleAlertIcon, className: "text-[#B06000] dark:text-[#FBBC05]" },
  critico: { icon: OctagonAlertIcon, className: "text-destructive" },
};

function StepPlan({ state, dispatch, art }: StepProps) {
  const current = state.business?.reviews ?? 0;
  const goal = state.goal ?? goalOptions(current)[1] ?? 100;
  const diagnosis = diagnose(state.business);
  const kit = recommendKit(state);
  const perMonth = monthlyNewReviews(state.clients);
  const band = CLIENT_BANDS.find((b) => b.id === state.clients);

  return (
    <>
      <Title>
        O plano da <Highlight>{businessName(state)}</Highlight>
      </Title>

      {diagnosis.length > 0 && (
        <ul className="mt-5 grid gap-2">
          {diagnosis.map((d) => {
            const { icon: Icon, className } = TONE[d.tone];
            return (
              <li key={d.text} className="flex gap-2.5 text-sm">
                <Icon className={`mt-0.5 size-4 shrink-0 ${className}`} />
                <span>{d.text}</span>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-5 grid grid-cols-3 gap-2 text-center">
        {[
          { label: "Hoje", value: state.business?.reviews != null ? current.toLocaleString("pt-BR") : "—" },
          { label: "Meta", value: goal.toLocaleString("pt-BR") },
          { label: "Prazo estimado", value: estimateTimeline(current, goal, state.clients) },
        ].map((n) => (
          <div key={n.label} className="rounded-xl bg-muted px-2 py-3">
            <div className="text-xs text-muted-foreground">{n.label}</div>
            <div className="mt-0.5 font-heading font-semibold">{n.value}</div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Estimativa, não garantia: {band?.label.toLowerCase() ?? "clientes"} por dia × {PROJECTION.workingDays} dias × {PROJECTION.reviewRate * 100}%
        que avaliam ≈ {perMonth} avaliações novas por mês.
      </p>

      <div className="mt-6 rounded-2xl p-4 ring-1 ring-foreground/15">
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-heading font-semibold">Kit recomendado: {describeKit(kit)}</p>
        </div>
        <p className="mt-0.5 text-lg font-semibold text-primary">{kitPriceLabel(kit)}</p>
        <p className="text-xs text-muted-foreground">Pagamento único, sem mensalidade.</p>

        <p className="mt-4 mb-2 text-sm font-medium">Estilo da placa</p>
        <div className="grid grid-cols-3 gap-3" role="radiogroup" aria-label="Estilo da placa">
          {STYLES.map((s) => (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={state.style === s.id}
              onClick={() => dispatch({ type: "style", style: s.id })}
              className={`grid gap-1.5 rounded-xl p-2 text-sm ring-1 transition ${state.style === s.id ? "ring-2 ring-primary" : "ring-foreground/15"}`}
            >
              <ArtPreview product="placa-quadrada" style={s.id} data={art} />
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

function StepContact({ state, dispatch }: StepProps & { error: string | null }) {
  const phoneOk = state.contact.whatsapp === "" || normalizeBrPhone(state.contact.whatsapp) !== null;
  return (
    <>
      <Title>Para onde enviamos o seu pedido?</Title>
      <Lead>Vamos te chamar no WhatsApp para confirmar a placa e combinar a entrega.</Lead>
      <div className="mt-6 grid gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="quiz-name">Seu nome</Label>
          <Input
            id="quiz-name"
            value={state.contact.name}
            onChange={(e) => dispatch({ type: "contact", contact: { name: e.target.value } })}
            autoComplete="given-name"
            className="h-12 text-base"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="quiz-whatsapp">WhatsApp com DDD</Label>
          <Input
            id="quiz-whatsapp"
            value={state.contact.whatsapp}
            onChange={(e) => dispatch({ type: "contact", contact: { whatsapp: e.target.value } })}
            inputMode="tel"
            autoComplete="tel-national"
            placeholder="(85) 99999-9999"
            className="h-12 text-base"
            aria-invalid={!phoneOk}
          />
          {!phoneOk && <p className="text-xs text-destructive">Confira o número com DDD.</p>}
        </div>
        <label className="flex items-start gap-2.5 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={state.contact.consent}
            onChange={(e) => dispatch({ type: "contact", contact: { consent: e.target.checked } })}
            className="mt-0.5 size-4 accent-primary"
          />
          Quero receber novidades e ofertas da TopTap pelo WhatsApp (opcional).
        </label>
        <p className="text-xs text-muted-foreground">
          Usamos seus dados só para atender este pedido, conforme a LGPD. Você pode pedir a exclusão a qualquer momento.
        </p>
      </div>
    </>
  );
}

function StepDone({ state, dispatch, art }: StepProps) {
  const kit = recommendKit(state);
  const style = getStyle(state.style);
  const message = whatsappSummary({ name: state.contact.name, business: state.business, kit, styleLabel: style.label, goal: state.goal });
  const href = contactHref(message);
  const firstName = state.contact.name.trim().split(/\s+/)[0];

  return (
    <div className="text-center">
      <CheckCircle2Icon className="mx-auto mb-4 size-12 text-[#34A853]" />
      <Title>Tudo certo, {firstName}!</Title>
      <Lead>
        Recebemos o pedido da {businessName(state)}: {describeKit(kit)}, estilo {style.label.toLowerCase()}.
        {href ? " Envie a mensagem abaixo para agilizar o atendimento." : " Vamos te chamar no WhatsApp em breve."}
      </Lead>
      <ArtPreview product="placa-quadrada" style={state.style} data={art} className="mx-auto my-6 w-full max-w-[13rem]" />
      {href && (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-12 items-center gap-2 rounded-lg bg-[#25D366] px-6 text-base font-semibold text-[#063D1E] hover:brightness-95"
        >
          <MessageCircleIcon className="size-5" /> Enviar pedido pelo WhatsApp
        </a>
      )}
      <div className="mt-6">
        <Button
          variant="ghost"
          onClick={() => {
            try {
              localStorage.removeItem(STORAGE_KEY);
            } catch {}
            dispatch({ type: "reset" });
          }}
        >
          Fazer outro pedido
        </Button>
      </div>
    </div>
  );
}

const STEP_COMPONENTS: Record<StepKey, (p: StepProps & { error: string | null }) => React.ReactNode> = {
  negocio: StepBusiness,
  "como-funciona": StepHowItWorks,
  meta: StepGoal,
  "onde-paga": StepSpots,
  clientes: StepClients,
  pontos: StepPoints,
  calculando: StepCalculating,
  plano: StepPlan,
  contato: StepContact,
  pronto: StepDone,
};

const NEXT_LABEL: Partial<Record<StepKey, string>> = {
  "como-funciona": "Continuar",
  plano: "Quero esse plano",
  contato: "Enviar pedido",
};

function canAdvance(key: StepKey, s: QuizState): boolean {
  switch (key) {
    case "negocio":
      return Boolean(s.business);
    case "meta":
      return s.goal !== null;
    case "onde-paga":
      return s.spots.length > 0;
    case "clientes":
      return s.clients !== null;
    case "contato":
      return s.contact.name.trim().length >= 2 && normalizeBrPhone(s.contact.whatsapp) !== null;
    default:
      return true;
  }
}

// Quiz -----------------------------------------------------------------------------

export function Quiz({ art }: { art: ArtData }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => loadState(window.location.search));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const key = STEPS[state.step]!;
  const Step = STEP_COMPONENTS[key];

  useEffect(() => persist(state), [state]);
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [state.step]);

  const progress = Math.round((state.step / (STEPS.length - 1)) * 100);
  const showNav = key !== "calculando" && key !== "pronto";

  function next() {
    setError(null);
    if (key === "contato") {
      startTransition(async () => {
        const result = await saveLead(toPayload({ ...state, step: state.step + 1 }, true));
        if (!result.ok) {
          setError(result.error ?? "Não foi possível enviar. Tente novamente.");
          return;
        }
        dispatch({ type: "next" });
      });
      return;
    }
    // Progresso salvo em segundo plano: não segura o cliente.
    if (state.business) void saveLead(toPayload({ ...state, step: state.step + 1 })).catch(() => {});
    dispatch({ type: "next" });
  }

  return (
    <div className="flex min-h-dvh flex-col bg-brand-surface">
      <header className="sticky top-0 z-10 bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-xl items-center gap-3 px-4">
          {state.step > 0 && showNav ? (
            <Button variant="ghost" size="icon" onClick={() => dispatch({ type: "back" })} aria-label="Voltar">
              <ArrowLeftIcon />
            </Button>
          ) : (
            <span className="size-8" />
          )}
          <Link href="/" className="mx-auto" aria-label="TopTap: início">
            <Logo className="h-6" />
          </Link>
          <span className="size-8" />
        </div>
        <div
          className="h-1 bg-muted"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Progresso"
        >
          <div className="h-full bg-primary transition-[width] duration-300" style={{ width: `${progress}%` }} />
        </div>
      </header>

      <main className="mx-auto w-full max-w-xl flex-1 px-4 pt-6 pb-32">
        <Step state={state} dispatch={dispatch} art={art} error={error} />
      </main>

      {showNav && (
        <div className="fixed inset-x-0 bottom-0 border-t bg-background/95 backdrop-blur">
          <div className="mx-auto grid w-full max-w-xl gap-2 px-4 py-3">
            {error && (
              <p role="alert" className="text-center text-sm text-destructive">
                {error}
              </p>
            )}
            <Button size="lg" className="h-12 w-full text-base" onClick={next} disabled={!canAdvance(key, state) || pending}>
              {pending ? "Enviando..." : (NEXT_LABEL[key] ?? "Próximo")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
