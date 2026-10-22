import { Component, type ReactNode } from "react";

interface State {
  failed: boolean;
}

/**
 * Wraps an optional extra, such as a lazily loaded illustration, whose failure must not take the
 * page down: a chunk that 404s after a redeploy or a dropped connection renders nothing instead.
 */
export default class OptionalBoundary extends Component<{ name: string; children: ReactNode }, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error): void {
    console.warn(`[practice] ${this.props.name} unavailable:`, error);
  }

  render(): ReactNode {
    return this.state.failed ? null : this.props.children;
  }
}
