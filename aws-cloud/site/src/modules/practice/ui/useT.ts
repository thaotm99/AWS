import { useMemo } from "react";
import { useI18n } from "../../../app/i18n";

/** Translator for this module's messages: t("exam.check") instead of t("practice.exam.check"). */
export function useT() {
  const translator = useI18n();
  return useMemo(() => translator.scope("practice"), [translator]);
}

export type PracticeT = ReturnType<typeof useT>["t"];
