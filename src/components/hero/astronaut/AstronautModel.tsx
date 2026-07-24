"use client";

import { Suspense, useEffect, useState } from "react";
import { ModelErrorBoundary } from "./ModelErrorBoundary";
import { GltfAstronaut } from "./GltfAstronaut";
import { ProceduralAstronaut } from "./ProceduralAstronaut";
import { ASTRONAUT_MODEL_URL } from "./constants";

// Verifica em runtime se o .glb final já foi adicionado a public/models/.
// Enquanto não existir, usa o placeholder procedural — nunca deixa o
// carregamento do modelo quebrar o hero.
export function AstronautModel() {
  const [hasCustomModel, setHasCustomModel] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(ASTRONAUT_MODEL_URL, { method: "HEAD" })
      .then((response) => {
        if (!cancelled && response.ok) setHasCustomModel(true);
      })
      .catch(() => {
        // Sem modelo customizado disponível — segue com o placeholder.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!hasCustomModel) return <ProceduralAstronaut />;

  return (
    <ModelErrorBoundary fallback={<ProceduralAstronaut />}>
      <Suspense fallback={<ProceduralAstronaut />}>
        <GltfAstronaut />
      </Suspense>
    </ModelErrorBoundary>
  );
}
