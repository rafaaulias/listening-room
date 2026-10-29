"use client";

// Blockout primitives only: no external model, no texture.
export default function Room() {
  return (
    <group>
      <mesh position={[0, -0.1, 12]}>
        <boxGeometry args={[26, 0.2, 40]} />
        <meshStandardMaterial color="#464646" roughness={1} metalness={0} />
      </mesh>

      <mesh position={[0, 2.2, -2.2]}>
        <boxGeometry args={[26, 4.4, 0.2]} />
        <meshStandardMaterial color="#323232" roughness={1} metalness={0} />
      </mesh>

      <group position={[3.6, 0, -1]}>
        <mesh position={[0, 0.3, 0]}>
          <boxGeometry args={[1.5, 0.6, 1.2]} />
          <meshStandardMaterial color="#7d7d7d" roughness={0.9} metalness={0} />
        </mesh>
        <mesh position={[0, 0.63, 0]}>
          <cylinderGeometry args={[0.5, 0.5, 0.06, 32]} />
          <meshStandardMaterial color="#b4b4b4" roughness={0.5} metalness={0} />
        </mesh>
      </group>

      <group position={[-5.2, 0, -1.4]}>
        <mesh position={[0, 0.95, 0]}>
          <boxGeometry args={[0.9, 1.9, 0.8]} />
          <meshStandardMaterial color="#949494" roughness={0.95} metalness={0} />
        </mesh>
        <mesh position={[0, 1.25, 0.41]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.28, 0.28, 0.06, 24]} />
          <meshStandardMaterial color="#9c9c9c" roughness={0.8} metalness={0} />
        </mesh>
        <mesh position={[0, 0.55, 0.41]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.15, 0.15, 0.06, 24]} />
          <meshStandardMaterial color="#9c9c9c" roughness={0.8} metalness={0} />
        </mesh>
      </group>

      <group position={[0.4, 2.1, -1.99]}>
        <mesh>
          <boxGeometry args={[2.1, 1.2, 0.22]} />
          <meshStandardMaterial color="#949494" roughness={0.7} metalness={0} />
        </mesh>
        <mesh position={[0, 0, 0.12]}>
          <boxGeometry args={[1.86, 1.0, 0.02]} />
          <meshStandardMaterial color="#262626" roughness={0.4} metalness={0} />
        </mesh>
      </group>
    </group>
  );
}
