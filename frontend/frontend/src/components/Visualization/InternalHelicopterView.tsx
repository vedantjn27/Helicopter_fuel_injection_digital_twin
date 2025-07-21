import React, { useRef, useMemo,useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Html } from '@react-three/drei';
import * as THREE from 'three';
import { TelemetryData } from '../../services/api';

interface InternalHelicopterViewProps {
  data: TelemetryData | null;
  onClose: () => void;
}

// Fuel Pump Internal View
const FuelPumpInternal: React.FC<{ data: TelemetryData | null }> = ({ data }) => {
  const pumpRef = useRef<THREE.Group>(null);
  const impellerRef = useRef<THREE.Mesh>(null);
  const particlesRef = useRef<THREE.Points>(null);

  const particles = useMemo(() => {
    const count = 200;
    const positions = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const radius = Math.random() * 0.8;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 2;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
    }
    
    return positions;
  }, []);

  useFrame(({ clock }) => {
    if (!data) return;
    
    const time = clock.getElapsedTime();
    const pumpSpeed = (data.fuel_pressure / 8) * 0.5;
    
    // Rotate impeller
    if (impellerRef.current) {
      impellerRef.current.rotation.y += pumpSpeed;
    }
    
    // Animate fuel particles in spiral pattern
    if (particlesRef.current) {
      const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
      
      for (let i = 0; i < positions.length; i += 3) {
        const particleIndex = i / 3;
        const angle = time * pumpSpeed + particleIndex * 0.1;
        const radius = 0.3 + Math.sin(time + particleIndex) * 0.2;
        
        positions[i] = Math.cos(angle) * radius;
        positions[i + 1] = ((time * pumpSpeed + particleIndex * 0.05) % 2) - 1;
        positions[i + 2] = Math.sin(angle) * radius;
      }
      
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
    }
    
    // Pump vibration based on pressure
    if (pumpRef.current && data.fuel_pressure > 4) {
      const vibration = (data.fuel_pressure - 4) * 0.01;
      pumpRef.current.position.y = Math.sin(time * 20) * vibration;
    }
  });

  return (
    <group ref={pumpRef}>
      {/* Pump housing */}
      <mesh>
        <cylinderGeometry args={[1, 1, 2, 16]} />
        <meshStandardMaterial 
          color={data && data.fuel_pressure > 4 ? "#ef4444" : "#10b981"} 
          metalness={0.8} 
          roughness={0.2}
        />
      </mesh>
      
      {/* Impeller */}
      <mesh ref={impellerRef}>
        <cylinderGeometry args={[0.7, 0.7, 0.2, 6]} />
        <meshStandardMaterial color="#60a5fa" metalness={0.9} roughness={0.1} />
      </mesh>
      
      {/* Impeller blades */}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <mesh key={i} ref={impellerRef} rotation={[0, i * Math.PI / 3, 0]}>
          <boxGeometry args={[0.8, 0.05, 0.15]} />
          <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.2} />
        </mesh>
      ))}
      
      {/* Fuel particles */}
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
          size={0.03}
          color="#3b82f6"
          transparent
          opacity={0.8}
        />
      </points>
      
      {/* Inlet pipe */}
      <mesh position={[-1.5, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.2, 0.2, 1, 12]} />
        <meshStandardMaterial color="#374151" metalness={0.8} roughness={0.2} />
      </mesh>
      
      {/* Outlet pipe */}
      <mesh position={[1.5, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.2, 0.2, 1, 12]} />
        <meshStandardMaterial color="#374151" metalness={0.8} roughness={0.2} />
      </mesh>
      
      <Text position={[0, -1.5, 0]} fontSize={0.2} color="white" anchorX="center">
        Fuel Pump Internal View
      </Text>
    </group>
  );
};

// Engine Combustion Chamber
const EngineCombustion: React.FC<{ data: TelemetryData | null }> = ({ data }) => {
  const engineRef = useRef<THREE.Group>(null);
  const turbineRef = useRef<THREE.Mesh>(null);
  const flameRef = useRef<THREE.Points>(null);

  const flameParticles = useMemo(() => {
    const count = 300;
    const positions = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 0.5;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = Math.random() * 2;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
    }
    
    return positions;
  }, []);

  useFrame(({ clock }) => {
    if (!data) return;
    
    const time = clock.getElapsedTime();
    const rpmFactor = data.rpm / 6000;
    
    // Rotate turbine
    if (turbineRef.current) {
      turbineRef.current.rotation.z += rpmFactor * 0.5;
    }
    
    // Animate flame particles
    if (flameRef.current) {
      const positions = flameRef.current.geometry.attributes.position.array as Float32Array;
      
      for (let i = 0; i < positions.length; i += 3) {
        const particleIndex = i / 3;
        positions[i + 1] += rpmFactor * 0.02;
        
        if (positions[i + 1] > 2) {
          positions[i + 1] = 0;
          const angle = Math.random() * Math.PI * 2;
          const radius = Math.random() * 0.5;
          positions[i] = Math.cos(angle) * radius;
          positions[i + 2] = Math.sin(angle) * radius;
        }
      }
      
      flameRef.current.geometry.attributes.position.needsUpdate = true;
    }
    
    // Engine vibration during RPM surge
    if (engineRef.current && data.rpm > 5000) {
      const vibration = ((data.rpm - 5000) / 1000) * 0.02;
      engineRef.current.rotation.z = Math.sin(time * 30) * vibration;
    }
  });

  return (
    <group ref={engineRef}>
      {/* Combustion chamber */}
      <mesh>
        <cylinderGeometry args={[1.2, 1.2, 3, 16]} />
        <meshStandardMaterial 
          color={data && data.rpm > 5000 ? "#ef4444" : "#dc2626"} 
          metalness={0.7} 
          roughness={0.3}
        />
      </mesh>
      
      {/* Turbine */}
      <mesh ref={turbineRef}>
        <cylinderGeometry args={[0.8, 0.8, 0.3, 8]} />
        <meshStandardMaterial color="#60a5fa" metalness={0.9} roughness={0.1} />
      </mesh>
      
      {/* Turbine blades */}
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <mesh key={i} ref={turbineRef} rotation={[0, i * Math.PI / 4, 0]}>
          <boxGeometry args={[1.0, 0.05, 0.2]} />
          <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.2} />
        </mesh>
      ))}
      
      {/* Flame particles */}
      <points ref={flameRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            array={flameParticles}
            count={flameParticles.length / 3}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.05}
          color={data && data.rpm > 3000 ? "#ff6b35" : "#ff9500"}
          transparent
          opacity={0.8}
        />
      </points>
      
      {/* Fuel injector nozzles */}
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[Math.cos(i * Math.PI / 2) * 1.3, -1, Math.sin(i * Math.PI / 2) * 1.3]}>
          <coneGeometry args={[0.1, 0.3, 8]} />
          <meshStandardMaterial color="#374151" metalness={0.9} roughness={0.1} />
        </mesh>
      ))}
      
      {/* Exhaust outlet */}
      <mesh position={[0, -2, 0]}>
        <cylinderGeometry args={[0.8, 1.0, 0.5, 12]} />
        <meshStandardMaterial 
          color="#1a1a1a" 
          emissive="#ff4500"
          emissiveIntensity={data && data.rpm > 2000 ? 0.3 : 0.1}
        />
      </mesh>
      
      <Text position={[0, -3, 0]} fontSize={0.2} color="white" anchorX="center">
        Engine Combustion Chamber
      </Text>
    </group>
  );
};

// Fuel Injector System
const FuelInjectorSystem: React.FC<{ data: TelemetryData | null }> = ({ data }) => {
  const injectorRef = useRef<THREE.Group>(null);
  const sprayRef = useRef<THREE.Points>(null);

  const sprayParticles = useMemo(() => {
    const count = 150;
    const positions = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const radius = Math.random() * 0.3;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = -Math.random() * 1.5;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
    }
    
    return positions;
  }, []);

  useFrame(({ clock }) => {
    if (!data) return;
    
    const time = clock.getElapsedTime();
    const flowRate = data.flow_rate;
    
    // Animate spray particles
    if (sprayRef.current && flowRate > 0) {
      const positions = sprayRef.current.geometry.attributes.position.array as Float32Array;
      
      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] -= flowRate * 0.02;
        
        if (positions[i + 1] < -1.5) {
          positions[i + 1] = 0;
          const angle = Math.random() * Math.PI * 2;
          const radius = Math.random() * 0.3;
          positions[i] = Math.cos(angle) * radius;
          positions[i + 2] = Math.sin(angle) * radius;
        }
      }
      
      sprayRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <group ref={injectorRef}>
      {/* Injector body */}
      <mesh>
        <cylinderGeometry args={[0.3, 0.2, 1.5, 12]} />
        <meshStandardMaterial 
          color={data && data.flow_rate < 2 && data.fuel_pressure > 4 ? "#ef4444" : "#f59e0b"} 
          metalness={0.8} 
          roughness={0.2}
        />
      </mesh>
      
      {/* Injector nozzle */}
      <mesh position={[0, -0.9, 0]}>
        <coneGeometry args={[0.15, 0.3, 12]} />
        <meshStandardMaterial color="#1f2937" metalness={0.9} roughness={0.1} />
      </mesh>
      
      {/* Fuel spray */}
      {data && data.flow_rate > 0 && (
        <points ref={sprayRef} position={[0, -1.2, 0]}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              array={sprayParticles}
              count={sprayParticles.length / 3}
              itemSize={3}
            />
          </bufferGeometry>
          <pointsMaterial
            size={0.03}
            color="#60a5fa"
            transparent
            opacity={0.8}
          />
        </points>
      )}
      
      {/* Fuel line */}
      <mesh position={[0, 1, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.5, 8]} />
        <meshStandardMaterial color="#374151" metalness={0.8} roughness={0.2} />
      </mesh>
      
      <Text position={[0, -2, 0]} fontSize={0.2} color="white" anchorX="center">
        Fuel Injector System
      </Text>
    </group>
  );
};

const InternalHelicopterView: React.FC<InternalHelicopterViewProps> = ({ data, onClose }) => {
  const [selectedComponent, setSelectedComponent] = useState<'pump' | 'engine' | 'injector'>('pump');

  const renderComponent = () => {
    switch (selectedComponent) {
      case 'pump':
        return <FuelPumpInternal data={data} />;
      case 'engine':
        return <EngineCombustion data={data} />;
      case 'injector':
        return <FuelInjectorSystem data={data} />;
      default:
        return <FuelPumpInternal data={data} />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-slate-900 rounded-xl border border-slate-700 w-[90vw] h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Internal Helicopter Components</h2>
            <p className="text-slate-400 text-sm">3D visualization of internal fuel system components</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Component selector */}
        <div className="p-4 border-b border-slate-700">
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedComponent('pump')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                selectedComponent === 'pump'
                  ? 'bg-orange-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Fuel Pump
            </button>
            <button
              onClick={() => setSelectedComponent('engine')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                selectedComponent === 'engine'
                  ? 'bg-orange-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Engine Combustion
            </button>
            <button
              onClick={() => setSelectedComponent('injector')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                selectedComponent === 'injector'
                  ? 'bg-orange-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Fuel Injector
            </button>
          </div>
        </div>

        {/* 3D View */}
        <div className="flex-1">
          <Canvas camera={{ position: [5, 3, 5], fov: 50 }}>
            <ambientLight intensity={0.4} />
            <directionalLight position={[10, 10, 5]} intensity={0.8} />
            <pointLight position={[0, 10, 0]} intensity={0.5} />
            
            {renderComponent()}
            
            <OrbitControls 
              enablePan={true}
              enableZoom={true}
              enableRotate={true}
              maxPolarAngle={Math.PI / 2}
            />
          </Canvas>
        </div>

        {/* Status panel */}
        <div className="p-4 border-t border-slate-700 bg-slate-800/50">
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-slate-400">RPM:</span>
              <span className="ml-2 text-white font-mono">{data?.rpm.toLocaleString() || '0'}</span>
            </div>
            <div>
              <span className="text-slate-400">Pressure:</span>
              <span className="ml-2 text-white font-mono">{data?.fuel_pressure.toFixed(1) || '0.0'} Bar</span>
            </div>
            <div>
              <span className="text-slate-400">Temperature:</span>
              <span className="ml-2 text-white font-mono">{data?.fuel_temp.toFixed(1) || '0.0'}°C</span>
            </div>
            <div>
              <span className="text-slate-400">Flow Rate:</span>
              <span className="ml-2 text-white font-mono">{data?.flow_rate.toFixed(1) || '0.0'} L/min</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InternalHelicopterView;