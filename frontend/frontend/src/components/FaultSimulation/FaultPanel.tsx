import React, { useState } from 'react';
import { Settings, Zap, AlertTriangle, CheckCircle } from 'lucide-react';
import { apiService, TelemetryData } from '../../services/api';

interface FaultResult {
  fault_type: string;
  anomaly: boolean;
  score: number;
  telemetry: TelemetryData;
}

const FaultPanel: React.FC = () => {
  const [selectedFault, setSelectedFault] = useState('');
  const [simulating, setSimulating] = useState(false);
  const [lastResult, setLastResult] = useState<FaultResult | null>(null);

  const faultTypes = [
    {
      id: 'injector_clog',
      name: 'Injector Clog',
      description: 'Simulates reduced fuel flow due to blocked injector',
      icon: Settings,
      color: 'text-yellow-400'
    },
    {
      id: 'sensor_failure',
      name: 'Temperature Sensor Failure',
      description: 'Simulates faulty temperature readings',
      icon: AlertTriangle,
      color: 'text-red-400'
    },
    {
      id: 'fuel_leak',
      name: 'Fuel System Leak',
      description: 'Simulates pressure drop from fuel leak',
      icon: Zap,
      color: 'text-orange-400'
    },
    {
      id: 'rpm_surge',
      name: 'RPM Surge',
      description: 'Simulates abnormal engine RPM increase',
      icon: Zap,
      color: 'text-red-400'
    },
    {
      id: 'throttle_spike',
      name: 'Throttle Malfunction',
      description: 'Simulates stuck throttle causing excessive fuel flow',
      icon: Settings,
      color: 'text-orange-400'
    }
  ];

  const simulateFault = async () => {
    if (!selectedFault) return;
    
    setSimulating(true);
    try {
      const result = await apiService.simulateFault(selectedFault);
      setLastResult(result);
    } catch (error) {
      console.error('Failed to simulate fault:', error);
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Fault Simulation</h2>
        <p className="text-slate-400">Inject simulated faults to test system response and anomaly detection</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fault Selection */}
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4">Select Fault Type</h3>
          
          <div className="space-y-3">
            {faultTypes.map((fault) => {
              const Icon = fault.icon;
              return (
                <label
                  key={fault.id}
                  className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
                    selectedFault === fault.id
                      ? 'border-orange-500 bg-orange-500/10'
                      : 'border-slate-600 hover:border-slate-500'
                  }`}
                >
                  <input
                    type="radio"
                    name="fault-type"
                    value={fault.id}
                    checked={selectedFault === fault.id}
                    onChange={(e) => setSelectedFault(e.target.value)}
                    className="sr-only"
                  />
                  
                  <Icon className={fault.color} size={20} />
                  
                  <div className="flex-1">
                    <div className="font-medium text-white">{fault.name}</div>
                    <div className="text-sm text-slate-400 mt-1">{fault.description}</div>
                  </div>
                  
                  {selectedFault === fault.id && (
                    <CheckCircle className="text-orange-400" size={20} />
                  )}
                </label>
              );
            })}
          </div>

          <button
            onClick={simulateFault}
            disabled={!selectedFault || simulating}
            className="w-full mt-6 bg-orange-600 text-white py-3 px-4 rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {simulating ? 'Simulating Fault...' : 'Simulate Selected Fault'}
          </button>
        </div>

        {/* Results Panel */}
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4">Simulation Results</h3>
          
          {!lastResult ? (
            <div className="text-center py-8">
              <Settings className="mx-auto text-slate-600 mb-4" size={48} />
              <p className="text-slate-400">No simulation results yet</p>
              <p className="text-slate-500 text-sm mt-2">Select and run a fault simulation to see results</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className={`p-4 rounded-lg border-l-4 ${
                lastResult.anomaly 
                  ? 'border-red-500 bg-red-500/10' 
                  : 'border-green-500 bg-green-500/10'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  {lastResult.anomaly ? (
                    <AlertTriangle className="text-red-400" size={18} />
                  ) : (
                    <CheckCircle className="text-green-400" size={18} />
                  )}
                  <span className="font-medium text-white">
                    {lastResult.anomaly ? 'Anomaly Detected' : 'No Anomaly Detected'}
                  </span>
                </div>
                
                <div className="text-sm">
                  <div className="text-slate-400">
                    Fault Type: <span className="text-white">{lastResult.fault_type}</span>
                  </div>
                  <div className="text-slate-400">
                    Anomaly Score: <span className={`font-mono ${
                      lastResult.anomaly ? 'text-red-400' : 'text-green-400'
                    }`}>
                      {lastResult.score.toFixed(4)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-900/50 p-3 rounded-lg">
                  <div className="text-xs text-slate-400 uppercase tracking-wide">RPM</div>
                  <div className="text-lg font-bold text-white">{lastResult.telemetry.rpm.toLocaleString()}</div>
                </div>
                
                <div className="bg-slate-900/50 p-3 rounded-lg">
                  <div className="text-xs text-slate-400 uppercase tracking-wide">Pressure</div>
                  <div className="text-lg font-bold text-white">{lastResult.telemetry.fuel_pressure.toFixed(1)} Bar</div>
                </div>
                
                <div className="bg-slate-900/50 p-3 rounded-lg">
                  <div className="text-xs text-slate-400 uppercase tracking-wide">Temperature</div>
                  <div className="text-lg font-bold text-white">{lastResult.telemetry.fuel_temp.toFixed(1)}°C</div>
                </div>
                
                <div className="bg-slate-900/50 p-3 rounded-lg">
                  <div className="text-xs text-slate-400 uppercase tracking-wide">Flow Rate</div>
                  <div className="text-lg font-bold text-white">{lastResult.telemetry.flow_rate.toFixed(1)} L/min</div>
                </div>
              </div>

              <div className="text-xs text-slate-500">
                Simulated at: {new Date(lastResult.telemetry.timestamp).toLocaleString()}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FaultPanel;