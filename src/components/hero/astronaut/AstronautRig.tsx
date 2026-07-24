"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const BASE_Y = -0.3;
const MAX_YAW = 0.5;
const MAX_PITCH = 0.3;
const DAMPING = 4;

// Faz o astronauta encarar o cursor (com amortecimento, nunca movimento
// seco) e flutuar sutilmente quando o mouse está parado. Com
// prefers-reduced-motion, mantém a pose estática e não escuta o ponteiro.
export function AstronautRig({
  reducedMotion,
  children,
}: {
  reducedMotion: boolean;
  children: ReactNode;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const pointer = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (reducedMotion) return;

    function onPointerMove(event: PointerEvent) {
      pointer.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (event.clientY / window.innerHeight) * 2 - 1;
    }

    window.addEventListener("pointermove", onPointerMove);
    return () => window.removeEventListener("pointermove", onPointerMove);
  }, [reducedMotion]);

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;

    if (reducedMotion) {
      group.rotation.set(0, 0, 0);
      group.position.y = BASE_Y;
      return;
    }

    const targetYaw = pointer.current.x * MAX_YAW;
    const targetPitch = -pointer.current.y * MAX_PITCH;
    group.rotation.y = THREE.MathUtils.damp(group.rotation.y, targetYaw, DAMPING, delta);
    group.rotation.x = THREE.MathUtils.damp(group.rotation.x, targetPitch, DAMPING, delta);
    group.position.y = BASE_Y + Math.sin(state.clock.elapsedTime * 1.2) * 0.05;
  });

  return (
    <group ref={groupRef} position={[0, BASE_Y, 0]}>
      {children}
    </group>
  );
}
