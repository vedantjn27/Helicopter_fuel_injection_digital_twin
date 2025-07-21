import React from 'react';
import { Droplets, AlertTriangle, CheckCircle, Gauge } from 'lucide-react';
import { TelemetryData } from '../../services/api';

interface TankData {
  id: number;
  name: string;
  capacity: number;
  currentLevel: number;
  fuelType: string;
  status: 'normal' | 'warning' | 'critical';
  temperature: number;
  pressure: number;
  lastRefill: string;
}

interface TankStatusProps {
  data: TelemetryData | null;
}

const TankStatus: React.FC<TankStatusProps> = ({ data }) => {
  // Simulate three fuel tanks as per backend specification
  const generateTankData = (): TankData[] => {
    const baseFuelLevel = data?.flow_rate ? Math.max(0.6, 1 - (data.flow_rate / 100)) : 0.85;
    
    return [
      {
        id: 1,
        name: 'Main Tank',
        capacity: 200,
        currentLevel: baseFuelLevel * 0.95, // 95% of base level
        fuelType: 'Jet A-1',
        status: baseFuelLevel > 0.3 ? 'normal' : baseFuelLevel > 0.15 ? 'warning' : 'critical',
        temperature: data?.fuel_temp || 25,
        pressure: data?.fuel_pressure || 3.5,
        lastRefill: '2024-01-20'
      },
      {
        id: 2,
        name: 'Auxiliary Tank',
        capacity: 150,
        currentLevel: baseFuelLevel * 0.88, // 88% of base level
        fuelType: 'Jet A-1',
        status: baseFuelLevel * 0.88 > 0.3 ? 'normal' : baseFuelLevel * 0.88 > 0.15 ? 'warning' : 'critical',
        temperature: (data?.fuel_temp || 25) + 2,
        pressure: (data?.fuel_pressure || 3.5) - 0.2,
        lastRefill: '2024-01-19'
      },
      {
        id: 3,
        name: 'Reserve Tank',
        capacity: 100,
        currentLevel: baseFuelLevel * 1.02, // 102% of base level (slightly higher)
        fuelType: 'Jet A-1',
        status: baseFuelLevel * 1.02 > 0.3 ? 'normal' : baseFuelLevel * 1.02 > 0.15 ? 'warning' : 'critical',
        temperature: (data?.fuel_temp || 25) - 1,
        pressure: (data?.fuel_pressure || 3.5) + 0.1,
        lastRefill: '2024-01-21'
      }
    ];
  };

  const tanks = generateTankData();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'border-red-500 bg-red-500/10 text-red-400';
      case 'warning': return 'border-yellow-500 bg-yellow-500/10 text-yellow-400';
      case 'normal': return 'border-green-500 bg-green-500/10 text-green-400';
      default: return 'border-gray-500 bg-gray-500/10 text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'critical': return AlertTriangle;
      case 'warning': return AlertTriangle;
      case 'normal': return CheckCircle;
      default: return CheckCircle;
    }
  };

  const getFuelLevelColor = (level: number) => {
    if (level > 0.5) return 'bg-green-500';
    if (level > 0.3) return 'bg-yellow-500';
    if (level > 0.15) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const totalFuel = tanks.reduce((sum, tank) => sum + (tank.currentLevel * tank.capacity), 0);
  const totalCapacity = tanks.reduce((sum, tank) => sum + tank.capacity, 0);
  const averageFuelLevel = totalFuel / totalCapacity;

  return (
    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Droplets className="text-blue-400" size={24} />
          <h3 className="text-xl font-bold text-white">Fuel Tank Status</h3>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-white">{Math.round(averageFuelLevel * 100)}%</div>
          <div className="text-sm text-slate-400">Overall Level</div>
        </div>
      </div>

      {/* Overall System Status */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-900/50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-blue-400">{totalFuel.toFixed(0)}L</div>
          <div className="text-xs text-slate-400">Total Fuel</div>
        </div>
        <div className="bg-slate-900/50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-white">{totalCapacity}L</div>
          <div className="text-xs text-slate-400">Total Capacity</div>
        </div>
        <div className="bg-slate-900/50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-green-400">
            {tanks.filter(tank => tank.status === 'normal').length}/3
          </div>
          <div className="text-xs text-slate-400">Tanks Normal</div>
        </div>
      </div>

      {/* Individual Tank Status */}
      <div className="space-y-4">
        {tanks.map((tank) => {
          const StatusIcon = getStatusIcon(tank.status);
          const fuelAmount = tank.currentLevel * tank.capacity;
          const fuelPercentage = tank.currentLevel * 100;
          
          return (
            <div
              key={tank.id}
              className={`p-4 rounded-lg border-l-4 ${getStatusColor(tank.status)}`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <StatusIcon size={20} />
                  <div>
                    <div className="font-medium text-white">{tank.name}</div>
                    <div className="text-sm text-slate-400">{tank.fuelType}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-white">{fuelPercentage.toFixed(1)}%</div>
                  <div className="text-sm text-slate-400">{fuelAmount.toFixed(0)}L / {tank.capacity}L</div>
                </div>
              </div>

              {/* Fuel Level Bar */}
              <div className="mb-3">
                <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${getFuelLevelColor(tank.currentLevel)}`}
                    style={{ width: `${fuelPercentage}%` }}
                  />
                </div>
              </div>

              {/* Tank Details */}
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Gauge className="text-slate-400" size={14} />
                  <div>
                    <div className="text-slate-400">Pressure</div>
                    <div className="text-white font-mono">{tank.pressure.toFixed(1)} Bar</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-orange-400 rounded-full" />
                  <div>
                    <div className="text-slate-400">Temperature</div>
                    <div className="text-white font-mono">{tank.temperature.toFixed(1)}°C</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-400 rounded-full" />
                  <div>
                    <div className="text-slate-400">Last Refill</div>
                    <div className="text-white font-mono">{tank.lastRefill}</div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Fuel Consumption Rate */}
      {data && (
        <div className="mt-4 p-4 bg-slate-900/50 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Droplets className="text-blue-400" size={16} />
              <span className="text-slate-400">Current Consumption Rate</span>
            </div>
            <div className="text-white font-mono">{data.flow_rate.toFixed(1)} L/min</div>
          </div>
          {data.flow_rate > 0 && (
            <div className="mt-2 text-xs text-slate-500">
              Estimated time to empty: {Math.round(totalFuel / data.flow_rate)} minutes
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TankStatus;