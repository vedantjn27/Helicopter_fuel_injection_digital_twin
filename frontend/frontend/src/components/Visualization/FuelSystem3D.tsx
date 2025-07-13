import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Box, Cylinder, Sphere } from '@react-three/drei';
import * as THREE from 'three';
import { TelemetryData } from '../../services/api';

interface AnimatedFlowProps {
  start: [number, number, number];
  end: [number, number, number];
  flowRate: number;
  isActive: boolean;
}

const AnimatedFlow: React.FC<AnimatedFlowProps> = ({ start, end, flowRate, isActive }) => {
  const ref = useRef<THREE.Group>(null);
  const particlesRef = useRef<THREE.Points>(null);
  
  const particles = useMemo(() => {
    const count = 50;
    const positions = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
      const t = i / count;
      positions[i * 3] = start[0] + (end[0] - start[0]) * t;
      positions[i * 3 + 1] = start[1] + (end[1] - start[1]) * t;
      positions[i * 3 + 2] = start[2] + (end[2] - start[2]) * t;
    }
    
    return positions;
  }, [start, end]);

  useFrame(({ clock }) => {
    if (!isActive || !particlesRef.current) return;
    
    const time = clock.getElapsedTime();
    const speed = flowRate * 2;
    
    const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
    
    for (let i = 0; i < positions.length; i += 3) {
      const particleIndex = i / 3;
      const offset = (time * speed + particleIndex * 0.1) % 1;
      
      positions[i] = start[0] + (end[0] - start[0]) * offset;
      positions[i + 1] = start[1] + (end[1] - start[1]) * offset;
      positions[i + 2] = start[2] + (end[2] - start[2]) * offset;
    }
    
    particlesRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <group ref={ref}>
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            array={particles}
            count={particles.length / 3}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.05}
          color={isActive ? "#10b981" : "#374151"}
          transparent
          opacity={isActive ? 0.8 : 0.3}
        />
      </points>
    </group>
  );
};

interface FuelComponentProps {
  position: [number, number, number];
  color: string;
  size: [number, number, number];
  type: 'tank' | 'pump' | 'injector' | 'engine';
  label: string;
  status: 'normal' | 'warning' | 'error';
}

const FuelComponent: React.FC<FuelComponentProps> = ({ 
  position, 
  color, 
  size, 
  type, 
  label, 
  status 
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame(({ clock }) => {
    if (!meshRef.current) return;
  
    const material = meshRef.current.material as THREE.MeshStandardMaterial;
  
    if (status === 'error') {
      material.color.setHex(0xff4444);
      meshRef.current.scale.setScalar(1 + Math.sin(clock.getElapsedTime() * 4) * 0.1);
    } else if (status === 'warning') {
      material.color.setHex(0xfbbf24);
    } else {
      material.color.setHex(parseInt(color.replace('#', '0x')));
      meshRef.current.scale.setScalar(1);
    }
  });

  const Component = type === 'tank' ? Cylinder : Box;

  return (
    <group position={position}>
      <Component
        ref={meshRef}
        args={type === 'tank' ? [size[0], size[0], size[1]] : size}
      >
        <meshStandardMaterial color={color} transparent opacity={0.8} />
      </Component>
      <Text
        position={[0, size[1] + 0.5, 0]}
        fontSize={0.3}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {label}
      </Text>
    </group>
  );
};

interface FuelSystem3DProps {
  data: TelemetryData | null;
}

const FuelSystem3D: React.FC<FuelSystem3DProps> = ({ data }) => {
  const getComponentStatus = (value: number, min: number, max: number) => {
    const percentage = (value - min) / (max - min);
    if (percentage > 0.8) return 'error';
    if (percentage > 0.6) return 'warning';
    return 'normal';
  };

  const components: FuelComponentProps[] = [
    {
      position: [-4, 0, 0],
      color: '#3b82f6',
      size: [1, 2, 1],
      type: 'tank',
      label: 'Fuel Tank',
      status: 'normal'
    },
    {
      position: [-1, 0, 0],
      color: '#10b981',
      size: [0.8, 0.8, 0.8],
      type: 'pump',
      label: 'Pump',
      status: data ? getComponentStatus(data.fuel_pressure, 0, 8) as 'normal' | 'warning' | 'error' : 'normal'
    },
    {
      position: [2, 0, 0],
      color: '#f59e0b',
      size: [0.6, 1.2, 0.6],
      type: 'injector',
      label: 'Injector',
      status: data ? getComponentStatus(data.flow_rate, 0, 15) as 'normal' | 'warning' | 'error' : 'normal'
    },
    {
      position: [5, 0, 0],
      color: '#ef4444',
      size: [1.5, 1, 1],
      type: 'engine',
      label: 'Engine',
      status: data ? getComponentStatus(data.rpm, 0, 6000) as 'normal' | 'warning' | 'error' : 'normal'
    }
  ];
  const flows = [
    {
      start: [-3, 0, 0] as [number, number, number],
      end: [-2, 0, 0] as [number, number, number],
      flowRate: data?.flow_rate || 0,
      isActive: !!data && data.flow_rate > 0
    },
    {
      start: [-0.5, 0, 0] as [number, number, number],
      end: [1.5, 0, 0] as [number, number, number],
      flowRate: data?.flow_rate || 0,
      isActive: !!data && data.flow_rate > 0
    },
    {
      start: [2.5, 0, 0] as [number, number, number],
      end: [4, 0, 0] as [number, number, number],
      flowRate: data?.flow_rate || 0,
      isActive: !!data && data.flow_rate > 0
    }
  ];

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 h-96">
      <div className="p-4 border-b border-slate-700">
        <h3 className="text-xl font-bold text-white">3D Fuel System Visualization</h3>
        <p className="text-slate-400 text-sm">Interactive 3D model showing real-time fuel flow</p>
      </div>
      
      <div className="h-80">
        <Canvas camera={{ position: [0, 5, 10], fov: 50 }}>
          <ambientLight intensity={0.4} />
          <directionalLight position={[10, 10, 5]} intensity={0.8} />
          <pointLight position={[0, 10, 0]} intensity={0.5} color="#ffffff" />
          
          {components.map((component, index) => (
            <FuelComponent key={index} {...component} />
          ))}
          
          {flows.map((flow, index) => (
            <AnimatedFlow key={index} {...flow} />
          ))}
          
          <OrbitControls 
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            autoRotate={true}
            autoRotateSpeed={1}
          />
        </Canvas>
      </div>
    </div>
  );
};

export default FuelSystem3D;