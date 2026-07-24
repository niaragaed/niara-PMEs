"use client";

import { useGLTF } from "@react-three/drei";
import { ASTRONAUT_MODEL_URL } from "./constants";

export function GltfAstronaut() {
  const { scene } = useGLTF(ASTRONAUT_MODEL_URL);
  return <primitive object={scene} />;
}
