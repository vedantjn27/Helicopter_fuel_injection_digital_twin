import React from 'react';
import { TelemetryData } from '../../services/api';

interface GaugeProps {
  value: number;
  min: number;
  max: number;
  unit: string;
  label: string;
  dangerThreshold?: number;
  warningThreshold?: number;
}

const CircularGauge: React.FC<GaugeProps> = ({ 
  value, 
  min, 
  max, 
  unit, 
  label, 
  dangerThreshold, 
  warningThreshold 
}) => {
  const percentage = Math.min(Math.max((value - min) / (max - min), 0), 1);
  const angle = percentage * 270 - 135; // -135 to +135 degrees
  
  const getColor = () => {
    if (dangerThreshold && value >= dangerThreshold) return 'text-red-400';
    if (warningThreshold && value >= warningThreshold) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getGaugeColor = () => {
    if (dangerThreshold && value >= dangerThreshold) return '#ef4444';
    if (warningThreshold && value >= warningThreshold) return '#f59e0b';
    return '#10b981';
  };

  return (
    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
      <div className="relative w-32 h-32 mx-auto">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          {/* Background arc */}
          <path
            d="M 15 85 A 35 35 0 1 1 85 85"
            fill="none"
            stroke="#374151"
            strokeWidth="8"
            strokeLinecap="round"
          />
          {/* Value arc */}
          <path
            d="M 15 85 A 35 35 0 1 1 85 85"
            fill="none"
            stroke={getGaugeColor()}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${percentage * 219.9} 219.9`}
            className="transition-all duration-500 ease-out"
          />
        </svg>
        
        {/* Needle */}
        <div 
          className="absolute top-1/2 left-1/2 w-0.5 h-12 bg-white origin-bottom transition-transform duration-500"
          style={{ transform: `translate(-50%, -100%) rotate(${angle}deg)` }}
        />
        
        {/* Center dot */}
        <div className="absolute top-1/2 left-1/2 w-3 h-3 bg-white rounded-full transform -translate-x-1/2 -translate-y-1/2" />
      </div>
      
      <div className="text-center mt-4">
        <div className="text-xs text-slate-400 uppercase tracking-wide">{label}</div>
        <div className={`text-2xl font-bold ${getColor()}`}>
          {value.toFixed(1)}
        </div>
        <div className="text-xs text-slate-500">{unit}</div>
      </div>
    </div>
  );
};

interface TelemetryGaugesProps {
  data: TelemetryData | null;
}

const TelemetryGauges: React.FC<TelemetryGaugesProps> = ({ data }) => {
  if (!data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-slate-800 rounded-xl p-6 border border-slate-700 animate-pulse">
            <div className="w-32 h-32 bg-slate-700 rounded-full mx-auto mb-4" />
            <div className="h-4 bg-slate-700 rounded mx-auto w-16" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <CircularGauge
        value={data.rpm}
        min={0}
        max={6000}
        unit="RPM"
        label="Engine RPM"
        warningThreshold={4500}
        dangerThreshold={5500}
      />
      
      <CircularGauge
        value={data.fuel_pressure}
        min={0}
        max={8}
        unit="Bar"
        label="Fuel Pressure"
        warningThreshold={6}
        dangerThreshold={7}
      />
      
      <CircularGauge
        value={data.fuel_temp}
        min={0}
        max={120}
        unit="°C"
        label="Fuel Temperature"
        warningThreshold={80}
        dangerThreshold={100}
      />
      
      <CircularGauge
        value={data.flow_rate}
        min={0}
        max={15}
        unit="L/min"
        label="Flow Rate"
        warningThreshold={12}
        dangerThreshold={14}
      />
    </div>
  );
};

export default TelemetryGauges;