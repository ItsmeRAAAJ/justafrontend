import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import { ALL_STATIONS, type StationNode } from './topology';

// ============================================================================
//  Stations — glowing nodes. Major nodes (CSMT, KYN, IGP, KJT) get a pulsing
//  halo ring and a larger label; intermediate halts get a small disc + code.
// ============================================================================

interface StationsProps {
  nodeColor: string;      // brass
  majorColor: string;     // brass-strong
  labelColor: string;     // warm off-white
  mutedColor: string;
  reduced: boolean;
}

function Halo({ color, reduced }: { color: string; reduced: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current || reduced) return;
    const t = (clock.elapsedTime % 2.4) / 2.4;
    const s = 1 + t * 1.6;
    ref.current.scale.set(s, s, s);
    (ref.current.material as THREE.MeshBasicMaterial).opacity = 0.55 * (1 - t);
  });
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
      <ringGeometry args={[0.22, 0.26, 48]} />
      <meshBasicMaterial color={color} transparent opacity={0.5} toneMapped={false} />
    </mesh>
  );
}

function Station({
  node, nodeColor, majorColor, labelColor, mutedColor, reduced,
}: { node: StationNode } & StationsProps) {
  const major = !!node.major;
  const color = major ? majorColor : nodeColor;
  const r = major ? 0.16 : 0.08;

  return (
    <group position={node.pos}>
      {/* Base disc */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]}>
        <circleGeometry args={[r, 40]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      {/* Dark core so it reads as a lamp with a bezel */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.008, 0]}>
        <circleGeometry args={[r * 0.5, 32]} />
        <meshBasicMaterial color="#eef3f2" />
      </mesh>
      {major && <Halo color={color} reduced={reduced} />}
      {major && (
        <mesh position={[0, 0.16, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.32, 8]} />
          <meshBasicMaterial color={color} transparent opacity={0.6} toneMapped={false} />
        </mesh>
      )}

      <Billboard position={[0, major ? 0.62 : 0.3, 0]} follow lockX={false} lockY={false} lockZ={false}>
        <Text
          fontSize={major ? 0.3 : 0.16}
          color={major ? labelColor : mutedColor}
          anchorX="center"
          anchorY="bottom"
          letterSpacing={0.12}
          outlineWidth={major ? 0.006 : 0}
          outlineColor="#eef3f2"
        >
          {node.code}
        </Text>
        {major && (
          <Text
            position={[0, -0.04, 0]}
            fontSize={0.12}
            color={mutedColor}
            anchorX="center"
            anchorY="top"
            letterSpacing={0.04}
          >
            {node.name}
          </Text>
        )}
      </Billboard>
    </group>
  );
}

export function Stations(props: StationsProps) {
  return (
    <group>
      {ALL_STATIONS.map((n) => (
        <Station key={n.code} node={n} {...props} />
      ))}
    </group>
  );
}
