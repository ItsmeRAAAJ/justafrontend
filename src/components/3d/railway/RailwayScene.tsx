import { Suspense, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Grid } from '@react-three/drei';
import { Track } from './Track';
import { Stations } from './Stations';
import { Train } from './Train';
import { JUNCTION, cssVar } from './topology';

// ============================================================================
//  RailwayScene — the login backdrop.
//
//  A slow cinematic orbit around Kalyan Jn from an isometric-ish elevation.
//  Colours are pulled from tokens.css at mount so the scene stays in the
//  design system (brass nodes, signal-green / amber trains, graphite ground).
// ============================================================================

interface RailwaySceneProps {
  reduced: boolean;
  className?: string;
}

function CinematicCamera({ reduced }: { reduced: boolean }) {
  const { camera } = useThree();
  const theta = useRef(-0.55);
  const target = useMemo(() => JUNCTION.clone().add(new THREE.Vector3(1.2, 0, 0)), []);

  useFrame((_, delta) => {
    if (!reduced) theta.current += delta * 0.045;
    const r = 11.5;
    const h = 7.2 + Math.sin(theta.current * 0.7) * 0.6; // gentle breathing in elevation
    camera.position.set(
      target.x + Math.cos(theta.current) * r,
      h,
      target.z + Math.sin(theta.current) * r,
    );
    camera.lookAt(target);
  });
  return null;
}

function SceneContents({ reduced }: { reduced: boolean }) {
  const c = useMemo(
    () => ({
      brass: cssVar('--rs-accent', '#a66f16'),
      brassStrong: cssVar('--rs-accent-strong', '#7d500c'),
      text: cssVar('--rs-text', '#17383a'),
      muted: cssVar('--rs-text-muted', '#4f6868'),
      rail: cssVar('--rs-accent-strong', '#7d500c'),
      sleeper: cssVar('--rs-line-strong', '#7d9190'),
      centre: cssVar('--rs-rail-strong', '#3f6263'),
      green: cssVar('--rs-green-core', '#168764'),
      amber: cssVar('--rs-amber-core', '#d59320'),
      red: cssVar('--rs-red-core', '#d94b3d'),
      grid: cssVar('--rs-line', '#b9c8c6'),
      gridSection: cssVar('--rs-line-strong', '#8ca3a1'),
    }),
    [],
  );

  return (
    <>
      <CinematicCamera reduced={reduced} />

      <color attach="background" args={['#eef3f2']} />
      <ambientLight intensity={1.15} />
      <directionalLight position={[6, 10, 4]} intensity={1.5} color="#fff8e8" />
      <hemisphereLight args={['#ffffff', '#bfd0cd', 1.1]} />
      <fog attach="fog" args={['#eef3f2', 19, 37]} />

      <Grid
        position={[0, -0.01, 0]}
        args={[60, 60]}
        cellSize={0.5}
        cellThickness={0.7}
        cellColor={c.grid}
        sectionSize={2.5}
        sectionThickness={1.25}
        sectionColor={c.gridSection}
        fadeDistance={29}
        fadeStrength={1.1}
        infiniteGrid
      />

      <Track railColor={c.rail} sleeperColor={c.sleeper} centreColor={c.centre} />
      <Stations
        nodeColor={c.brass}
        majorColor={c.brassStrong}
        labelColor={c.text}
        mutedColor={c.muted}
        reduced={reduced}
      />

      {/* Three services, staggered, with different branch preferences */}
      <Train color={c.green} offset={0.05} duration={26} igpBias={0.5} reduced={reduced} />
      <Train color={c.amber} offset={0.42} duration={30} igpBias={0.7} reduced={reduced} />
      <Train color={c.green} offset={0.74} duration={24} igpBias={0.3} reduced={reduced} />
    </>
  );
}

export function RailwayScene({ reduced, className }: RailwaySceneProps) {
  return (
    <div className={className} aria-hidden="true">
      <Canvas
        dpr={[1, 1.75]}
        camera={{ fov: 32, near: 0.1, far: 80, position: [8, 7, 10] }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        frameloop={reduced ? 'demand' : 'always'}
        style={{ background: 'transparent' }}
      >
        <Suspense fallback={null}>
          <SceneContents reduced={reduced} />
        </Suspense>
      </Canvas>
    </div>
  );
}
