import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

interface AnomalyIndicatorProps {
  position: [number, number, number];
  anomalyType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  onClick: () => void;
}

const AnomalyIndicator: React.FC<AnomalyIndicatorProps> = ({
  position,
  anomalyType,
  severity,
  onClick
}) => {
  const meshRef = useRef<THREE.Mesh>(null);

  const getSeverityColor = () => {
    switch (severity) {
      case 'critical': return '#ef4444';
      case 'high': return '#f97316';
      case 'medium': return '#f59e0b';
      case 'low': return '#eab308';
      default: return '#f59e0b';
    }
  };

  useFrame(({ clock }) => {
    if (meshRef.current) {
      const time = clock.getElapsedTime();
      meshRef.current.scale.setScalar(1 + Math.sin(time * 4) * 0.2);
    }
  });

  return (
    <group position={position} onClick={onClick}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshStandardMaterial
          color={getSeverityColor()}
          emissive={getSeverityColor()}
          emissiveIntensity={0.5}
          transparent
          opacity={0.8}
        />
      </mesh>
      
      <Html position={[0, 0.3, 0]} center>
        <div className="bg-red-900/90 text-white px-2 py-1 rounded text-xs border border-red-600 pointer-events-none">
          {anomalyType.replace('_', ' ').toUpperCase()}
        </div>
      </Html>
    </group>
  );
};

export default AnomalyIndicator;