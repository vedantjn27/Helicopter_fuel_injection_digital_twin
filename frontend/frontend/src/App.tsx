import React, { useState } from 'react';
import Sidebar from './components/Layout/Sidebar';
import Header from './components/Layout/Header';
import TelemetryGauges from './components/Dashboard/TelemetryGauges';
import SystemDiagram from './components/Dashboard/SystemDiagram';
import RealTimeChart from './components/Charts/RealTimeChart';
import FuelSystem3D from './components/Visualization/FuelSystem3D';
import InternalHelicopterView from './components/Visualization/InternalHelicopterView';
import AlertsPanel from './components/Alerts/AlertsPanel';
import FaultPanel from './components/FaultSimulation/FaultPanel';
import PlaybackPanel from './components/Playback/PlaybackPanel';
import ExportPanel from './components/Export/ExportPanel';
import FuelTankSimulation from './components/Simulation/FuelTankSimulation';
import TankStatus from './components/Dashboard/TankStatus';
import SafetyRecommendations from './components/Dashboard/SafetyRecommendations';
import MaintenancePanel from './components/Dashboard/MaintenancePanel';
import { useRealTimeData, useHistoricalData } from './hooks/useRealTimeData';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { data: currentData, isConnected } = useRealTimeData(1000);
  const { data: historicalData } = useHistoricalData(100);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            <TelemetryGauges data={currentData} />
            <SystemDiagram data={currentData} />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TankStatus data={currentData} />
              <SafetyRecommendations data={currentData} />
            </div>
            
            <MaintenancePanel data={currentData} />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RealTimeChart
                data={historicalData}
                parameter="rpm"
                title="Engine RPM"
                color="#10b981"
                unit="RPM"
              />
              <RealTimeChart
                data={historicalData}
                parameter="fuel_pressure"
                title="Fuel Pressure"
                color="#3b82f6"
                unit="Bar"
              />
            </div>
          </div>
        );

      case 'visualization':
        return <FuelSystem3D data={currentData} />;

      case 'internal':
        return (
          <div className="h-full w-full">
            <InternalHelicopterView
              data={currentData}
              onClose={() => setActiveTab('visualization')}
            />
          </div>
        );

      case 'charts':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Real-Time Charts</h2>
              <p className="text-slate-400">Live telemetry data visualization and trends</p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RealTimeChart
                data={historicalData}
                parameter="rpm"
                title="Engine RPM"
                color="#10b981"
                unit="RPM"
              />
              <RealTimeChart
                data={historicalData}
                parameter="fuel_pressure"
                title="Fuel Pressure"
                color="#3b82f6"
                unit="Bar"
              />
              <RealTimeChart
                data={historicalData}
                parameter="fuel_temp"
                title="Fuel Temperature"
                color="#f59e0b"
                unit="°C"
              />
              <RealTimeChart
                data={historicalData}
                parameter="flow_rate"
                title="Flow Rate"
                color="#ef4444"
                unit="L/min"
              />
            </div>
          </div>
        );

      case 'alerts':
        return <AlertsPanel />;

      case 'faults':
        return <FaultPanel />;

      case 'playback':
        return <PlaybackPanel />;

      case 'export':
        return <ExportPanel />;

      case 'simulation':
        return <FuelTankSimulation data={currentData} />;

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      
      <div className="flex-1 flex flex-col">
        <Header 
          isConnected={isConnected}
          hasAnomalies={currentData?.anomaly || false}
          currentData={currentData ? {
            timestamp: currentData.timestamp,
            rpm: currentData.rpm,
            fuel_pressure: currentData.fuel_pressure
          } : null}
        />
        
        <main className="flex-1 p-6 overflow-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

export default App;