import { CheckIcon, StarIcon } from "lucide-react";

/**
 * Celular ilustrativo: começa na tela de bloqueio e, no toque, abre a
 * avaliação, as estrelas acendem e a avaliação é publicada (animação em loop
 * nas classes tt-* do globals.css). Sem animação, mostra a tela de avaliação.
 */
export function PhoneMock({ businessName = "Seu Negócio" }: { businessName?: string }) {
  return (
    <div className="relative w-[10.5rem] rounded-[2.2rem] bg-neutral-900 p-2 shadow-2xl ring-1 ring-black/20 sm:w-[12rem]">
      <div className="absolute top-3.5 left-1/2 z-10 h-4 w-16 -translate-x-1/2 rounded-full bg-black" aria-hidden />
      <div className="relative aspect-[9/19] overflow-hidden rounded-[1.7rem] bg-white text-neutral-900">
        {/* Tela de bloqueio */}
        <div className="tt-lock absolute inset-0 flex flex-col items-center bg-gradient-to-b from-[#1A73E8] to-[#174EA6] pt-12 text-white opacity-0">
          <p className="font-heading text-4xl font-semibold tabular-nums">11:36</p>
          <p className="mt-1 text-[11px] opacity-80">terça-feira, 14 de outubro</p>
        </div>

        {/* Avaliação no Google */}
        <div className="tt-review absolute inset-0 flex flex-col px-4 pt-10 pb-5">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-[#E8F0FE] font-heading text-lg font-semibold text-[#1A73E8]">
            {businessName.charAt(0)}
          </div>
          <p className="text-center font-heading text-sm leading-tight font-semibold">{businessName}</p>
          <p className="mt-1 text-center text-[11px] text-neutral-500">Avalie sua experiência</p>
          <div className="mt-4 flex justify-center gap-1" aria-label="5 estrelas">
            {Array.from({ length: 5 }, (_, i) => (
              <StarIcon
                key={i}
                className="tt-star size-6 fill-[#FBBC05] text-[#FBBC05]"
                style={{ animationDelay: `${i * 0.12}s` }}
              />
            ))}
          </div>
          <div className="mt-4 grid gap-1.5" aria-hidden>
            <div className="h-2 rounded-full bg-neutral-200" />
            <div className="h-2 w-4/5 rounded-full bg-neutral-200" />
            <div className="h-2 w-3/5 rounded-full bg-neutral-200" />
          </div>
          <div className="mt-auto rounded-full bg-[#1A73E8] py-2 text-center text-xs font-medium text-white">Publicar</div>
        </div>

        {/* Confirmação */}
        <div className="tt-toast absolute inset-x-3 bottom-14 flex items-center gap-1.5 rounded-xl bg-neutral-900 px-3 py-2 text-[11px] font-medium text-white opacity-0 shadow-lg">
          <CheckIcon className="size-3.5 text-[#34A853]" /> Avaliação publicada
        </div>
      </div>
    </div>
  );
}
