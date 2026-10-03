"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { initialActionState, type ActionState } from "@/lib/action-state";

type FormAction = (prev: ActionState, formData: FormData) => Promise<ActionState>;

/** useActionState + toast de sucesso/erro + callback de sucesso. */
export function useActionFeedback(action: FormAction, onSuccess?: () => void) {
  const [state, formAction, pending] = useActionState(action, initialActionState);

  useEffect(() => {
    if (state.ok) {
      if (state.message) toast.success(state.message);
      onSuccess?.();
    } else if (state.message) {
      toast.error(state.message);
    }
    // onSuccess muda a cada render; só reagimos a um novo resultado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return [state, formAction, pending] as const;
}
