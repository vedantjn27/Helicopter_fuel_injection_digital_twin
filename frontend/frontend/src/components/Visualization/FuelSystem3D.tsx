import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Html } from '@react-three/drei';
import * as THREE from 'three';
import { TelemetryData } from '../../services/api';
import AnomalyIndicator from './AnomalyIndicator';


interface AnimatedFlowProps {
  start: [number, number, number];
  end: [number, number, number];
  flowRate: number;
  isActive: boolean;
  pipeRadius?: number;
  flowColor?: string;
}


const AnimatedFlow: React.FC<AnimatedFlowProps> = ({ 
  start, 
  end, 
  flowRate, 
  isActive, 
  pipeRadius = 0.03,
  flowColor = "#10b981"
}) => {
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

  const pipeGeometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(...start),
      new THREE.Vector3(...end)
    ]);
    return new THREE.TubeGeometry(curve, 32, pipeRadius, 12, false);
  }, [start, end, pipeRadius]);

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
    <group>
      <mesh geometry={pipeGeometry}>
        <meshStandardMaterial 
          color="#2d3748" 
          metalness={0.9} 
          roughness={0.1}
          transparent
          opacity={0.8}
        />
      </mesh>
      
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
          color={isActive ? flowColor : "#374151"}
          transparent
          opacity={isActive ? 0.8 : 0.3}
        />
      </points>
    </group>
  );
};

// Interactive Component with click detection
interface InteractiveComponentProps {
  children: React.ReactNode;
  position: [number, number, number];
  componentName: string;
  componentData: any;
  onComponentClick: (name: string, data: any, position: [number, number, number]) => void;
}



const InteractiveComponent: React.FC<InteractiveComponentProps> = ({
  children,
  position,
  componentName,
  componentData,
  onComponentClick
}) => {
  const meshRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.scale.setScalar(hovered ? 1.05 : 1);
    }
  });

  useEffect(() => {
    document.body.style.cursor = hovered ? 'pointer' : 'auto';
    return () => {
      document.body.style.cursor = 'auto';
    };
  }, [hovered]);

  return (
    <group
      ref={meshRef}
      position={position}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      onClick={() => onComponentClick(componentName, componentData, position)}
    >
      {children}
      {hovered && (
        <Html position={[0, 1, 0]} center>
          <div className="bg-slate-800 text-white px-2 py-1 rounded text-xs border border-slate-600 pointer-events-none">
            Click to inspect {componentName}
          </div>
        </Html>
      )}
    </group>
  );
};

// Realistic Helicopter Fuselage
const HelicopterFuselage: React.FC<{ status: string; flightPhase: string }> = ({ status, flightPhase }) => {
  const fuselageRef = useRef<THREE.Group>(null);
  
  useFrame(({ clock }) => {
    if (!fuselageRef.current) return;
    
    if (flightPhase === 'takeoff') {
      fuselageRef.current.rotation.x = Math.sin(clock.getElapsedTime() * 2) * 0.02;
    } else if (flightPhase === 'landing') {
      fuselageRef.current.rotation.x = -Math.sin(clock.getElapsedTime() * 1.5) * 0.015;
    } else if (status === 'error') {
      fuselageRef.current.rotation.z = Math.sin(clock.getElapsedTime() * 8) * 0.01;
    } else {
      fuselageRef.current.rotation.x = 0;
      fuselageRef.current.rotation.z = 0;
    }
  });

  return (
    <group ref={fuselageRef} position={[0, 0, 0]}>
      {/* Main fuselage body */}
      <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <capsuleGeometry args={[1.2, 5.5, 8, 16]} />
        <meshStandardMaterial 
          color="#1e3a8a" 
          metalness={0.4} 
          roughness={0.6}
        />
      </mesh>
      
      {/* Cockpit */}
      <mesh position={[3.2, 0.3, 0]} rotation={[0, 0, Math.PI / 2]}>
        <capsuleGeometry args={[1.0, 2.2, 8, 16]} />
        <meshStandardMaterial 
          color="#1f2937" 
          transparent 
          opacity={0.9}
          metalness={0.1}
          roughness={0.1}
        />
      </mesh>
      
      {/* Cockpit windows */}
      <mesh position={[3.8, 0.5, 0]} rotation={[0, 0, Math.PI / 2]}>
        <capsuleGeometry args={[0.8, 1.5, 6, 12]} />
        <meshStandardMaterial 
          color="#87ceeb" 
          transparent 
          opacity={0.3}
          metalness={0.0}
          roughness={0.0}
        />
      </mesh>
      
      {/* Side windows */}
      <mesh position={[1.5, 0.8, 1.0]} rotation={[0, 0, 0]}>
        <boxGeometry args={[2.0, 0.8, 0.05]} />
        <meshStandardMaterial 
          color="#87ceeb" 
          transparent 
          opacity={0.3}
        />
      </mesh>
      <mesh position={[1.5, 0.8, -1.0]} rotation={[0, 0, 0]}>
        <boxGeometry args={[2.0, 0.8, 0.05]} />
        <meshStandardMaterial 
          color="#87ceeb" 
          transparent 
          opacity={0.3}
        />
      </mesh>
      
      {/* Tail boom */}
      <mesh position={[-4.5, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.4, 0.6, 4.0, 12]} />
        <meshStandardMaterial 
          color="#1e3a8a" 
          metalness={0.4} 
          roughness={0.6}
        />
      </mesh>
      
      {/* Tail fin */}
      <mesh position={[-6.5, 0.8, 0]} rotation={[0, 0, 0]}>
        <boxGeometry args={[0.8, 1.6, 0.1]} />
        <meshStandardMaterial 
          color="#1e3a8a" 
          metalness={0.4} 
          roughness={0.6}
        />
      </mesh>
      
      {/* Landing skids */}
      <group position={[0, -1.5, 0]}>
        <mesh position={[1.0, 0, -1.2]}>
          <boxGeometry args={[4.0, 0.15, 0.3]} />
          <meshStandardMaterial color="#374151" metalness={0.9} roughness={0.1} />
        </mesh>
        <mesh position={[1.0, 0, 1.2]}>
          <boxGeometry args={[4.0, 0.15, 0.3]} />
          <meshStandardMaterial color="#374151" metalness={0.9} roughness={0.1} />
        </mesh>
        
        {/* Skid supports */}
        {[-0.5, 0.5, 1.5, 2.5].map((x, i) => (
          <React.Fragment key={i}>
            <mesh position={[x, 0.4, -1.2]} rotation={[0, 0, Math.PI / 6]}>
              <cylinderGeometry args={[0.05, 0.05, 0.8, 8]} />
              <meshStandardMaterial color="#374151" metalness={0.8} roughness={0.2} />
            </mesh>
            <mesh position={[x, 0.4, 1.2]} rotation={[0, 0, -Math.PI / 6]}>
              <cylinderGeometry args={[0.05, 0.05, 0.8, 8]} />
              <meshStandardMaterial color="#374151" metalness={0.8} roughness={0.2} />
            </mesh>
          </React.Fragment>
        ))}
      </group>
      
      {/* Engine exhaust */}
      <mesh position={[1.5, 1.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.3, 0.4, 0.8, 12]} />
        <meshStandardMaterial 
          color="#1a1a1a" 
          metalness={0.9} 
          roughness={0.1}
          emissive="#ff4500"
          emissiveIntensity={flightPhase === 'cruise' ? 0.3 : 0.1}
        />
      </mesh>
      
      {/* Navigation lights */}
      <mesh position={[4, 0.5, 0.8]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial 
          color="#00ff00" 
          emissive="#00ff00"
          emissiveIntensity={0.5}
        />
      </mesh>
      <mesh position={[4, 0.5, -0.8]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial 
          color="#ff0000" 
          emissive="#ff0000"
          emissiveIntensity={0.5}
        />
      </mesh>
    </group>
  );
};

// Main Rotor with realistic animation
const MainRotor: React.FC<{ rpm: number; flightPhase: string }> = ({ rpm, flightPhase }) => {
  const rotorRef = useRef<THREE.Group>(null);
  const bladeRefs = useRef<THREE.Mesh[]>([]);
  
  useFrame(({ clock }) => {
    if (!rotorRef.current) return;
    
    let rotationSpeed = (rpm / 6000) * 0.8;
    
    if (flightPhase === 'takeoff') rotationSpeed *= 1.2;
    if (flightPhase === 'landing') rotationSpeed *= 0.8;
    
    rotorRef.current.rotation.y += rotationSpeed;
    
    bladeRefs.current.forEach((blade, index) => {
      if (blade) {
        const flex = Math.sin(clock.getElapsedTime() * 10 + index * Math.PI) * rotationSpeed * 0.03;
        blade.rotation.z = flex;
        
        if (flightPhase === 'takeoff') {
          blade.rotation.x = 0.1;
        } else if (flightPhase === 'landing') {
          blade.rotation.x = -0.05;
        } else {
          blade.rotation.x = 0;
        }
      }
    });
  });

  return (
    <group ref={rotorRef} position={[0, 2.5, 0]}>
      {/* Rotor mast */}
      <mesh position={[0, -0.5, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 1.0, 12]} />
        <meshStandardMaterial color="#2d3748" metalness={0.9} roughness={0.1} />
      </mesh>
      
      {/* Rotor hub */}
      <mesh>
        <cylinderGeometry args={[0.4, 0.4, 0.6, 12]} />
        <meshStandardMaterial color="#1f2937" metalness={0.8} roughness={0.2} />
      </mesh>
      
      {/* Main rotor blades */}
      {[0, 1, 2, 3].map((i) => (
        <mesh 
          key={i} 
          ref={(el) => { if (el) bladeRefs.current[i] = el; }}
          position={[0, 0, 0]} 
          rotation={[0, i * Math.PI / 2, 0]}
        >
          <mesh position={[4.0, 0, 0]}>
            <boxGeometry args={[6.0, 0.08, 0.35]} />
            <meshStandardMaterial color="#0f172a" metalness={0.6} roughness={0.4} />
          </mesh>
        </mesh>
      ))}
      
      {rpm > 3000 && (
        <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[6, 7.5, 32]} />
          <meshStandardMaterial 
            color="#60a5fa" 
            transparent 
            opacity={0.1}
          />
        </mesh>
      )}
    </group>
  );
};

// Tail Rotor
const TailRotor: React.FC<{ rpm: number; flightPhase: string }> = ({ rpm, flightPhase }) => {
  const tailRotorRef = useRef<THREE.Group>(null);
  
  useFrame(() => {
    if (!tailRotorRef.current) return;
    
    let speed = (rpm / 6000) * 1.2;
    if (flightPhase === 'takeoff') speed *= 1.3;
    
    tailRotorRef.current.rotation.x += speed;
  });

  return (
    <group ref={tailRotorRef} position={[-6.8, 1.2, 0]}>
      <mesh>
        <cylinderGeometry args={[0.2, 0.2, 0.3, 8]} />
        <meshStandardMaterial color="#1f2937" metalness={0.8} roughness={0.2} />
      </mesh>
      
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <mesh key={i} position={[0, 0, 0]} rotation={[i * Math.PI / 3, 0, 0]}>
          <boxGeometry args={[0.08, 2.0, 0.12]} />
          <meshStandardMaterial color="#0f172a" metalness={0.6} roughness={0.3} />
        </mesh>
      ))}
      
      <mesh>
        <torusGeometry args={[1.2, 0.03, 8, 24]} />
        <meshStandardMaterial color="#374151" metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  );
};

// Enhanced Fuel Tank (3 tanks as per backend)
const FuelTank: React.FC<{ 
  position: [number, number, number]; 
  status: string; 
  fuelLevel: number;
  tankNumber: number;
  componentData: any;
  onComponentClick: (name: string, data: any, position: [number, number, number]) => void;
}> = ({ position, status, fuelLevel, tankNumber, componentData, onComponentClick }) => {
  const tankRef = useRef<THREE.Group>(null);
  
  const getStatusColor = () => {
    switch (status) {
      case 'error': return '#ef4444';
      case 'warning': return '#f59e0b';
      default: return '#1e40af';
    }
  };

  useFrame(({ clock }) => {
    if (!tankRef.current) return;
    
    if (status === 'error') {
      const scale = 1 + Math.sin(clock.getElapsedTime() * 6) * 0.03;
      tankRef.current.scale.setScalar(scale);
    } else {
      tankRef.current.scale.setScalar(1);
    }
  });

  return (
    <InteractiveComponent
      position={position}
      componentName={`Fuel Tank ${tankNumber}`}
      componentData={componentData}
      onComponentClick={onComponentClick}
    >
      <group ref={tankRef}>
        <mesh>
          <cylinderGeometry args={[0.6, 0.6, 1.5, 16]} />
          <meshStandardMaterial 
            color={getStatusColor()} 
            metalness={0.8} 
            roughness={0.2}
            transparent
            opacity={0.9}
          />
        </mesh>
        
        <mesh position={[0, 0.75, 0]}>
          <sphereGeometry args={[0.6, 16, 8]} />
          <meshStandardMaterial 
            color={getStatusColor()} 
            metalness={0.8} 
            roughness={0.2}
          />
        </mesh>
        <mesh position={[0, -0.75, 0]}>
          <sphereGeometry args={[0.6, 16, 8]} />
          <meshStandardMaterial 
            color={getStatusColor()} 
            metalness={0.8} 
            roughness={0.2}
          />
        </mesh>
        
        {/* Fuel level indicator */}
        <mesh position={[0, -0.75 + (fuelLevel * 1.5), 0]}>
          <cylinderGeometry args={[0.55, 0.55, fuelLevel * 1.5, 16]} />
          <meshStandardMaterial 
            color="#3b82f6" 
            transparent 
            opacity={0.7}
            emissive="#1e40af"
            emissiveIntensity={0.1}
          />
        </mesh>
        
        <Text
          position={[0, -1.2, 0]}
          fontSize={0.15}
          color="white"
          anchorX="center"
          anchorY="middle"
        >
          TANK {tankNumber}
        </Text>
      </group>
    </InteractiveComponent>
  );
};

// Enhanced Fuel Pump
const FuelPump: React.FC<{ 
  position: [number, number, number]; 
  status: string; 
  pressure: number;
  componentData: any;
  onComponentClick: (name: string, data: any, position: [number, number, number]) => void;
}> = ({ position, status, pressure, componentData, onComponentClick }) => {
  const pumpRef = useRef<THREE.Group>(null);
  const impellerRef = useRef<THREE.Mesh>(null);
  
  const getStatusColor = () => {
    switch (status) {
      case 'error': return '#ef4444';
      case 'warning': return '#f59e0b';
      default: return '#10b981';
    }
  };

  useFrame(({ clock }) => {
    if (!pumpRef.current) return;
    
    const vibration = (pressure / 8) * 0.015;
    pumpRef.current.position.y = position[1] + Math.sin(clock.getElapsedTime() * 12) * vibration;
    
    if (impellerRef.current) {
      impellerRef.current.rotation.z += (pressure / 8) * 0.3;
    }
  });

  return (
    <InteractiveComponent
      position={position}
      componentName="Fuel Pump"
      componentData={componentData}
      onComponentClick={onComponentClick}
    >
      <group ref={pumpRef}>
        <mesh>
          <cylinderGeometry args={[0.5, 0.5, 0.8, 12]} />
          <meshStandardMaterial 
            color={getStatusColor()} 
            metalness={0.8} 
            roughness={0.2}
          />
        </mesh>
        
        <mesh position={[0, 0.6, 0]}>
          <cylinderGeometry args={[0.25, 0.25, 0.4, 12]} />
          <meshStandardMaterial color="#1f2937" metalness={0.9} roughness={0.1} />
        </mesh>
        
        <mesh ref={impellerRef} position={[0, 0, 0]}>
          <cylinderGeometry args={[0.3, 0.3, 0.1, 6]} />
          <meshStandardMaterial 
            color="#60a5fa" 
            metalness={0.9} 
            roughness={0.1}
            transparent
            opacity={0.8}
          />
        </mesh>
        
        <Text
          position={[0, -0.6, 0]}
          fontSize={0.12}
          color="white"
          anchorX="center"
          anchorY="middle"
        >
          PUMP
        </Text>
      </group>
    </InteractiveComponent>
  );
};

// Enhanced Fuel Injector
const FuelInjector: React.FC<{ 
  position: [number, number, number]; 
  status: string; 
  flowRate: number;
  componentData: any;
  onComponentClick: (name: string, data: any, position: [number, number, number]) => void;
}> = ({ position, status, flowRate, componentData, onComponentClick }) => {
  const injectorRef = useRef<THREE.Group>(null);
  const sprayRef = useRef<THREE.Points>(null);
  
  const getStatusColor = () => {
    switch (status) {
      case 'error': return '#ef4444';
      case 'warning': return '#f59e0b';
      default: return '#f59e0b';
    }
  };

  const sprayParticles = useMemo(() => {
    const count = 30;
    const positions = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const radius = Math.random() * 0.2;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = -Math.random() * 0.8;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
    }
    
    return positions;
  }, []);

  useFrame(({ clock }) => {
    if (!sprayRef.current) return;
    
    const time = clock.getElapsedTime();
    const positions = sprayRef.current.geometry.attributes.position.array as Float32Array;
    
    for (let i = 0; i < positions.length; i += 3) {
      const particleIndex = i / 3;
      const angle = (particleIndex / 30) * Math.PI * 2;
      const radius = Math.random() * 0.2;
      
      positions[i] = Math.cos(angle + time) * radius;
      positions[i + 1] = -((time * flowRate + particleIndex * 0.1) % 1) * 0.8;
      positions[i + 2] = Math.sin(angle + time) * radius;
    }
    
    sprayRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <InteractiveComponent
      position={position}
      componentName="Fuel Injector"
      componentData={componentData}
      onComponentClick={onComponentClick}
    >
      <group ref={injectorRef}>
        <mesh>
          <cylinderGeometry args={[0.15, 0.1, 0.8, 12]} />
          <meshStandardMaterial 
            color={getStatusColor()} 
            metalness={0.8} 
            roughness={0.2}
          />
        </mesh>
        
        <mesh position={[0, -0.5, 0]}>
          <coneGeometry args={[0.08, 0.3, 12]} />
          <meshStandardMaterial color="#1f2937" metalness={0.9} roughness={0.1} />
        </mesh>
        
        {flowRate > 0 && (
          <points ref={sprayRef} position={[0, -0.7, 0]}>
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
        
        <Text
          position={[0, -1.0, 0]}
          fontSize={0.12}
          color="white"
          anchorX="center"
          anchorY="middle"
        >
          INJECTOR
        </Text>
      </group>
    </InteractiveComponent>
  );
};

// Enhanced Engine
const Engine: React.FC<{ 
  position: [number, number, number]; 
  status: string; 
  rpm: number;
  flightPhase: string;
  componentData: any;
  onComponentClick: (name: string, data: any, position: [number, number, number]) => void;
}> = ({ position, status, rpm, flightPhase, componentData, onComponentClick }) => {
  const engineRef = useRef<THREE.Group>(null);
  const turbineRef = useRef<THREE.Mesh>(null);
  
  const getStatusColor = () => {
    switch (status) {
      case 'error': return '#ef4444';
      case 'warning': return '#f59e0b';
      default: return '#dc2626';
    }
  };

  useFrame(({ clock }) => {
    if (!engineRef.current) return;
    
    const vibration = (rpm / 6000) * 0.02;
    engineRef.current.rotation.z = Math.sin(clock.getElapsedTime() * 20) * vibration;
    
    if (turbineRef.current) {
      turbineRef.current.rotation.z += (rpm / 6000) * 0.5;
    }
  });

  const getEmissiveIntensity = () => {
    if (flightPhase === 'takeoff') return 0.4;
    if (flightPhase === 'cruise') return 0.3;
    if (rpm > 2000) return 0.2;
    return 0.05;
  };

  return (
    <InteractiveComponent
      position={position}
      componentName="Turbine Engine"
      componentData={componentData}
      onComponentClick={onComponentClick}
    >
      <group ref={engineRef}>
        <mesh>
          <cylinderGeometry args={[0.6, 0.6, 1.2, 16]} />
          <meshStandardMaterial 
            color={getStatusColor()} 
            metalness={0.7} 
            roughness={0.3}
          />
        </mesh>
        
        <mesh position={[0, 0.3, 0]}>
          <cylinderGeometry args={[0.4, 0.5, 0.6, 16]} />
          <meshStandardMaterial color="#1f2937" metalness={0.8} roughness={0.2} />
        </mesh>
        
        <mesh ref={turbineRef} position={[0, 0, 0]}>
          <cylinderGeometry args={[0.3, 0.3, 0.15, 12]} />
          <meshStandardMaterial 
            color="#60a5fa" 
            metalness={0.9} 
            roughness={0.1}
            transparent
            opacity={0.8}
          />
        </mesh>
        
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <mesh key={i} position={[0, 0, 0]} rotation={[0, i * Math.PI / 3, 0]}>
            <boxGeometry args={[0.4, 0.03, 0.08]} />
            <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.2} />
          </mesh>
        ))}
        
        <mesh position={[0, -0.8, 0]}>
          <cylinderGeometry args={[0.3, 0.4, 0.4, 12]} />
          <meshStandardMaterial 
            color="#1a1a1a" 
            metalness={0.9} 
            roughness={0.1}
            emissive="#ff4500"
            emissiveIntensity={getEmissiveIntensity()}
          />
        </mesh>
        
        <Text
          position={[0, -0.8, 0]}
          fontSize={0.12}
          color="white"
          anchorX="center"
          anchorY="middle"
        >
          ENGINE
        </Text>
      </group>
    </InteractiveComponent>
  );
};

// Component Detail Panel
const ComponentDetailPanel: React.FC<{
  selectedComponent: {
    name: string;
    data: any;
    position: [number, number, number];
  } | null;
  onClose: () => void;
}> = ({ selectedComponent, onClose }) => {
  if (!selectedComponent) return null;

  return (
    <div className="absolute top-4 right-4 bg-slate-900/95 backdrop-blur-sm rounded-lg p-4 border border-slate-600 min-w-[300px] max-w-[400px]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-white">{selectedComponent.name}</h3>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white transition-colors"
        >
          ✕
        </button>
      </div>
      
      

      <div className="space-y-3 text-sm">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-800/50 p-2 rounded">
            <div className="text-slate-400 text-xs">Status</div>
            <div className={`font-medium ${
              selectedComponent.data.status === 'error' ? 'text-red-400' :
              selectedComponent.data.status === 'warning' ? 'text-yellow-400' :
              'text-green-400'
            }`}>
              {selectedComponent.data.status || 'Normal'}
            </div>
          </div>
          
          <div className="bg-slate-800/50 p-2 rounded">
            <div className="text-slate-400 text-xs">Health</div>
            <div className="text-white font-medium">
              {selectedComponent.data.health || '98%'}
            </div>
          </div>
        </div>
        
        

        {selectedComponent.name.includes('Fuel Tank') && (
          <div className="space-y-2">
            <div className="bg-slate-800/50 p-2 rounded">
              <div className="text-slate-400 text-xs">Fuel Level</div>
              <div className="text-blue-400 font-medium">{Math.round(selectedComponent.data.fuelLevel * 100)}%</div>
            </div>
            <div className="bg-slate-800/50 p-2 rounded">
              <div className="text-slate-400 text-xs">Capacity</div>
              <div className="text-white font-medium">200L</div>
            </div>
          </div>
        )}
        
        {selectedComponent.name === 'Fuel Pump' && (
          <div className="space-y-2">
            <div className="bg-slate-800/50 p-2 rounded">
              <div className="text-slate-400 text-xs">Pressure</div>
              <div className="text-white font-medium">{selectedComponent.data.pressure?.toFixed(1) || '0.0'} Bar</div>
            </div>
            <div className="bg-slate-800/50 p-2 rounded">
              <div className="text-slate-400 text-xs">Flow Rate</div>
              <div className="text-white font-medium">{selectedComponent.data.flowRate?.toFixed(1) || '0.0'} L/min</div>
            </div>
          </div>
        )}
        
        {selectedComponent.name === 'Turbine Engine' && (
          <div className="space-y-2">
            <div className="bg-slate-800/50 p-2 rounded">
              <div className="text-slate-400 text-xs">RPM</div>
              <div className="text-white font-medium">{selectedComponent.data.rpm?.toLocaleString() || '0'}</div>
            </div>
            <div className="bg-slate-800/50 p-2 rounded">
              <div className="text-slate-400 text-xs">Temperature</div>
              <div className="text-white font-medium">{selectedComponent.data.temperature?.toFixed(1) || '0.0'}°C</div>
            </div>
          </div>
        )}
        
        <div className="bg-slate-800/50 p-2 rounded">
          <div className="text-slate-400 text-xs">Last Maintenance</div>
          <div className="text-white font-medium">2024-01-15</div>
        </div>
      </div>
    </div>
  );
};

interface FuelSystem3DProps {
  data: TelemetryData | null;
}



const FuelSystem3D: React.FC<FuelSystem3DProps> = ({ data }) => {
  const [selectedComponent, setSelectedComponent] = useState<{
    name: string;
    data: any;
    position: [number, number, number];
  } | null>(null);
  
  const [flightPhase, setFlightPhase] = useState<'idle' | 'startup' | 'takeoff' | 'cruise' | 'landing'>('idle');
  const [internalView, setInternalView] = useState<{
    component: string;
    anomalyType: string;
  } | null>(null);

  useEffect(() => {
    if (!data) {
      setFlightPhase('idle');
      return;
    }

    if (data.rpm < 1000) setFlightPhase('idle');
    else if (data.rpm < 2000) setFlightPhase('startup');
    else if (data.rpm < 3500) setFlightPhase('takeoff');
    else if (data.rpm < 4500) setFlightPhase('cruise');
    else setFlightPhase('landing');
  }, [data?.rpm]);

  const getComponentStatus = (value: number, min: number, max: number) => {
    const percentage = (value - min) / (max - min);
    if (percentage > 0.8) return 'error';
    if (percentage > 0.6) return 'warning';
    return 'normal';
  };

  const handleComponentClick = (name: string, componentData: any, position: [number, number, number]) => {
    setSelectedComponent({ name, data: componentData, position });
  };

  const handleAnomalyClick = (component: string, anomalyType: string) => {
    setInternalView({ component, anomalyType });
  };

  const getAnomalies = () => {
    const anomalies = [];
    
    if (data) {
      // Fuel temperature anomaly
      if (data.fuel_temp > 80) {
        anomalies.push({
          component: 'fuel_tank',
          type: 'high_temperature',
          severity: data.fuel_temp > 100 ? 'critical' : data.fuel_temp > 90 ? 'high' : 'medium',
          position: [-5, 0.5, 0] as [number, number, number]
        });
      }
      
      // Fuel pressure anomaly
      if (data.fuel_pressure > 6 || data.fuel_pressure < 2) {
        anomalies.push({
          component: 'fuel_pump',
          type: data.fuel_pressure > 6 ? 'high_pressure' : 'low_pressure',
          severity: data.fuel_pressure > 7 || data.fuel_pressure < 1.5 ? 'critical' : 'high',
          position: [-2, 0.5, 0] as [number, number, number]
        });
      }
      
      // RPM anomaly
      if (data.rpm > 5000) {
        anomalies.push({
          component: 'engine',
          type: 'rpm_surge',
          severity: data.rpm > 5500 ? 'critical' : 'high',
          position: [5, 0.5, 0] as [number, number, number]
        });
      }
      
      // Flow rate anomaly (throttle spike)
      if (data.flow_rate > 12) {
        anomalies.push({
          component: 'fuel_injector',
          type: 'throttle_spike',
          severity: data.flow_rate > 14 ? 'critical' : 'high',
          position: [2, 0.5, 0] as [number, number, number]
        });
      }
    }
    
    return anomalies;
  };

  const anomalies = getAnomalies();

  // Three fuel tanks as per backend specification
  const fuelLevels = [0.85, 0.78, 0.92]; // Different levels for each tank

  const flows = [
    // Tank 1 to pump
    {
      start: [-4.5, -0.5, 0] as [number, number, number],
      end: [-2.5, -0.5, 0] as [number, number, number],
      flowRate: data?.flow_rate || 0,
      isActive: !!data && data.flow_rate > 0,
      flowColor: "#60a5fa"
    },
    // Tank 2 to pump
    {
      start: [-4.5, -0.5, 2] as [number, number, number],
      end: [-2.5, -0.5, 0] as [number, number, number],
      flowRate: data?.flow_rate || 0,
      isActive: !!data && data.flow_rate > 0,
      flowColor: "#3b82f6"
    },
    // Tank 3 to pump
    {
      start: [-4.5, -0.5, -2] as [number, number, number],
      end: [-2.5, -0.5, 0] as [number, number, number],
      flowRate: data?.flow_rate || 0,
      isActive: !!data && data.flow_rate > 0,
      flowColor: "#1e40af"
    },
    // Pump to injector
    {
      start: [-1.5, -0.5, 0] as [number, number, number],
      end: [1.5, -0.5, 0] as [number, number, number],
      flowRate: data?.flow_rate || 0,
      isActive: !!data && data.flow_rate > 0,
      flowColor: "#10b981"
    },
    // Injector to engine
    {
      start: [2.5, -0.5, 0] as [number, number, number],
      end: [4.5, -0.5, 0] as [number, number, number],
      flowRate: data?.flow_rate || 0,
      isActive: !!data && data.flow_rate > 0,
      flowColor: "#f59e0b"
    }
  ];

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 h-[700px] relative">
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-white">Realistic Helicopter Fuel System - 3D Digital Twin</h3>
            <p className="text-slate-400 text-sm">Interactive 3D model with 3 fuel tanks • Click components to inspect • Flight Phase: {flightPhase.toUpperCase()}</p>
          </div>
          
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${
              flightPhase === 'idle' ? 'bg-gray-400' :
              flightPhase === 'startup' ? 'bg-yellow-400' :
              flightPhase === 'takeoff' ? 'bg-orange-400' :
              flightPhase === 'cruise' ? 'bg-green-400' :
              'bg-blue-400'
            }`} />
            <span className="text-sm text-slate-300 capitalize">{flightPhase}</span>
          </div>
        </div>
      </div>
      
      <div className="h-[650px]">
        <Canvas camera={{ position: [12, 6, 12], fov: 45 }}>
          <ambientLight intensity={0.4} />
          <directionalLight position={[15, 15, 10]} intensity={1.0} castShadow />
          <pointLight position={[-8, 8, 8]} intensity={0.6} color="#60a5fa" />
          <pointLight position={[8, 8, -8]} intensity={0.4} color="#f59e0b" />
          <spotLight 
            position={[0, 20, 0]} 
            intensity={0.8} 
            angle={0.4} 
            penumbra={0.3} 
            castShadow
          />
          
          {/* Complete Helicopter Structure */}
          <HelicopterFuselage status={data?.anomaly ? 'error' : 'normal'} flightPhase={flightPhase} />
          <MainRotor rpm={data?.rpm || 0} flightPhase={flightPhase} />
          <TailRotor rpm={data?.rpm || 0} flightPhase={flightPhase} />
          
          {/* Three Fuel Tanks */}
          <FuelTank 
            position={[-5, -0.5, 0]} 
            status="normal" 
            fuelLevel={fuelLevels[0]}
            tankNumber={1}
            componentData={{ 
              status: 'normal', 
              health: '98%', 
              fuelLevel: fuelLevels[0],
              capacity: '200L'
            }}
            onComponentClick={handleComponentClick}
          />
          
          <FuelTank 
            position={[-5, -0.5, 2]} 
            status="normal" 
            fuelLevel={fuelLevels[1]}
            tankNumber={2}
            componentData={{ 
              status: 'normal', 
              health: '96%', 
              fuelLevel: fuelLevels[1],
              capacity: '200L'
            }}
            onComponentClick={handleComponentClick}
          />
          
          <FuelTank 
            position={[-5, -0.5, -2]} 
            status="normal" 
            fuelLevel={fuelLevels[2]}
            tankNumber={3}
            componentData={{ 
              status: 'normal', 
              health: '99%', 
              fuelLevel: fuelLevels[2],
              capacity: '200L'
            }}
            onComponentClick={handleComponentClick}
          />
          
          <FuelPump 
            position={[-2, -0.5, 0]} 
            status={data ? getComponentStatus(data.fuel_pressure, 0, 8) : 'normal'}
            pressure={data?.fuel_pressure || 0}
            componentData={{ 
              status: data ? getComponentStatus(data.fuel_pressure, 0, 8) : 'normal',
              health: '95%',
              pressure: data?.fuel_pressure || 0,
              flowRate: data?.flow_rate || 0
            }}
            onComponentClick={handleComponentClick}
          />
          
          <FuelInjector 
            position={[2, -0.5, 0]} 
            status={data ? getComponentStatus(data.flow_rate, 0, 15) : 'normal'}
            flowRate={data?.flow_rate || 0}
            componentData={{ 
              status: data ? getComponentStatus(data.flow_rate, 0, 15) : 'normal',
              health: '97%',
              flowRate: data?.flow_rate || 0
            }}
            onComponentClick={handleComponentClick}
          />
          
          <Engine 
            position={[5, -0.5, 0]} 
            status={data ? getComponentStatus(data.rpm, 0, 6000) : 'normal'}
            rpm={data?.rpm || 0}
            flightPhase={flightPhase}
            componentData={{ 
              status: data ? getComponentStatus(data.rpm, 0, 6000) : 'normal',
              health: '92%',
              rpm: data?.rpm || 0,
              temperature: data?.fuel_temp || 0
            }}
            onComponentClick={handleComponentClick}
          />
          
          {/* Enhanced Fuel Flow Pipes */}
          {flows.map((flow, index) => (
            <AnimatedFlow key={index} {...flow} />
          ))}
          
          {/* Anomaly indicators */}
          {anomalies.map((anomaly, index) => (
            <AnomalyIndicator
              key={index}
              position={anomaly.position}
              anomalyType={anomaly.type}
              severity={anomaly.severity as 'low' | 'medium' | 'high' | 'critical'}
              onClick={() => handleAnomalyClick(anomaly.component, anomaly.type)}
            />
          ))}
          
          {/* Ground with helicopter pad */}
          <mesh position={[0, -4, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[30, 30]} />
            <meshStandardMaterial color="#1a202c" transparent opacity={0.8} />
          </mesh>
          
          {/* Helicopter pad circle */}
          <mesh position={[0, -3.9, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[8, 8.2, 32]} />
            <meshStandardMaterial color="#f59e0b" />
          </mesh>
          
          {/* Landing pad "H" marking */}
          <Text
            position={[0, -3.8, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            fontSize={3}
            color="#f59e0b"
            anchorX="center"
            anchorY="middle"
          >
            H
          </Text>
          
          <OrbitControls 
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            autoRotate={false}
            maxPolarAngle={Math.PI / 2.2}
            minDistance={8}
            maxDistance={25}
            target={[0, 0, 0]}
          />
        </Canvas>
      </div>
      
      {/* Component Detail Panel */}
      <ComponentDetailPanel
        selectedComponent={selectedComponent}
        onClose={() => setSelectedComponent(null)}
      />
      
     
      {/* Enhanced Status Panel */}
      <div className="absolute bottom-4 left-4 bg-slate-900/95 backdrop-blur-sm rounded-lg p-4 border border-slate-600 min-w-[280px]">
        <div className="text-sm font-semibold text-slate-300 mb-3">System Status</div>
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Flight Phase:</span>
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${
                flightPhase === 'idle' ? 'bg-gray-400' :
                flightPhase === 'startup' ? 'bg-yellow-400' :
                flightPhase === 'takeoff' ? 'bg-orange-400' :
                flightPhase === 'cruise' ? 'bg-green-400' :
                'bg-blue-400'
              }`} />
              <span className="text-white capitalize">{flightPhase}</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Overall Status:</span>
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${data?.anomaly ? 'bg-red-400' : 'bg-green-400'}`} />
              <span className="text-white">{data?.anomaly ? 'Anomaly' : 'Normal'}</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Tank 1 Level:</span>
            <span className="text-blue-400">{Math.round(fuelLevels[0] * 100)}%</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Tank 2 Level:</span>
            <span className="text-blue-400">{Math.round(fuelLevels[1] * 100)}%</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Tank 3 Level:</span>
            <span className="text-blue-400">{Math.round(fuelLevels[2] * 100)}%</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Engine RPM:</span>
            <span className="text-white">{data?.rpm?.toLocaleString() || '0'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Fuel Pressure:</span>
            <span className="text-white">{data?.fuel_pressure?.toFixed(1) || '0.0'} Bar</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Flow Rate:</span>
            <span className="text-white">{data?.flow_rate?.toFixed(1) || '0.0'} L/min</span>
          </div>
        </div>
      </div>
      
      {/* Camera Controls Info */}
      <div className="absolute bottom-4 right-4 bg-slate-900/95 backdrop-blur-sm rounded-lg p-3 border border-slate-600">
        <div className="text-xs text-slate-400 space-y-1">
          <div>🖱️ Left Click + Drag: Rotate</div>
          <div>🖱️ Right Click + Drag: Pan</div>
          <div>🖱️ Scroll: Zoom</div>
          <div>🖱️ Click Components: Inspect</div>
        </div>
      </div>
    </div>
  );
};


export default FuelSystem3D;