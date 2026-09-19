import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Trail } from '@react-three/drei';
import { ROUTES, type BranchId } from './topology';

// ============================================================================
//  Train — a small emissive rake (three coaches) with a light trail behind it.
//  Each train runs CSMT → KYN, and at KYN commits to IGP or KJT. When it
//  reaches the terminal it dwells briefly, then restarts from CSMT on a
//  freshly chosen branch. Multiple trains are staggered by `offset`.
// ============================================================================

interface TrainProps {
  color: string;
  /** 0..1 initial progress so trains don't all leave CSMT together. */
  offset?: number;
  /** Seconds for a full CSMT → terminal run. */
  duration?: number;
  /** Probability of taking the IGP branch (else KJT). */
  igpBias?: number;
  reduced: boolean;
}

function pickBranch(igpBias: number): BranchId {
  return Math.random() < igpBias ? 'IGP' : 'KJT';
}

export function Train({
  color,
  offset = 0,
  duration = 26,
  igpBias = 0.5,
  reduced,
}: TrainProps) {
  const group = useRef<THREE.Group>(null);
  const [branch, setBranch] = useState<BranchId>(() => pickBranch(igpBias));
  const state = useRef({ t: offset, dwell: 0 });

  const tmp = useMemo(
    () => ({ p: new THREE.Vector3(), tan: new THREE.Vector3(), look: new THREE.Vector3() }),
    [],
  );

  useFrame((_, delta) => {
    const g = group.current;
    if (!g) return;
    const curve = ROUTES[branch];
    const s = state.current;

    if (!reduced) {
      if (s.dwell > 0) {
        s.dwell -= delta;
        if (s.dwell <= 0) {
          s.t = 0;
          setBranch(pickBranch(igpBias));
        }
      } else {
        s.t += delta / duration;
        if (s.t >= 1) {
          s.t = 1;
          s.dwell = 1.6 + Math.random() * 1.4;
        }
      }
    }

    // Ease in/out of the terminals so it reads as a real departure/arrival.
    const eased = s.t < 0.06 ? s.t * (s.t / 0.06) : s.t > 0.94 ? 1 - (1 - s.t) * ((1 - s.t) / 0.06) : s.t;
    curve.getPointAt(THREE.MathUtils.clamp(eased, 0, 1), tmp.p);
    curve.getTangentAt(THREE.MathUtils.clamp(eased, 0, 1), tmp.tan);
    g.position.copy(tmp.p).setY(tmp.p.y + 0.06);
    tmp.look.copy(g.position).add(tmp.tan);
    g.lookAt(tmp.look);
  });

  return (
    <group ref={group}>
      <Trail width={0.9} length={6} decay={1.4} attenuation={(w) => w * w} color={color}>
        {/* Head-end light: the bright point the trail hangs off */}
        <mesh position={[0, 0, 0.2]}>
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshBasicMaterial color={color} toneMapped={false} />
        </mesh>
      </Trail>

      {/* Three-coach rake */}
      {[0.12, -0.12, -0.36].map((z, i) => (
        <mesh key={i} position={[0, 0, z]}>
          <boxGeometry args={[0.09, 0.07, 0.2]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={i === 0 ? 1.4 : 0.8}
            roughness={0.35}
            metalness={0.3}
            toneMapped={false}
          />
        </mesh>
      ))}
      <pointLight color={color} intensity={0.9} distance={1.6} decay={2} position={[0, 0.1, 0.2]} />
    </group>
  );
}
