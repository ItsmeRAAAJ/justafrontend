import { useMemo } from 'react';
import * as THREE from 'three';
import { Line } from '@react-three/drei';
import { TRACK_SEGMENTS, railGeometry } from './topology';

// ============================================================================
//  Track — two glowing rails per segment, a faint centreline, and sleepers.
//  Rails glow softly (they are the "lit" schematic lines of a digital twin);
//  sleepers stay matte so the geometry reads as track, not as a laser.
// ============================================================================

interface TrackProps {
  railColor: string;
  sleeperColor: string;
  centreColor: string;
}

const sleeperGeom = new THREE.BoxGeometry(0.26, 0.012, 0.05);

export function Track({ railColor, sleeperColor, centreColor }: TrackProps) {
  const segments = useMemo(
    () => TRACK_SEGMENTS.map((s) => ({ id: s.id, ...railGeometry(s.curve) })),
    [],
  );

  return (
    <group>
      {segments.map((s) => (
        <group key={s.id}>
          {/* Centreline — very faint, gives the "route chart" feel */}
          <Line
            points={s.left.map((p, i) => p.clone().lerp(s.right[i], 0.5))}
            color={centreColor}
            lineWidth={0.6}
            transparent
            opacity={0.35}
            position={[0, 0.002, 0]}
          />
          {/* Rails */}
          <Line points={s.left} color={railColor} lineWidth={1.6} toneMapped={false} />
          <Line points={s.right} color={railColor} lineWidth={1.6} toneMapped={false} />
          {/* Sleepers */}
          {s.sleepers.map((sl, i) => (
            <mesh
              key={i}
              geometry={sleeperGeom}
              position={sl.position}
              rotation={[0, sl.rotationY, 0]}
            >
              <meshStandardMaterial color={sleeperColor} roughness={0.9} metalness={0.1} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}
