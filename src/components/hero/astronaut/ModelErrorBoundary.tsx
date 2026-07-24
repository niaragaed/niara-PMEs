"use client";

import { Component, type ReactNode } from "react";

type Props = { fallback: ReactNode; children: ReactNode };
type State = { hasError: boolean };

// Protege contra falhas ao carregar um astronaut.glb malformado — sem isso,
// um erro do GLTFLoader derrubaria a árvore inteira em vez de cair no
// placeholder procedural.
export class ModelErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}
