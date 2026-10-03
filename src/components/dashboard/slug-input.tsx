"use client";

import { Input } from "@/components/ui/input";

/** Campo de endereço com prefixo da URL pública visível. */
export function SlugInput({
  id,
  prefix,
  value,
  onChange,
  invalid,
}: {
  id: string;
  prefix: string;
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
}) {
  return (
    <div className="flex items-center rounded-lg border border-input focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 aria-invalid:border-destructive" aria-invalid={invalid}>
      <span className="max-w-[55%] truncate border-r border-input py-1 pr-2 pl-2.5 text-sm text-muted-foreground">
        {prefix}
      </span>
      <Input
        id={id}
        name="slug"
        value={value}
        onChange={(e) => onChange(e.target.value.toLowerCase())}
        className="border-0 shadow-none focus-visible:ring-0"
        autoComplete="off"
        spellCheck={false}
        aria-invalid={invalid}
      />
    </div>
  );
}
