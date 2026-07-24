"use client";

// Astronauta placeholder montado com primitivas: capacete esférico claro,
// corpo em cápsula e viseira escura. Substituído automaticamente por
// AstronautModel assim que public/models/astronaut.glb existir.
export function ProceduralAstronaut() {
  return (
    <group>
      <mesh position={[0, -0.55, 0]}>
        <capsuleGeometry args={[0.34, 0.55, 8, 16]} />
        <meshStandardMaterial color="#f2f0ea" metalness={0.05} roughness={0.55} />
      </mesh>

      <mesh position={[0, 0.15, 0]}>
        <sphereGeometry args={[0.52, 32, 32]} />
        <meshStandardMaterial color="#f7f6f1" metalness={0.15} roughness={0.25} />
      </mesh>

      <mesh position={[0, 0.12, 0.4]} scale={[1, 0.82, 0.5]}>
        <sphereGeometry args={[0.4, 32, 32]} />
        <meshStandardMaterial color="#14160f" metalness={0.6} roughness={0.2} />
      </mesh>
    </group>
  );
}
