import { StarIcon } from "lucide-react";

/** Celular ilustrativo mostrando a tela de avaliação aberta pelo toque. */
export function PhoneMock({ businessName = "Seu Negócio" }: { businessName?: string }) {
  return (
    <div className="relative w-[11.5rem] rounded-[2.2rem] bg-neutral-900 p-2 shadow-2xl ring-1 ring-black/20 sm:w-[13rem]">
      <div className="absolute top-3.5 left-1/2 h-4 w-16 -translate-x-1/2 rounded-full bg-black" aria-hidden />
      <div className="flex aspect-[9/19] flex-col rounded-[1.7rem] bg-white px-4 pt-10 pb-5 text-neutral-900">
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-[#E8F0FE] font-heading text-lg font-semibold text-[#1A73E8]">
          {businessName.charAt(0)}
        </div>
        <p className="text-center font-heading text-sm font-semibold leading-tight">{businessName}</p>
        <p className="mt-1 text-center text-[11px] text-neutral-500">Avalie sua experiência</p>
        <div className="mt-4 flex justify-center gap-1" aria-label="5 estrelas">
          {Array.from({ length: 5 }, (_, i) => (
            <StarIcon key={i} className="size-6 fill-[#FBBC05] text-[#FBBC05]" />
          ))}
        </div>
        <div className="mt-4 grid gap-1.5" aria-hidden>
          <div className="h-2 rounded-full bg-neutral-200" />
          <div className="h-2 w-4/5 rounded-full bg-neutral-200" />
          <div className="h-2 w-3/5 rounded-full bg-neutral-200" />
        </div>
        <div className="mt-auto rounded-full bg-[#1A73E8] py-2 text-center text-xs font-medium text-white">Publicar</div>
      </div>
    </div>
  );
}
