import React from 'react';
import { TelemetryData } from '../../services/api';
import { Droplets, Gauge, Zap, Settings } from 'lucide-react';

interface SystemDiagramProps {
  data: TelemetryData | null;
}

const SystemDiagram: React.FC<SystemDiagramProps> = ({ data }) => {
  const getComponentStatus = (value: number, min: number, max: number) => {
    const percentage = (value - min) / (max - min);
    if (percentage > 0.8) return 'text-red-400 border-red-400';
    if (percentage > 0.6) return 'text-yellow-400 border-yellow-400';
    return 'text-green-400 border-green-400';
  };

  const getFlowIntensity = () => {
    if (!data) return 0;
    return Math.min(data.flow_rate / 10, 1);
  };

  const components = [
    {
      icon: Droplets,
      label: 'Fuel Tank',
      status: 'text-blue-400 border-blue-400',
      value: '95%'
    },
    {
      icon: Gauge,
      label: 'Fuel Pump',
      status: data ? getComponentStatus(data.fuel_pressure, 0, 8) : 'text-gray-400 border-gray-400',
      value: data ? `${data.fuel_pressure.toFixed(1)} Bar` : '--'
    },
    {
      icon: Settings,
      label: 'Fuel Injector',
      status: data ? getComponentStatus(data.flow_rate, 0, 15) : 'text-gray-400 border-gray-400',
      value: data ? `${data.flow_rate.toFixed(1)} L/min` : '--'
    },
    {
      icon: Zap,
      label: 'Engine',
      status: data ? getComponentStatus(data.rpm, 0, 6000) : 'text-gray-400 border-gray-400',
      value: data ? `${data.rpm.toLocaleString()} RPM` : '--'
    }
  ];

  return (
    <div className="bg-slate-800 rounded-xl p-8 border border-slate-700">
      <h3 className="text-xl font-bold text-white mb-6">Fuel System Flow</h3>
      
      <div className="flex items-center justify-between relative">
        {components.map((component, index) => {
          const Icon = component.icon;
          return (
            <React.Fragment key={component.label}>
              <div className="flex flex-col items-center">
                <div className={`w-16 h-16 rounded-full border-2 ${component.status} flex items-center justify-center bg-slate-900/50 transition-all duration-300`}>
                  <Icon size={24} />
                </div>
                <div className="text-center mt-3">
                  <div className="text-sm font-medium text-white">{component.label}</div>
                  <div className={`text-xs ${component.status.split(' ')[0]} font-mono`}>
                    {component.value}
                  </div>
                </div>
              </div>
              
              {index < components.length - 1 && (
                <div className="flex-1 relative mx-4">
                  {/* Static arrow */}
                  <div className="h-0.5 bg-slate-600 relative">
                    <div className="absolute right-0 top-1/2 transform -translate-y-1/2">
                      <div className="w-0 h-0 border-l-4 border-t-2 border-b-2 border-l-slate-600 border-t-transparent border-b-transparent" />
                    </div>
                  </div>
                  
                  {/* Animated flow */}
                  <div 
                    className="absolute top-0 h-0.5 bg-gradient-to-r from-blue-400 to-green-400 transition-all duration-1000"
                    style={{ 
                      width: `${getFlowIntensity() * 100}%`,
                      opacity: data ? 0.8 : 0
                    }}
                  >
                    <div className="absolute right-0 top-1/2 transform -translate-y-1/2">
                      <div className="w-0 h-0 border-l-4 border-t-2 border-b-2 border-l-green-400 border-t-transparent border-b-transparent" />
                    </div>
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
      
      {data?.anomaly && (
        <div className="mt-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
          <div className="flex items-center gap-2 text-red-400">
            <Settings className="animate-spin" size={16} />
            <span className="font-medium">System Anomaly Detected</span>
          </div>
          {data.probable_cause && (
            <p className="text-red-300 text-sm mt-1">{data.probable_cause}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default SystemDiagram;