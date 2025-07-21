import React, { useState, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Html } from '@react-three/drei';
import * as THREE from 'three';
import { Line } from 'react-chartjs-2';
import { TelemetryData } from '../../services/api';
import { Thermometer, Droplets, AlertTriangle, TrendingUp, Gauge, Plane, Settings, Eye } from 'lucide-react';


interface TankData {
  id: string;
  name: string;
  type: 'primary' | 'auxiliary' | 'reserve';
  capacity: number;
  currentLevel: number;
  temperature: number;
  position: [number, number, number];
  isActive: boolean;
  sensorDepth: number;
  vaporPressure: number;
  priority: number;
  anomalyDetected: boolean;
  probableCause?: string;
}

interface SimulationState {
  altitude: number;
  ambientTemp: number;
  fuelConsumption: number;
  activeTank: string;
  switchingInProgress: boolean;
  vaporFormation: boolean;
  temperatureGradient: number[];
  tempThreshold: number;
  lowFuelThreshold: number;
  running: boolean;
  time: number;
  
  backendThresholds: {
    tempThreshold: number;
    pressureThreshold: number;
    rpmThreshold: number;
    flowThreshold: number;
    lowPressureThreshold: number;
    lowFlowThreshold: number;
    criticalTempHigh: number;
    criticalTempLow: number;
  };
  stats: {
    totalFuelUsed: number;
    tankSwitches: number;
    maxTemp: number;
    vaporEvents: number;
  };
  alerts: Array<{
    type: 'info' | 'warning' | 'danger';
    message: string;
    timestamp: string;
  }>;
  faultInjection: {
    active: boolean;
    type: string;
  };
}

// Temperature Sensor Component
const TemperatureSensor: React.FC<{
  position: [number, number, number];
  temperature: number;
  isSubmerged: boolean;
  tankType: string;
}> = ({ position, temperature, isSubmerged, tankType }) => {
  const sensorRef = useRef<THREE.Group>(null);
  
  useFrame(({ clock }) => {
    if (!sensorRef.current) return;
    
    // Sensor glow effect based on temperature
    const intensity = Math.max(0.1, Math.min(1.0, temperature / 100));
    sensorRef.current.children.forEach((child) => {
      if (child instanceof THREE.Mesh) {
        const material = child.material as THREE.MeshStandardMaterial;
        material.emissiveIntensity = intensity * 0.5;
      }
    });
  });

  const getSensorColor = () => {
    if (temperature > 80) return '#ef4444'; // Red - Critical
    if (temperature > 60) return '#f59e0b'; // Orange - Warning
    if (temperature > 40) return '#eab308'; // Yellow - Caution
    return '#10b981'; // Green - Normal
  };

  return (
    <group ref={sensorRef} position={position}>
      {/* Sensor probe */}
      <mesh>
        <cylinderGeometry args={[0.02, 0.02, 0.3, 8]} />
        <meshStandardMaterial 
          color="#374151" 
          metalness={0.9} 
          roughness={0.1}
        />
      </mesh>
      
      {/* Sensor tip */}
      <mesh position={[0, -0.15, 0]}>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshStandardMaterial 
          color={getSensorColor()}
          emissive={getSensorColor()}
          emissiveIntensity={0.3}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>
      
      {/* Sensor cable */}
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.01, 0.01, 0.1, 6]} />
        <meshStandardMaterial color="#1f2937" />
      </mesh>
      
      {isSubmerged && (
        <Html position={[0, 0.3, 0]} center>
          <div className="bg-slate-800/90 text-white px-2 py-1 rounded text-xs border border-slate-600 pointer-events-none">
            {tankType}: {temperature.toFixed(1)}°C
          </div>
        </Html>
      )}
    </group>
  );
};

// Fuel Particles with Temperature Effects
const FuelParticles: React.FC<{
  tankLevel: number;
  temperature: number;
  vaporFormation: boolean;
  tankSize: [number, number, number];
}> = ({ tankLevel, temperature, vaporFormation, tankSize }) => {
  const particlesRef = useRef<THREE.Points>(null);
  const vaporRef = useRef<THREE.Points>(null);
  
  const fuelParticles = React.useMemo(() => {
    const count = Math.floor(tankLevel * 1000);
    const positions = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * tankSize[0] * 0.8;
      positions[i * 3 + 1] = (Math.random() - 0.5) * tankLevel * tankSize[1];
      positions[i * 3 + 2] = (Math.random() - 0.5) * tankSize[2] * 0.8;
    }
    
    return positions;
  }, [tankLevel, tankSize]);

  const vaporParticles = React.useMemo(() => {
    if (!vaporFormation) return new Float32Array(0);
    
    const count = Math.floor(temperature * 5);
    const positions = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * tankSize[0] * 0.6;
      positions[i * 3 + 1] = tankLevel * tankSize[1] * 0.4 + Math.random() * 0.5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * tankSize[2] * 0.6;
    }
    
    return positions;
  }, [vaporFormation, temperature, tankLevel, tankSize]);

  useFrame(({ clock }) => {
    if (particlesRef.current) {
      const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
      const time = clock.getElapsedTime();
      
      // Animate fuel particles based on temperature
      for (let i = 0; i < positions.length; i += 3) {
        const agitation = temperature > 60 ? 0.02 : 0.005;
        positions[i] += Math.sin(time * 2 + i) * agitation;
        positions[i + 2] += Math.cos(time * 2 + i) * agitation;
      }
      
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
    }
    
    if (vaporRef.current && vaporFormation) {
      const positions = vaporRef.current.geometry.attributes.position.array as Float32Array;
      const time = clock.getElapsedTime();
      
      // Animate vapor rising
      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] += 0.01;
        if (positions[i + 1] > tankSize[1] * 0.6) {
          positions[i + 1] = tankLevel * tankSize[1] * 0.4;
        }
      }
      
      vaporRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  const getFuelColor = () => {
    if (temperature > 80) return '#ff6b6b'; // Hot fuel - reddish
    if (temperature > 60) return '#ffa726'; // Warm fuel - orange
    return '#42a5f5'; // Normal fuel - blue
  };

  return (
    <group>
      {/* Fuel particles */}
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            array={fuelParticles}
            count={fuelParticles.length / 3}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.02}
          color={getFuelColor()}
          transparent
          opacity={0.6}
        />
      </points>
      
      {/* Vapor particles */}
      {vaporFormation && (
        <points ref={vaporRef}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              array={vaporParticles}
              count={vaporParticles.length / 3}
              itemSize={3}
            />
          </bufferGeometry>
          <pointsMaterial
            size={0.01}
            color="#ffffff"
            transparent
            opacity={0.3}
          />
        </points>
      )}
    </group>
  );
};

// Individual Fuel Tank Component
const FuelTank: React.FC<{
  tank: TankData;
  simulation: SimulationState;
  onTankClick: (tankId: string) => void;
}> = ({ tank, simulation, onTankClick }) => {
  const tankRef = useRef<THREE.Group>(null);
  const tankSize: [number, number, number] = [1.2, 2.0, 1.2];
  
  useFrame(({ clock }) => {
    if (!tankRef.current) return;
    
    // Tank vibration during switching
    if (simulation.switchingInProgress && tank.isActive) {
      const vibration = Math.sin(clock.getElapsedTime() * 10) * 0.02;
      tankRef.current.position.y = tank.position[1] + vibration;
    } else {
      tankRef.current.position.y = tank.position[1];
    }
  });

  const getTankColor = () => {
    if (tank.isActive) return '#10b981'; // Active - Green
    if (tank.temperature > 80) return '#ef4444'; // Hot - Red
    if (tank.currentLevel < 0.2) return '#f59e0b'; // Low fuel - Orange
    return '#3b82f6'; // Normal - Blue
  };

  const sensorPosition: [number, number, number] = [
    0, 
    -tankSize[1] * 0.3 + (tank.currentLevel * tankSize[1] * 0.6), 
    0
  ];

  const isSubmerged = tank.currentLevel > tank.sensorDepth;

  return (
    <group 
      ref={tankRef} 
      position={tank.position}
      onClick={() => onTankClick(tank.id)}
      onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { document.body.style.cursor = 'auto'; }}
    >
      {/* Tank body */}
      <mesh>
        <cylinderGeometry args={[tankSize[0], tankSize[0], tankSize[1], 16]} />
        <meshStandardMaterial 
          color={getTankColor()}
          transparent 
          opacity={0.3}
          metalness={0.1}
          roughness={0.8}
        />
      </mesh>
      
      {/* Tank walls */}
      <mesh>
        <cylinderGeometry args={[tankSize[0], tankSize[0], tankSize[1], 16]} />
        <meshStandardMaterial 
          color="#374151"
          transparent 
          opacity={0.8}
          metalness={0.8}
          roughness={0.2}
          side={THREE.BackSide}
        />
      </mesh>
      
      {/* Fuel level indicator */}
      <mesh position={[0, -tankSize[1] * 0.4 + (tank.currentLevel * tankSize[1] * 0.8) / 2, 0]}>
        <cylinderGeometry args={[tankSize[0] * 0.95, tankSize[0] * 0.95, tank.currentLevel * tankSize[1] * 0.8, 16]} />
        <meshStandardMaterial 
          color={getTankColor()}
          transparent 
          opacity={0.7}
          emissive={getTankColor()}
          emissiveIntensity={0.1}
        />
      </mesh>
      
      {/* Fuel particles */}
      <FuelParticles 
        tankLevel={tank.currentLevel}
        temperature={tank.temperature}
        vaporFormation={simulation.vaporFormation && tank.temperature > 70}
        tankSize={tankSize}
      />
      
      {/* Temperature sensor */}
      <TemperatureSensor 
        position={sensorPosition}
        temperature={tank.temperature}
        isSubmerged={isSubmerged}
        tankType={tank.type}
      />
      
      {/* Tank label */}
      <Text
        position={[0, tankSize[1] * 0.6, 0]}
        fontSize={0.2}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {tank.name}
      </Text>
      
      {/* Active indicator */}
      {tank.isActive && (
        <mesh position={[0, tankSize[1] * 0.7, 0]}>
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshStandardMaterial 
            color="#10b981"
            emissive="#10b981"
            emissiveIntensity={0.5}
          />
        </mesh>
      )}
      
      {/* Warning indicators */}
      {(tank.temperature > simulation.tempThreshold || tank.currentLevel < simulation.lowFuelThreshold / 100) && (
        <mesh position={[tankSize[0] * 0.8, tankSize[1] * 0.3, 0]}>
          <sphereGeometry args={[0.08, 8, 8]} />
          <meshStandardMaterial 
            color="#ef4444"
            emissive="#ef4444"
            emissiveIntensity={0.8}
          />
        </mesh>
      )}
    </group>
  );
};

// Main Fuel Tank Simulation Component
const FuelTankSimulation: React.FC<{ data: TelemetryData | null }> = ({ data }) => {
  const [tanks, setTanks] = useState<TankData[]>([
    {
      id: 'primary',
      name: 'Primary Tank',
      type: 'primary',
      capacity: 400,
      currentLevel: 0.85,
      temperature: 20,
      position: [-3, 0, 0],
      isActive: true,
      sensorDepth: 0.3,
      vaporPressure: 0,
      priority: 1,
      anomalyDetected: false
    },
    {
      id: 'auxiliary',
      name: 'Auxiliary Tank',
      type: 'auxiliary',
      capacity: 300,
      currentLevel: 0.75,
      temperature: 20,
      position: [0, 0, 0],
      isActive: false,
      sensorDepth: 0.3,
      vaporPressure: 0,
      priority: 2,
      anomalyDetected: false
    },
    {
      id: 'reserve',
      name: 'Reserve Tank',
      type: 'reserve',
      capacity: 150,
      currentLevel: 0.95,
      temperature: 20,
      position: [3, 0, 0],
      isActive: false,
      sensorDepth: 0.3,
      vaporPressure: 0,
      priority: 3,
      anomalyDetected: false
    }
  ]);

  const [simulation, setSimulation] = useState<SimulationState>({
    altitude: 5000,
    ambientTemp: 15,
    fuelConsumption: 12,
    activeTank: 'primary',
    switchingInProgress: false,
    vaporFormation: false,
    temperatureGradient: [20, 20, 20],
    tempThreshold: 56, // Backend threshold - persistent safety measure
    lowFuelThreshold: 15,
    running: false,
    time: 0,
    backendThresholds: {
      tempThreshold: 56, // High temp anomaly threshold - SAFETY CRITICAL
      pressureThreshold: 4, // High pressure threshold - SAFETY CRITICAL
      rpmThreshold: 5000, // RPM surge threshold - SAFETY CRITICAL
      flowThreshold: 8, // High flow threshold - SAFETY CRITICAL
      lowPressureThreshold: 2, // Low pressure threshold - SAFETY CRITICAL
      lowFlowThreshold: 2, // Low flow threshold for clog detection - SAFETY CRITICAL
      criticalTempHigh: 80, // Critical high temperature - EMERGENCY
      criticalTempLow: -20 // Critical low temperature - SENSOR FAILURE
    },
    stats: {
      totalFuelUsed: 0,
      tankSwitches: 0,
      maxTemp: 20,
      vaporEvents: 0
    },
    alerts: [],
    faultInjection: {
      active: false,
      type: ''
    }
  });

  const [selectedTank, setSelectedTank] = useState<string | null>(null);
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [manualMode, setManualMode] = useState(false);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Update simulation with backend data
  useEffect(() => {
    if (data) {
      // Update operational parameters but preserve safety thresholds
      setSimulation(prev => ({
        ...prev,
        fuelConsumption: data.flow_rate,
        // SAFETY CRITICAL: Always maintain backend safety thresholds
        tempThreshold: prev.backendThresholds.tempThreshold,
        // Preserve all safety measures regardless of data changes
        backendThresholds: {
          ...prev.backendThresholds,
          // These thresholds are SAFETY CRITICAL and must not change with data
          tempThreshold: 56,
          pressureThreshold: 4,
          rpmThreshold: 5000,
          flowThreshold: 8,
          lowPressureThreshold: 2,
          lowFlowThreshold: 2,
          criticalTempHigh: 80,
          criticalTempLow: -20
        }
      }));
      
      // Update tank temperatures but maintain safety monitoring
      setTanks(prevTanks => 
        prevTanks.map((tank, index) => ({
          ...tank,
          temperature: calculateTankTemperature(data, tank, index),
          anomalyDetected: detectTankAnomaly(data, tank, simulation.backendThresholds)
        }))
      );
      
      // SAFETY CHECK: Force tank switching if critical conditions detected
      checkCriticalSafetyConditions(data);
    }
  }, [data]);

  // Calculate tank temperature based on backend logic
  const calculateTankTemperature = (telemetryData: TelemetryData, tank: TankData, tankIndex: number) => {
    const baseTemp = telemetryData.fuel_temp;
    
    // Add variation for different tanks
    const tankVariation = tankIndex * 2 + Math.random() * 3 - 1.5;
    
    // Active tank runs slightly hotter
    const activeTankBonus = tank.isActive ? 2 : 0;
    
    // Fuel level affects temperature (less fuel = more heating)
    const fuelLevelFactor = (1 - tank.currentLevel) * 3;
    
    return baseTemp + tankVariation + activeTankBonus + fuelLevelFactor;
  };

  // Detect tank anomaly based on backend logic
  const detectTankAnomaly = (telemetryData: TelemetryData, tank: TankData, safetyThresholds: any) => {
    const temp = tank.temperature;
    const pressure = telemetryData.fuel_pressure;
    const flowRate = telemetryData.flow_rate;
    const rpm = telemetryData.rpm;
    const throttle = telemetryData.throttle;
    
    // SAFETY CRITICAL: Backend anomaly conditions - NEVER BYPASS
    if (temp > safetyThresholds.tempThreshold) return true; // Overheating - SAFETY CRITICAL
    if (temp < safetyThresholds.criticalTempLow) return true; // Sensor breakdown - SAFETY CRITICAL
    if (temp > safetyThresholds.criticalTempHigh) return true; // Critical overheating - EMERGENCY
    if (pressure > safetyThresholds.pressureThreshold && flowRate < safetyThresholds.lowFlowThreshold) return true; // Injector clog - SAFETY CRITICAL
    if (pressure < safetyThresholds.lowPressureThreshold) return true; // Fuel leak or pump failure - SAFETY CRITICAL
    if (rpm > safetyThresholds.rpmThreshold) return true; // RPM surge - SAFETY CRITICAL
    if (throttle > 90 && flowRate > safetyThresholds.flowThreshold) return true; // Throttle stuck - SAFETY CRITICAL
    
    return false;
  };

  // Get probable cause based on backend logic
  const getProbableCause = (telemetryData: TelemetryData, tank: TankData, safetyThresholds: any) => {
    const temp = tank.temperature;
    const pressure = telemetryData.fuel_pressure;
    const flowRate = telemetryData.flow_rate;
    const rpm = telemetryData.rpm;
    const throttle = telemetryData.throttle;

    // SAFETY CRITICAL: Use persistent safety thresholds for cause determination
    if (flowRate < safetyThresholds.lowFlowThreshold && pressure > safetyThresholds.pressureThreshold) return "CRITICAL: Fuel injector clog (low flow rate)";
    if (temp > safetyThresholds.criticalTempHigh) return "EMERGENCY: Critical overheating - immediate action required";
    if (temp > safetyThresholds.tempThreshold) return "WARNING: Overheating sensor or coolant failure";
    if (temp < safetyThresholds.criticalTempLow) return "CRITICAL: Sensor breakdown or coolant failure";
    if (pressure < safetyThresholds.lowPressureThreshold) return "CRITICAL: Possible fuel leak or pump failure";
    if (pressure > safetyThresholds.pressureThreshold) return "WARNING: High pressure - possible blockage";
    if (rpm > safetyThresholds.rpmThreshold) return "CRITICAL: Abnormal RPM surge, throttle malfunction";
    if (throttle > 90 && flowRate > safetyThresholds.flowThreshold) return "CRITICAL: Throttle stuck open, excessive fuel injection";
    
    return "Anomaly detected, cause unknown";
  };

  // SAFETY CRITICAL: Check for emergency conditions that require immediate action
  const checkCriticalSafetyConditions = (telemetryData: TelemetryData) => {
    const criticalConditions = [];
    
    // Check for emergency temperature conditions
    if (telemetryData.fuel_temp > simulation.backendThresholds.criticalTempHigh) {
      criticalConditions.push('EMERGENCY: Critical fuel temperature detected');
    }
    
    if (telemetryData.fuel_temp < simulation.backendThresholds.criticalTempLow) {
      criticalConditions.push('CRITICAL: Sensor failure - abnormally low temperature');
    }
    
    // Check for critical pressure conditions
    if (telemetryData.fuel_pressure < simulation.backendThresholds.lowPressureThreshold) {
      criticalConditions.push('CRITICAL: Fuel system pressure failure');
    }
    
    // Check for RPM surge
    if (telemetryData.rpm > simulation.backendThresholds.rpmThreshold) {
      criticalConditions.push('CRITICAL: Engine RPM surge detected');
    }
    
    // Check for injector clog
    if (telemetryData.flow_rate < simulation.backendThresholds.lowFlowThreshold && 
        telemetryData.fuel_pressure > simulation.backendThresholds.pressureThreshold) {
      criticalConditions.push('CRITICAL: Fuel injector clog detected');
    }
    
    // Force emergency alerts for critical conditions
    criticalConditions.forEach(condition => {
      addAlert('danger', condition);
    });
    
    // Force tank switching if active tank has critical issues
    if (criticalConditions.length > 0) {
      const activeTank = tanks.find(tank => tank.isActive);
      if (activeTank && !manualMode) {
        // Emergency tank switching
        checkTankSwitching();
      }
    }
  };

  // Manual tank switching function
  const manualSwitchTank = (tankId: string) => {
    if (!manualMode) return;
    
    const targetTank = tanks.find(tank => tank.id === tankId);

    if (!targetTank) {
    addAlert('warning', `Cannot switch: Invalid tank selection`);
    return;
    }

    if (targetTank.isActive) {
    addAlert('warning', `Cannot switch to ${targetTank.name}: Already active`);
    return;
    }

    if (targetTank.currentLevel < 0.1) {
    addAlert('warning', `Cannot switch to ${targetTank.name}: Insufficient fuel`);
    return;
    }

    
    setSimulation(prev => ({ ...prev, switchingInProgress: true }));
    addAlert('info', `Manual switch initiated to ${targetTank.name}`);
    
    setTimeout(() => {
      setTanks(prevTanks => 
        prevTanks.map(tank => ({
          ...tank,
          isActive: tank.id === tankId
        }))
      );
      
      setSimulation(prev => ({ 
        ...prev, 
        activeTank: tankId,
        switchingInProgress: false,
        stats: {
          ...prev.stats,
          tankSwitches: prev.stats.tankSwitches + 1
        }
      }));
      
      addAlert('info', `Successfully switched to ${targetTank.name}`);
    }, 2000);
  };
  // Calculate fuel temperature based on various factors
  const calculateFuelTemp = (tank: TankData, altitude: number, ambientTemp: number, baseTemp: number) => {
    const altitudeFactor = altitude * 0.0001; // Temperature decreases with altitude
    const fuelLevelFactor = Math.max(0, (1 - tank.currentLevel) * 0.002); // Less fuel = more heating
    const activeFactor = tank.isActive ? 0.5 : 0; // Active tank heats up
    const adjustedBaseTemp = baseTemp + ambientTemp - altitudeFactor * 20;
    
    return adjustedBaseTemp + fuelLevelFactor * 15 + activeFactor * Math.random() * 8;
  };

  // Calculate vapor formation
  const calculateVaporFormation = (temp: number, fuelLevel: number) => {
    const vaporThreshold = 40; // °C
    if (temp > vaporThreshold) {
      const vaporIntensity = Math.min(30, (temp - vaporThreshold) * 2);
      return vaporIntensity * (1 - fuelLevel) * 0.5; // More vapor with less fuel
    }
    return 0;
  };

  // Add alert
  const addAlert = (type: 'info' | 'warning' | 'danger', message: string) => {
    const alert = {
      type,
      message,
      timestamp: new Date().toLocaleTimeString()
    };
    
    setSimulation(prev => ({
      ...prev,
      alerts: [alert, ...prev.alerts.slice(0, 9)] // Keep only last 10 alerts
    }));
  };

  // Tank switching logic
  const checkTankSwitching = () => {
    if (manualMode) return; // Skip automatic switching in manual mode
    
    const activeTank = tanks.find(tank => tank.isActive);
    if (!activeTank) return;

    let shouldSwitch = false;
    let nextTankId = '';
    let reason = '';
    let priority = 'normal'; // normal, high, critical, emergency

    // EMERGENCY: Critical temperature conditions
    if (activeTank.temperature > simulation.backendThresholds.criticalTempHigh) {
      shouldSwitch = true;
      priority = 'emergency';
      reason = 'EMERGENCY: Critical Temperature';
      nextTankId = tanks
        .filter(tank => !tank.isActive && tank.currentLevel > 0.1 && tank.temperature < simulation.backendThresholds.criticalTempHigh)
        .sort((a, b) => a.priority - b.priority)[0]?.id || '';
    }
    // CRITICAL: Sensor failure
    else if (activeTank.temperature < simulation.backendThresholds.criticalTempLow) {
      shouldSwitch = true;
      priority = 'critical';
      reason = 'CRITICAL: Sensor Failure';
      nextTankId = tanks
        .filter(tank => !tank.isActive && tank.currentLevel > 0.1 && tank.temperature > simulation.backendThresholds.criticalTempLow)
        .sort((a, b) => a.priority - b.priority)[0]?.id || '';
    }
    // WARNING: High temperature (backend threshold)
    else if (activeTank.temperature > simulation.backendThresholds.tempThreshold) {
      shouldSwitch = true;
      priority = 'high';
      reason = 'High Temperature';
      nextTankId = tanks
        .filter(tank => !tank.isActive && tank.currentLevel > 0.1 && tank.temperature < simulation.backendThresholds.tempThreshold)
        .sort((a, b) => a.priority - b.priority)[0]?.id || '';
    }

    // CRITICAL: Switch if anomaly detected in active tank
    else if (activeTank.anomalyDetected && data) {
      shouldSwitch = true;
      priority = 'critical';
      reason = getProbableCause(data, activeTank, simulation.backendThresholds);
      nextTankId = tanks
        .filter(tank => !tank.isActive && tank.currentLevel > 0.1 && !tank.anomalyDetected)
        .sort((a, b) => a.priority - b.priority)[0]?.id || '';
    }

    // WARNING: Switch if fuel level too low
    else if (activeTank.currentLevel < simulation.lowFuelThreshold / 100) {
      shouldSwitch = true;
      priority = 'normal';
      reason = 'Low Fuel Level';
      nextTankId = tanks
        .filter(tank => !tank.isActive && tank.currentLevel > 0.2)
        .sort((a, b) => a.priority - b.priority)[0]?.id || '';
    }

    if (shouldSwitch && nextTankId) {
      setSimulation(prev => ({ ...prev, switchingInProgress: true }));
      
      // Alert type based on priority
      const alertType = priority === 'emergency' ? 'danger' : 
                       priority === 'critical' ? 'danger' : 'warning';
      
      addAlert(alertType, `SAFETY: Switching from ${activeTank.name} to ${tanks.find(t => t.id === nextTankId)?.name} due to: ${reason}`);
      
      if (!data) return;
      setTimeout(() => {
        setTanks(prevTanks => 
          prevTanks.map(tank => ({
            ...tank,
            isActive: tank.id === nextTankId,
            anomalyDetected: detectTankAnomaly(data, tank, simulation.backendThresholds)
          }))
        );
        
        setSimulation(prev => ({ 
          ...prev, 
          activeTank: nextTankId,
          switchingInProgress: false,
          stats: {
            ...prev.stats,
            tankSwitches: prev.stats.tankSwitches + 1
          }
        }));
      }, 2000);
    } else if (shouldSwitch && !nextTankId) {
      addAlert('danger', 'EMERGENCY: No suitable backup tank available for switching! IMMEDIATE PILOT INTERVENTION REQUIRED!');
    }
  };

  // Simulation update logic
  const updateSimulation = () => {
    if (!simulation.running) return;

    setSimulation(prev => ({ ...prev, time: prev.time + 1 }));

    setTanks(prevTanks => {
      return prevTanks.map(tank => {
        let newLevel = tank.currentLevel;
        let newTemp = tank.temperature;
        
        // Fuel consumption from active tank
        if (tank.isActive && simulation.fuelConsumption > 0) {
          const consumptionRate = simulation.fuelConsumption / (tank.capacity * 60); // per second
          newLevel = Math.max(0, tank.currentLevel - consumptionRate);
        }
        
        // Temperature effects based on altitude and ambient conditions
        newTemp = calculateFuelTemp(tank, simulation.altitude, simulation.ambientTemp, data?.fuel_temp || tank.temperature);
        
        // Vapor pressure calculation
        const vaporPressure = Math.max(0, (newTemp - 60) / 40);
        
        // Check for vapor formation
        const vaporLevel = calculateVaporFormation(newTemp, newLevel);
        if (vaporLevel > 5 && Math.random() < 0.1) {
          setSimulation(prev => ({
            ...prev,
            stats: { ...prev.stats, vaporEvents: prev.stats.vaporEvents + 1 }
          }));
          addAlert('warning', `Vapor formation detected in ${tank.name}`);
        }
        
        return {
          ...tank,
          currentLevel: newLevel,
          temperature: newTemp,
          vaporPressure
        };
      });
    });

    // Update simulation stats
    setSimulation(prev => ({
      ...prev,
      stats: {
        ...prev.stats,
        totalFuelUsed: prev.stats.totalFuelUsed + (simulation.fuelConsumption / 60),
        maxTemp: Math.max(prev.stats.maxTemp, ...tanks.map(t => t.temperature))
      },
      vaporFormation: tanks.some(tank => tank.temperature > 70)
    }));

    // Add to historical data
    setHistoricalData(prev => {
      const newData = {
        timestamp: new Date().toISOString(),
        primaryTemp: tanks[0]?.temperature || 0,
        auxiliaryTemp: tanks[1]?.temperature || 0,
        reserveTemp: tanks[2]?.temperature || 0,
        primaryLevel: tanks[0]?.currentLevel * 100 || 0,
        auxiliaryLevel: tanks[1]?.currentLevel * 100 || 0,
        reserveLevel: tanks[2]?.currentLevel * 100 || 0,
        altitude: simulation.altitude,
        activeTank: simulation.activeTank
      };
      return [...prev.slice(-50), newData];
    });
  };

  // Check tank switching
  useEffect(() => {
    if (simulation.running) {
      checkTankSwitching();
    }
  }, [tanks, simulation.running]);

  // Simulation interval
  useEffect(() => {
    if (simulation.running) {
      intervalRef.current = setInterval(updateSimulation, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [simulation.running, tanks, simulation.fuelConsumption, simulation.altitude, simulation.ambientTemp]);

  const toggleSimulation = () => {
    setSimulation(prev => ({ ...prev, running: !prev.running }));
    addAlert('info', simulation.running ? 'Simulation paused' : 'Simulation started');
  };

  const resetSimulation = () => {
    setSimulation(prev => ({ ...prev, running: false }));
    setTanks([
      {
        id: 'primary',
        name: 'Primary Tank',
        type: 'primary',
        capacity: 400,
        currentLevel: 0.85,
        temperature: 20,
        position: [-3, 0, 0],
        isActive: true,
        sensorDepth: 0.3,
        vaporPressure: 0,
        priority: 1,
        anomalyDetected: false
      },
      {
        id: 'auxiliary',
        name: 'Auxiliary Tank',
        type: 'auxiliary',
        capacity: 300,
        currentLevel: 0.75,
        temperature: 20,
        position: [0, 0, 0],
        isActive: false,
        sensorDepth: 0.3,
        vaporPressure: 0,
        priority: 2,
        anomalyDetected: false
      },
      {
        id: 'reserve',
        name: 'Reserve Tank',
        type: 'reserve',
        capacity: 150,
        currentLevel: 0.95,
        temperature: 20,
        position: [3, 0, 0],
        isActive: false,
        sensorDepth: 0.3,
        vaporPressure: 0,
        priority: 3,
        anomalyDetected: false
      }
    ]);
    setSimulation(prev => ({
      ...prev,
      time: 0,
      activeTank: 'primary',
      switchingInProgress: false,
      vaporFormation: false,
      stats: {
        totalFuelUsed: 0,
        tankSwitches: 0,
        maxTemp: 20,
        vaporEvents: 0
      },
      alerts: []
    }));
    setHistoricalData([]);
    addAlert('info', 'Simulation reset to initial state');
  };

  const chartData = {
    labels: historicalData.map(d => new Date(d.timestamp).toLocaleTimeString()),
    datasets: [
      {
        label: 'Primary Tank Temp',
        data: historicalData.map(d => d.primaryTemp),
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.4
      },
      {
        label: 'Auxiliary Tank Temp',
        data: historicalData.map(d => d.auxiliaryTemp),
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        tension: 0.4
      },
      {
        label: 'Reserve Tank Temp',
        data: historicalData.map(d => d.reserveTemp),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4
      }
    ]
  };

  const fuelLevelData = {
    labels: historicalData.map(d => new Date(d.timestamp).toLocaleTimeString()),
    datasets: [
      {
        label: 'Primary Tank Level',
        data: historicalData.map(d => d.primaryLevel),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4
      },
      {
        label: 'Auxiliary Tank Level',
        data: historicalData.map(d => d.auxiliaryLevel),
        borderColor: '#8b5cf6',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        tension: 0.4
      },
      {
        label: 'Reserve Tank Level',
        data: historicalData.map(d => d.reserveLevel),
        borderColor: '#06b6d4',
        backgroundColor: 'rgba(6, 182, 212, 0.1)',
        tension: 0.4
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: false,
        grid: { color: 'rgba(71, 85, 105, 0.3)' },
        ticks: { color: '#94a3b8' }
      },
      x: {
        grid: { color: 'rgba(71, 85, 105, 0.3)' },
        ticks: { color: '#94a3b8', maxTicksLimit: 8 }
      }
    },
    plugins: {
      legend: {
        labels: { color: '#f1f5f9' }
      }
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">🚁 Helicopter Fuel Tank Management Simulation</h2>
        <p className="text-slate-400">Intelligent tank switching with temperature monitoring and altitude effects</p>
      </div>

      {/* Control Panel */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4">Simulation Controls</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Control Mode</label>
            <select
              value={manualMode ? 'manual' : 'automatic'}
              onChange={(e) => setManualMode(e.target.value === 'manual')}
              className="w-full bg-slate-700 text-white rounded px-3 py-2 text-sm"
            >
              <option value="automatic">Automatic</option>
              <option value="manual">Manual</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Altitude (ft)</label>
            <input
              type="number"
              value={simulation.altitude}
              onChange={(e) => setSimulation(prev => ({ ...prev, altitude: Number(e.target.value) }))}
              className="w-full bg-slate-700 text-white rounded px-3 py-2 text-sm"
              min="0"
              max="20000"
              step="100"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Ambient Temp (°C)</label>
            <input
              type="number"
              value={simulation.ambientTemp}
              onChange={(e) => setSimulation(prev => ({ ...prev, ambientTemp: Number(e.target.value) }))}
              className="w-full bg-slate-700 text-white rounded px-3 py-2 text-sm"
              min="-40"
              max="50"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Fuel Consumption (L/min)</label>
            <input
              type="number"
              value={data?.flow_rate || simulation.fuelConsumption}
              onChange={(e) => setSimulation(prev => ({ ...prev, fuelConsumption: Number(e.target.value) }))}
              className="w-full bg-slate-700 text-white rounded px-3 py-2 text-sm"
              min="5"
              max="30"
              step="0.5"
              disabled={!!data}
              title={data ? "Using live telemetry data" : "Manual input"}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Temp Threshold (°C)</label>
            <input
              type="number"
              value={simulation.backendThresholds.tempThreshold}
              onChange={(e) => setSimulation(prev => ({
                ...prev,
                tempThreshold: Number(e.target.value),
                // SAFETY: Only allow manual override in manual mode
                backendThresholds: manualMode ? 
                  { ...prev.backendThresholds, tempThreshold: Number(e.target.value) } : 
                  prev.backendThresholds
              }))}
              className="w-full bg-slate-700 text-white rounded px-3 py-2 text-sm"
              min="30"
              max="70"
              disabled={!manualMode}
              title={manualMode ? "Manual threshold control - SAFETY CRITICAL" : "Using backend safety threshold - PROTECTED"}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Low Fuel Threshold (%)</label>
            <input
              type="number"
              value={simulation.lowFuelThreshold}
              onChange={(e) => setSimulation(prev => ({ ...prev, lowFuelThreshold: Number(e.target.value) }))}
              className="w-full bg-slate-700 text-white rounded px-3 py-2 text-sm"
              min="5"
              max="30"
            />
          </div>
          
          <div className="flex flex-col gap-2">
            <button
              onClick={toggleSimulation}
              className={`px-4 py-2 rounded font-medium transition-colors ${
                simulation.running 
                  ? 'bg-red-600 hover:bg-red-700 text-white' 
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {simulation.running ? 'Pause' : 'Start'}
            </button>
            <button
              onClick={resetSimulation}
              className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded font-medium transition-colors"
            >
              Reset
            </button>
          </div>
        </div>
        
        {/* Backend Data Integration Status */}
        <div className="mt-4 p-3 bg-slate-900/50 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${data ? 'bg-green-400' : 'bg-red-400'}`} />
              <span className="text-slate-300">Backend Integration:</span>
              <span className={data ? 'text-green-400' : 'text-red-400'}>
                {data ? 'Connected' : 'Disconnected'}
              </span>
              <div className="ml-4 flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-blue-400" />
                <span className="text-blue-400 text-xs">Safety Thresholds: PROTECTED</span>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-400">
              {data && (
                <>
                  <span>Live Temp: {data.fuel_temp.toFixed(1)}°C</span>
                  <span>Live Flow: {data.flow_rate.toFixed(1)} L/min</span>
                  <span>Live RPM: {data.rpm.toLocaleString()}</span>
                  <span className="text-orange-400">Safety: ACTIVE</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Status Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center gap-2 mb-2">
            <Plane className="text-blue-400" size={20} />
            <span className="text-white font-medium">Altitude</span>
          </div>
          <div className="text-2xl font-bold text-blue-400">{simulation.altitude.toLocaleString()}ft</div>
        </div>

        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center gap-2 mb-2">
            <Thermometer className="text-orange-400" size={20} />
            <span className="text-white font-medium">Backend Temp</span>
          </div>
          <div className="text-2xl font-bold text-orange-400">{data?.fuel_temp.toFixed(1) || '--'}°C</div>
        </div>

        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center gap-2 mb-2">
            <Droplets className="text-green-400" size={20} />
            <span className="text-white font-medium">Control Mode</span>
          </div>
          <div className="text-lg font-bold text-green-400 capitalize">{manualMode ? 'Manual' : 'Automatic'}</div>
        </div>

        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className={simulation.vaporFormation ? "text-red-400" : "text-green-400"} size={20} />
            <span className="text-white font-medium">Vapor Status</span>
          </div>
          <div className={`text-lg font-bold ${simulation.vaporFormation ? "text-red-400" : "text-green-400"}`}>
            {simulation.vaporFormation ? 'Forming' : 'Normal'}
          </div>
        </div>
      </div>

      {/* 3D Visualization */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 h-96">
        <div className="p-4 border-b border-slate-700">
          <h3 className="text-lg font-semibold text-white">3D Tank Visualization</h3>
          <p className="text-slate-400 text-sm">Click on tanks to inspect • Temperature sensors submerged in fuel</p>
        </div>
        
        <div className="h-80">
          <Canvas camera={{ position: [8, 4, 8], fov: 50 }}>
            <ambientLight intensity={0.3} />
            <pointLight position={[0, 10, 0]} intensity={0.5} />
            
            {tanks.map(tank => (
              <FuelTank 
                key={tank.id}
                tank={tank}
                simulation={simulation}
                onTankClick={setSelectedTank}
              />
            ))}
            
            <OrbitControls 
              enablePan={true}
              enableZoom={true}
              enableRotate={true}
              maxPolarAngle={Math.PI / 2}
            />
          </Canvas>
        </div>
      </div>

      {/* Tank Status Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {tanks.map(tank => (
          <div key={tank.id} className={`bg-slate-800 rounded-xl p-6 border ${
            tank.isActive ? 'border-green-500' : 
            tank.temperature > simulation.backendThresholds.tempThreshold ? 'border-red-500' :
            tank.currentLevel < simulation.lowFuelThreshold / 100 ? 'border-yellow-500' :
            'border-slate-700'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">{tank.name}</h3>
              <div className="flex items-center gap-2">
                {tank.isActive && (
                  <div className="bg-green-500/20 px-2 py-1 rounded text-green-400 text-xs font-medium">
                    ACTIVE
                  </div>
                )}
                {manualMode && !tank.isActive && tank.currentLevel > 0.1 && (
                  <button
                    onClick={() => manualSwitchTank(tank.id)}
                    className="bg-blue-500/20 px-2 py-1 rounded text-blue-400 text-xs font-medium hover:bg-blue-500/30 transition-colors"
                    disabled={simulation.switchingInProgress}
                  >
                    SWITCH
                  </button>
                )}
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-400">Fuel Level:</span>
                <span className="text-white font-mono">{(tank.currentLevel * 100).toFixed(1)}%</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-slate-400">Temperature:</span>
                <span className={`font-mono ${
                  tank.temperature > simulation.backendThresholds.tempThreshold ? 'text-red-400' : 
                  tank.temperature > simulation.backendThresholds.tempThreshold * 0.8 ? 'text-yellow-400' : 'text-green-400'
                }`}>
                  {tank.temperature.toFixed(1)}°C
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-slate-400">Live Backend Temp:</span>
                <span className="text-blue-400 font-mono">
                  {data?.fuel_temp.toFixed(1) || '--'}°C
                </span>
              </div>
              
              <div className="bg-slate-800/50 p-2 rounded">
                <div className="text-slate-400 text-xs">Safety Status</div>
                <span className={`font-mono text-xs ${
                  tank.temperature > simulation.backendThresholds.criticalTempHigh ? 'text-red-400' :
                  tank.temperature > simulation.backendThresholds.tempThreshold ? 'text-yellow-400' :
                  'text-green-400'
                }`}>
                  {tank.temperature > simulation.backendThresholds.criticalTempHigh ? 'EMERGENCY' :
                   tank.temperature > simulation.backendThresholds.tempThreshold ? 'WARNING' :
                   'SAFE'}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-slate-400">Capacity:</span>
                <span className="text-white font-mono">{tank.capacity}L</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-slate-400">Vapor Pressure:</span>
                <span className="text-white font-mono">{tank.vaporPressure.toFixed(2)} Bar</span>
              </div>
              
              {/* Fuel level bar */}
              <div className="w-full bg-slate-700 rounded-full h-3">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    tank.currentLevel < simulation.lowFuelThreshold / 100 ? 'bg-red-500' : 
                    tank.currentLevel < 0.5 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${tank.currentLevel * 100}%` }}
                />
              </div>
              
              {/* Temperature bar */}
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    tank.temperature > simulation.backendThresholds.tempThreshold ? 'bg-red-500' : 
                    tank.temperature > simulation.backendThresholds.tempThreshold * 0.8 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min((tank.temperature / simulation.backendThresholds.tempThreshold) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Alerts Panel */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4">System Alerts</h3>
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {simulation.alerts.length === 0 ? (
            <div className="text-slate-400 text-center py-4">No system alerts</div>
          ) : (
            simulation.alerts.map((alert, index) => (
              <div
                key={index}
                className={`p-3 rounded border-l-4 ${
                  alert.type === 'danger' ? 'bg-red-500/10 border-red-500 text-red-400' :
                  alert.type === 'warning' ? 'bg-yellow-500/10 border-yellow-500 text-yellow-400' :
                  'bg-blue-500/10 border-blue-500 text-blue-400'
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className="text-sm">{alert.message}</span>
                  <span className="text-xs opacity-75">{alert.timestamp}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="text-red-400" size={20} />
            <h3 className="text-lg font-semibold text-white">Temperature Trends</h3>
          </div>
          <div className="h-64">
            <Line data={chartData} options={chartOptions} />
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center gap-2 mb-4">
            <Droplets className="text-blue-400" size={20} />
            <h3 className="text-lg font-semibold text-white">Fuel Level Trends</h3>
          </div>
          <div className="h-64">
            <Line data={fuelLevelData} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-4 text-white text-center">
          <div className="text-2xl font-bold">{simulation.stats.totalFuelUsed.toFixed(1)}</div>
          <div className="text-sm opacity-90">Total Fuel Used (L)</div>
        </div>
        
        <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-xl p-4 text-white text-center">
          <div className="text-2xl font-bold">{simulation.stats.tankSwitches}</div>
          <div className="text-sm opacity-90">Tank Switches</div>
        </div>
        
        <div className="bg-gradient-to-r from-yellow-600 to-red-600 rounded-xl p-4 text-white text-center">
          <div className="text-2xl font-bold">{simulation.stats.maxTemp.toFixed(1)}</div>
          <div className="text-sm opacity-90">Max Temperature (°C)</div>
        </div>
        
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-4 text-white text-center">
          <div className="text-2xl font-bold">{simulation.stats.vaporEvents}</div>
          <div className="text-sm opacity-90">Vapor Formation Events</div>
        </div>
        
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-4 text-white text-center">
          <div className="text-2xl font-bold">{(simulation.time / 60).toFixed(1)}</div>
          <div className="text-sm opacity-90">Flight Time (min)</div>
        </div>
      </div>

      {/* Switching Logic Status */}
      {simulation.switchingInProgress && (
        <div className="bg-orange-500/20 border border-orange-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 text-orange-400">
            <AlertTriangle size={20} />
            <span className="font-medium">
              {manualMode ? 'Manual Tank Switching in Progress' : 'Automatic Tank Switching in Progress'}
            </span>
          </div>
          <p className="text-orange-300 text-sm mt-1">
            {manualMode 
              ? 'Manual tank switch initiated by operator' 
              : 'Automatically switching to backup tank due to temperature or fuel level threshold'
            }
          </p>
        </div>
      )}
      
      {/* Manual Mode Instructions */}
      {manualMode && (
        <div className="bg-blue-500/20 border border-blue-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 text-blue-400">
            <Gauge size={20} />
            <span className="font-medium">Manual Control Mode Active</span>
          </div>
          <p className="text-blue-300 text-sm mt-1">
            Automatic tank switching is disabled. Use the SWITCH buttons on tank cards to manually change active tank.
            Temperature thresholds can be adjusted manually.
          </p>
        </div>
      )}
    </div>
  );
};

export default FuelTankSimulation;