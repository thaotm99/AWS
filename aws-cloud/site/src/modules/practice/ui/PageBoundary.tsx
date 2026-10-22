import { Component, type ReactNode } from "react";
import { i18n } from "../../../app/i18n";
import { PracticeApp } from "../app/PracticeApp";

/** The page reloads after this even if storage never answers, so the button can't hang. */
const RESET_TIMEOUT_MS = 5000;

interface State {
  error: Error | null;
}

/**
 * Last line of defence for a practice page: if rendering throws, show what failed and a way out
 * instead of leaving the page blank. Error boundaries must be class components.
 */
export default class PageBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error): void {
    console.error("Practice page crashed:", error);
  }

  private resetProgress = async (): Promise<void> => {
    const { t } = i18n.translator();
    if (!confirm(t("practice.crash.confirmReset"))) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        PracticeApp.get().resetProgress(),
        new Promise((_, reject) => (timer = setTimeout(() => reject(new Error("reset timed out")), RESET_TIMEOUT_MS))),
      ]);
    } catch (e) {
      console.error("[practice] could not reset progress", e);
    } finally {
      clearTimeout(timer);
      location.reload();
    }
  };

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;
    const { t } = i18n.translator();
    return (
      <div className="pr-error pr-crash" role="alert">
        <h2>{t("practice.crash.title")}</h2>
        <p>{t("practice.crash.body")}</p>
        <div className="pr-actions">
          <button type="button" className="btn primary" onClick={() => location.reload()}>{t("practice.crash.reload")}</button>
          <button type="button" className="btn danger" onClick={this.resetProgress}>{t("practice.crash.reset")}</button>
        </div>
        <details>
          <summary>{t("practice.crash.details")}</summary>
          <pre>{`${error.name}: ${error.message}\n${error.stack ?? ""}`}</pre>
        </details>
      </div>
    );
  }
}
