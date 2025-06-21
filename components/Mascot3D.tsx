import React, { useRef, useState, useMemo, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

// Animation configuration constants
const ANIMATION_CONFIG = {
  blinkDuration: 220,
  blinkInterval: { min: 3200, max: 4400 },
  wave: { normal: 0.5, hover: 0.75, speed: { normal: 2.5, hover: 4.5 } },
  bounce: { normal: 0.15, hover: 0.23, speed: { normal: 2, hover: 3 } },
  smile: { normal: { arc: Math.PI * 1.0, y: 0}, hover: { arc: Math.PI * 1.15, y: -0.25 } },
  pen: { wiggleSpeed: 8, wiggleAmount: 0.13 },
  tilt: { speed: 1.7, amount: 0.18 },
  highlight: { speed: 1.2, xRange: 0.08, yRange: 0.06 }
};

// Interfaces for better TypeScript support
interface MascotBlobProps {
  hover: boolean;
}

interface Mascot3DProps {
  className?: string;
  style?: React.CSSProperties;
}

const MascotBlob = React.memo(({ hover }: MascotBlobProps) => {
  // Animation refs
  const armRef = useRef<THREE.Group>(null);
  const penRef = useRef<THREE.Group>(null);
  const mascotRef = useRef<THREE.Group>(null);
  const smileRef = useRef<THREE.Mesh>(null);
  const highlightRef = useRef<THREE.Mesh>(null);
  const [blink, setBlink] = useState(false);

  // Memoized smile configuration
  const smileConfig = useMemo(() => {
    return hover ? ANIMATION_CONFIG.smile.hover : ANIMATION_CONFIG.smile.normal;
  }, [hover]);

  // Memoized smile geometry (fixes arc update issue)
  const smileGeometry = useMemo(
    () => new THREE.TorusGeometry(0.28, 0.055, 16, 100, smileConfig.arc),
    [smileConfig.arc]
  );

  // Blinking logic with cleanup
  React.useEffect(() => {
    const getRandomInterval = () => 
      ANIMATION_CONFIG.blinkInterval.min + 
      Math.random() * (ANIMATION_CONFIG.blinkInterval.max - ANIMATION_CONFIG.blinkInterval.min);

    const scheduleNextBlink = () => {
      const timeoutId = setTimeout(() => {
        setBlink(true);
        setTimeout(() => {
          setBlink(false);
          scheduleNextBlink(); // Schedule next blink
        }, ANIMATION_CONFIG.blinkDuration);
      }, getRandomInterval());
      return timeoutId;
    };

    const timeoutId = scheduleNextBlink();
    return () => clearTimeout(timeoutId);
  }, []);

  // Optimized animation frame callback
  const animateFrame = useCallback((state: any) => {
    const t = state.clock.getElapsedTime();
    // Arm waving animation
    if (armRef.current) {
      const config = ANIMATION_CONFIG.wave;
      const speed = hover ? config.speed.hover : config.speed.normal;
      const amplitude = hover ? config.hover : config.normal;
      const base = Math.sin(t * speed) * amplitude;
      armRef.current.rotation.z = base - 0.7;
    }
    // Pen wiggle animation
    if (penRef.current) {
      const { wiggleSpeed, wiggleAmount } = ANIMATION_CONFIG.pen;
      penRef.current.rotation.z = Math.sin(t * wiggleSpeed) * wiggleAmount;
    }
    // Mascot bounce and tilt animation
    if (mascotRef.current) {
      const bounceConfig = ANIMATION_CONFIG.bounce;
      const bounceSpeed = hover ? bounceConfig.speed.hover : bounceConfig.speed.normal;
      const bounceAmount = hover ? bounceConfig.hover : bounceConfig.normal;
      mascotRef.current.position.y = Math.abs(Math.sin(t * bounceSpeed)) * bounceAmount;
      mascotRef.current.scale.setScalar(hover ? 1.11 : 1);
      const { speed: tiltSpeed, amount: tiltAmount } = ANIMATION_CONFIG.tilt;
      mascotRef.current.rotation.z = Math.sin(t * tiltSpeed) * tiltAmount + (hover ? tiltAmount : 0);
    }
    // Animated highlight
    if (highlightRef.current) {
      const { speed, xRange, yRange } = ANIMATION_CONFIG.highlight;
      const x = -0.45 + Math.sin(t * speed) * xRange;
      const y = 0.55 + Math.cos(t * speed) * yRange;
      highlightRef.current.position.x = x;
      highlightRef.current.position.y = y;
    }
  }, [hover]);

  useFrame(animateFrame);

  // Memoized geometries for better performance
  const geometries = useMemo(() => ({
    blob: new THREE.SphereGeometry(1.18, 40, 40),
    highlight: new THREE.SphereGeometry(0.22, 20, 20),
    cheek: new THREE.SphereGeometry(0.13, 16, 16),
    eye: new THREE.SphereGeometry(0.16, 18, 18),
    eyeSparkle1: new THREE.SphereGeometry(0.035, 10, 10),
    eyeSparkle2: new THREE.SphereGeometry(0.018, 10, 10),
    eyelid: new THREE.SphereGeometry(0.16, 18, 18),
    arm: new THREE.CylinderGeometry(0.09, 0.12, 0.7, 18),
    hand: new THREE.SphereGeometry(0.15, 18, 18),
    penBody: new THREE.CylinderGeometry(0.025, 0.025, 0.22, 12),
    penTip: new THREE.ConeGeometry(0.03, 0.06, 12),
    penGlow: new THREE.SphereGeometry(0.04, 12, 12),
    sparkle: new THREE.OctahedronGeometry(0.018, 0)
  }), []);
  
  return (
    <group ref={mascotRef}>
      {/* Blob body with animated highlight */}
      <mesh castShadow receiveShadow geometry={geometries.blob}>
        <meshStandardMaterial color="#f9c2d1" roughness={0.65} metalness={0.04} />
      </mesh>
  
      {/* Animated Highlight/shine */}
      <mesh ref={highlightRef} position={[-0.45, 0.55, 1.18]} geometry={geometries.highlight}>
        <meshStandardMaterial color="#fff" transparent opacity={0.38} />
      </mesh>
  
      {/* Blush (cheeks) */}
      <mesh position={[-0.55, 0.1, 1.13]} geometry={geometries.cheek}>
        <meshStandardMaterial color="#f78fb3" roughness={0.8} metalness={0.1} />
      </mesh>
      <mesh position={[0.55, 0.1, 1.13]} geometry={geometries.cheek}>
        <meshStandardMaterial color="#f78fb3" roughness={0.8} metalness={0.1} />
      </mesh>
  
      {/* Eyes with sparkles and blinking */}
      <mesh position={[-0.28, 0.38, 1.18]} geometry={geometries.eye}>
        <meshStandardMaterial color="#a78bfa" />
        {/* Eye sparkles */}
        <mesh position={[0.07, 0.07, 0.13]} geometry={geometries.eyeSparkle1}>
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        <mesh position={[-0.03, -0.04, 0.13]} geometry={geometries.eyeSparkle2}>
          <meshStandardMaterial color="#fffaf0" />
        </mesh>
        {/* Eyelid for blink */}
        {blink && (
          <mesh position={[0, 0, 0.07]}>
            <sphereGeometry args={[0.16, 18, 18, 0, Math.PI * 2, 0, Math.PI / 1.7]} />
            <meshStandardMaterial color="#fff" />
          </mesh>
        )}
      </mesh>
  
      <mesh position={[0.28, 0.38, 1.18]} geometry={geometries.eye}>
        <meshStandardMaterial color="#a78bfa" />
        {/* Eye sparkles */}
        <mesh position={[0.07, 0.07, 0.13]} geometry={geometries.eyeSparkle1}>
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        <mesh position={[-0.03, -0.04, 0.13]} geometry={geometries.eyeSparkle2}>
          <meshStandardMaterial color="#fffaf0" />
        </mesh>
        {blink && (
          <mesh position={[0, 0, 0.07]}>
            <sphereGeometry args={[0.16, 18, 18, 0, Math.PI * 2, 0, Math.PI / 1.7]} />
            <meshStandardMaterial color="#fff" />
          </mesh>
        )}
      </mesh>
  
      {/* Smile (morphs on hover) */}
      <mesh 
        ref={smileRef} 
        position={[0, smileConfig.y, 1.18]} 
        rotation={[0, 0, Math.PI + 0.1]}
        geometry={smileGeometry}
      >
        <meshStandardMaterial color="#a78bfa" />
      </mesh>
  
      {/* Arm (waving, holding pen) */}
      <group ref={armRef} position={[-1.08, 0.5, 0.7]}>
        {/* Arm */}
        <mesh castShadow geometry={geometries.arm}>
          <meshStandardMaterial color="#f9c2d1" />
        </mesh>
  
        {/* Hand */}
        <mesh position={[0, 0.38, 0]} geometry={geometries.hand}>
          <meshStandardMaterial color="#f9c2d1" />
        </mesh>
  
        {/* Pen with effects */}
        <group ref={penRef} position={[0, 0.58, 0]} rotation={[0, 0, Math.PI / 8]}>
          {/* Pen body */}
          <mesh geometry={geometries.penBody}>
            <meshStandardMaterial color="#a78bfa" />
          </mesh>
  
          {/* Pen tip */}
          <mesh position={[0, 0.12, 0]} geometry={geometries.penTip}>
            <meshStandardMaterial color="#fcd5ce" emissive="#fcd5ce" emissiveIntensity={0.8} />
          </mesh>
  
          {/* Pen tip glow */}
          <mesh position={[0, 0.14, 0]} geometry={geometries.penGlow}>
            <meshStandardMaterial 
              color="#fcd5ce" 
              transparent 
              opacity={0.6} 
              emissive="#fcd5ce" 
              emissiveIntensity={1.1} 
            />
          </mesh>
  
          {/* Sparkle (star) */}
          <mesh position={[0.06, 0.16, 0]} rotation={[0, 0, Math.PI / 6]} geometry={geometries.sparkle}>
            <meshStandardMaterial color="#fff2cc" emissive="#fff2cc" emissiveIntensity={1.5} />
          </mesh>
        </group>
      </group>
    </group>
  );
});

MascotBlob.displayName = 'MascotBlob';

const Mascot3D: React.FC<Mascot3DProps> = ({ className = '', style = {} }) => {
  const [hover, setHover] = useState(false);

  const handleMouseEnter = useCallback(() => setHover(true), []);
  const handleMouseLeave = useCallback(() => setHover(false), []);
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      setHover(!hover);
    }
  }, [hover]);

  const containerStyle = useMemo(() => ({
    width: '180px',
    height: '180px',
    margin: '0 auto',
    cursor: 'pointer',
    outline: 'none',
    ...style
  }), [style]);

  return (
    <div
      className={className}
      style={containerStyle}
      role="img"
      aria-label="3D Fillable mascot, a super cute blob waving a pen"
      tabIndex={0}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onKeyDown={handleKeyDown}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
    >
      <Canvas camera={{ position: [0, 0, 4.2], fov: 40 }} shadows>
        <ambientLight intensity={0.8} />
        <directionalLight position={[2, 4, 5]} intensity={0.7} castShadow />
        <MascotBlob hover={hover} />
        {/* Soft ground shadow */}
        <mesh position={[0, -1.2, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <circleGeometry args={[1.1, 32]} />
          <meshStandardMaterial color="#6366f1" opacity={0.13} transparent />
        </mesh>
      </Canvas>
    </div>
  );
};

export default Mascot3D;