"use client";

import {
  ArrowLeftIcon,
  CheckCircle2Icon,
  ClockIcon,
  CheckIcon,
  CircleAlertIcon,
  CreditCardIcon,
  Loader2Icon,
  MessageCircleIcon,
  MinusIcon,
  OctagonAlertIcon,
  PlusIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useReducer, useState, useTransition } from "react";
import { getPaymentStatus, saveLead, startPayment, type LeadPayload, type PaymentStatus } from "@/app/comecar/actions";
import { Logo } from "@/components/brand/logo";
import { ProductArt, ProductPicker, StylePicker } from "@/components/cards/piece-picker";
import type { ArtData } from "@/components/cards/print-art";
import { BusinessSearch } from "@/components/quiz/business-search";
import { StepMenu } from "@/components/quiz/step-menu";
import { canAdvance, loadState, persist, reducer, STEPS, STORAGE_KEY, type QuizState, type StepKey } from "@/components/quiz/state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AVAILABLE_PRODUCTS, AVAILABLE_STYLES, getProduct, getStyle, type Product } from "@/lib/card";
import {
  CLIENT_BANDS,
  describeKit,
  diagnose,
  estimateTimeline,
  goalLabel,
  goalOptions,
  kitPriceBreakdown,
  kitPriceLabel,
  MAX_STICKERS,
  monthlyNewReviews,
  normalizeBrPhone,
  PROJECTION,
  recommendKit,
  SPOTS,
  whatsappSummary,
  type PlaqueModel,
  type Tone,
} from "@/lib/quiz";
import { formatBRL, PRICING } from "@/lib/pricing";
import { contactHref, whatsappHref } from "@/lib/site-config";

type Dispatch = React.Dispatch<Parameters<typeof reducer>[1]>;
interface StepProps {
  state: QuizState;
  dispatch: Dispatch;
  art: ArtData;
  /** WhatsApp da TopTap (configurado no painel) */
  whatsapp: string | null;
  placesEnabled: boolean;
  /** Sem a Places API, busca o negócio pelo scraper (Apify). */
  mapsSearch: boolean;
  /** PagBank configurado: o pedido termina no pagamento. */
  payments: boolean;
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
    plaqueModel: state.plaqueModel,
    cardModel: state.cardModel,
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

function Stepper({
  label,
  hint,
  value,
  onChange,
  max,
}: {
  label: string;
  hint?: string;
  value: number;
  onChange: (v: number) => void;
  max: number;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl px-4 py-3 ring-1 ring-foreground/15">
      <span>
        <span className="block font-medium">{label}</span>
        {hint && <span className="block text-sm text-muted-foreground">{hint}</span>}
      </span>
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

function StepBusiness({ state, dispatch, placesEnabled, mapsSearch }: StepProps) {
  return (
    <>
      <Title>Vamos ver como o seu negócio está no Google</Title>
      <Lead>
        {placesEnabled || mapsSearch
          ? "Qual é o nome do seu negócio no Google? Busque como ele aparece no Google Maps."
          : "Conte qual é o seu negócio e em que cidade ele fica."}
      </Lead>
      <div className="mt-6">
        <BusinessSearch
          value={state.business}
          sessionToken={state.placesToken}
          placesEnabled={placesEnabled}
          mapsSearch={mapsSearch}
          onChange={(business) => dispatch({ type: "business", business })}
        />
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
            {goalLabel(g, options)}
          </Option>
        ))}
      </div>
    </>
  );
}

function StepSpots({ state, dispatch }: StepProps) {
  const stickers = state.spots.some((s) => SPOTS.find((x) => x.id === s)?.kind === "sticker");
  return (
    <>
      <Title>Onde o cliente está quando termina o atendimento?</Title>
      <Lead>
        A placa fica no balcão. Mesas, recepção e atendentes recebem adesivos com QR Code: {PRICING.includedStickers} já vêm no
        serviço.
      </Lead>
      <div className="mt-6 grid gap-3">
        {SPOTS.map((s) => (
          <Option key={s.id} multi hint={s.hint} selected={state.spots.includes(s.id)} onClick={() => dispatch({ type: "toggleSpot", spot: s.id })}>
            {s.label}
          </Option>
        ))}
      </div>
      {stickers && (
        <div className="mt-6">
          <Stepper
            label="Adesivos QR pelo ambiente"
            hint={`${PRICING.includedStickers} inclusos. A partir do ${PRICING.includedStickers + 1}º, ${formatBRL(PRICING.extraSticker)} cada.`}
            value={state.tables}
            max={MAX_STICKERS}
            onChange={(value) => dispatch({ type: "tables", value })}
          />
        </div>
      )}
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
        <p className="font-heading font-semibold">Serviço anual TopTap: {describeKit(kit)}</p>
        <p className="mt-0.5 text-lg font-semibold text-primary">{kitPriceLabel(kit)}</p>
        {kit.extraStickers > 0 && <p className="text-sm text-muted-foreground">{kitPriceBreakdown(kit)}</p>}
        <p className="mt-1 text-xs text-muted-foreground">
          Pagamento único, sem mensalidade. Inclui 12 meses de monitoramento no Google Maps, com um relatório por mês.
        </p>

        {AVAILABLE_STYLES.length > 1 && (
          <>
            <p className="mt-5 mb-2 text-sm font-medium">Escolha o estilo</p>
            <StylePicker value={state.style} onChange={(style) => dispatch({ type: "style", style })} art={art} />
          </>
        )}

        {pickable("plaque") && (
          <>
            <p className="mt-5 mb-2 text-sm font-medium">Modelo da placa</p>
            <ProductPicker
              kind="plaque"
              value={state.plaqueModel}
              onChange={(model) => dispatch({ type: "plaqueModel", model: model as PlaqueModel })}
              style={state.style}
              art={art}
            />
          </>
        )}
      </div>
    </>
  );
}

function StepContact({ state, dispatch }: StepProps & { error: string | null }) {
  const phoneOk = state.contact.whatsapp === "" || normalizeBrPhone(state.contact.whatsapp) !== null;
  return (
    <>
      <Title>Para onde enviamos o seu pedido?</Title>
      <Lead>Vamos te chamar no WhatsApp para confirmar o pedido e combinar a entrega da placa.</Lead>
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

/** Há mais de um modelo à venda desse tipo (senão o seletor some). */
const pickable = (kind: Product["kind"]) => AVAILABLE_PRODUCTS.filter((p) => p.kind === kind).length > 1;

const PAYMENT_POLL_MS = 5000;

/** Situação do pagamento do pedido: confere a cada 5 s até o webhook do PagBank confirmar. */
function usePaymentStatus(sessionId: string, enabled: boolean) {
  const [status, setStatus] = useState<PaymentStatus | "carregando">(enabled ? "carregando" : null);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      const next = await getPaymentStatus(sessionId).catch(() => "pendente" as const);
      if (!active) return;
      setStatus(next);
      if (next === "pendente") timer = setTimeout(tick, PAYMENT_POLL_MS);
    };
    void tick();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [sessionId, enabled]);
  return status;
}

/** Abre a página de pagamento do PagBank (o progresso fica salvo para a volta). */
function PayButton({ sessionId, label }: { sessionId: string; label: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="grid justify-items-center gap-2">
      <Button
        size="lg"
        className="h-12 px-6 text-base"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await startPayment(sessionId);
            if (result.ok) window.location.assign(result.url);
            else if (result.reason === "pago") window.location.reload();
            else setError("Não foi possível abrir o pagamento. Tente de novo.");
          })
        }
      >
        {pending ? <Loader2Icon className="animate-spin" /> : <CreditCardIcon />} {label}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

function StepDone({ state, dispatch, art, whatsapp, payments }: StepProps) {
  const payment = usePaymentStatus(state.sessionId, payments);
  const kit = recommendKit(state);
  const style = getStyle(state.style);
  const plaque = getProduct(state.plaqueModel);
  const message = whatsappSummary({
    name: state.contact.name,
    business: state.business,
    kit,
    styleLabel: style.label,
    models: plaque.label.toLowerCase(),
    goal: state.goal,
  });
  const href = whatsapp ? whatsappHref(whatsapp, message) : contactHref(message);
  const firstName = state.contact.name.trim().split(/\s+/)[0];

  const order = `${businessName(state)}: ${describeKit(kit)}, estilo ${style.label.toLowerCase()}`;
  const awaiting = payment === "pendente" || payment === "carregando";

  if (payments && payment !== "pago") {
    return (
      <div className="text-center">
        {awaiting ? (
          <ClockIcon className="mx-auto mb-4 size-12 text-muted-foreground" />
        ) : (
          <CircleAlertIcon className="mx-auto mb-4 size-12 text-destructive" />
        )}
        <Title>
          {payment === "recusado"
            ? "O pagamento não foi aprovado"
            : awaiting
              ? "Aguardando a confirmação do pagamento"
              : `Falta só o pagamento, ${firstName}`}
        </Title>
        <Lead>
          Pedido da {order}, {kitPriceLabel(kit)}.
          {payment === "recusado"
            ? " Tente de novo com outro cartão ou pague com Pix."
            : awaiting
              ? " Assim que o PagBank confirmar, esta página atualiza sozinha. Pagou com Pix? Costuma levar poucos segundos."
              : " Pague com Pix ou cartão na página segura do PagBank."}
        </Lead>
        {awaiting && payment !== "carregando" && (
          <p className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground" role="status">
            <Loader2Icon className="size-4 animate-spin" /> Conferindo o pagamento...
          </p>
        )}
        <div className="mt-6">
          <PayButton sessionId={state.sessionId} label={awaiting ? "Abrir o pagamento de novo" : "Pagar agora"} />
        </div>
        {href && (
          <a href={href} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block text-sm text-muted-foreground underline">
            Dúvidas? Fale com a gente no WhatsApp
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="text-center">
      <CheckCircle2Icon className="mx-auto mb-4 size-12 text-[#34A853]" />
      <Title>{payments ? `Pagamento confirmado, ${firstName}!` : `Tudo certo, ${firstName}!`}</Title>
      <Lead>
        Recebemos o pedido da {order}.
        {payments
          ? " Vamos te chamar no WhatsApp para combinar a entrega da placa."
          : href
            ? " Envie a mensagem abaixo para agilizar o atendimento."
            : " Vamos te chamar no WhatsApp em breve."}
      </Lead>
      <div className="mx-auto my-6 flex h-44 items-center justify-center gap-4">
        <ProductArt product={plaque} style={state.style} art={art} />
      </div>
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
  meta: StepGoal,
  "onde-paga": StepSpots,
  clientes: StepClients,
  calculando: StepCalculating,
  plano: StepPlan,
  contato: StepContact,
  pronto: StepDone,
};

const NEXT_LABEL: Partial<Record<StepKey, string>> = {
  plano: "Quero esse plano",
  contato: "Enviar pedido",
};

const PAY_LABEL = "Ir para o pagamento";

// Quiz -----------------------------------------------------------------------------

export function Quiz({
  art,
  whatsapp,
  placesEnabled,
  mapsSearch,
  payments,
}: {
  art: ArtData;
  whatsapp: string | null;
  placesEnabled: boolean;
  mapsSearch: boolean;
  payments: boolean;
}) {
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
        if (payments) {
          const payment = await startPayment(state.sessionId);
          if (payment.ok) {
            // Na volta do PagBank, o quiz abre na conclusão, que confere o pagamento.
            persist(reducer(state, { type: "next" }));
            window.location.assign(payment.url);
            return;
          }
          if (payment.reason === "erro") {
            setError("Pedido salvo, mas não foi possível abrir o pagamento. Tente de novo.");
            return;
          }
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
        {showNav && <StepMenu state={state} onSelect={(step) => dispatch({ type: "goTo", step })} />}
      </header>

      <main className="mx-auto w-full max-w-xl flex-1 px-4 pt-6 pb-32">
        <Step
          state={state}
          dispatch={dispatch}
          art={art}
          whatsapp={whatsapp}
          placesEnabled={placesEnabled}
          mapsSearch={mapsSearch}
          payments={payments}
          error={error}
        />
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
              {pending ? "Enviando..." : key === "contato" && payments ? PAY_LABEL : (NEXT_LABEL[key] ?? "Próximo")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
