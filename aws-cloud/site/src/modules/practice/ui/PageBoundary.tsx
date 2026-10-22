import { Component, type ReactNode } from "react";
import { i18n } from "../../../app/i18n";

const STORE = "aws-tu-nen-practice";

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

  private resetProgress = (): void => {
    const { t } = i18n.translator();
    if (!confirm(t("practice.crash.confirmReset"))) return;
    const req = indexedDB.deleteDatabase(STORE);
    req.onsuccess = req.onerror = req.onblocked = () => location.reload();
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
