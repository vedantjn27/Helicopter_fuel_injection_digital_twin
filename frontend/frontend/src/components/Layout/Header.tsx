import React from 'react';
import { Wifi, WifiOff, AlertCircle } from 'lucide-react';

interface HeaderProps {
  isConnected: boolean;
  hasAnomalies: boolean;
  currentData?: {
    timestamp: string;
    rpm: number;
    fuel_pressure: number;
  } | null;
}

const Header: React.FC<HeaderProps> = ({ isConnected, hasAnomalies, currentData }) => {
  return (
    <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {isConnected ? (
              <Wifi className="text-green-400" size={20} />
            ) : (
              <WifiOff className="text-red-400" size={20} />
            )}
            <span className={`text-sm font-medium ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          
          {hasAnomalies && (
            <div className="flex items-center gap-2 bg-red-500/20 px-3 py-1 rounded-full">
              <AlertCircle className="text-red-400" size={16} />
              <span className="text-red-400 text-sm font-medium">Anomaly Detected</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-6">
          {currentData && (
            <>
              <div className="text-right">
                <div className="text-xs text-slate-400">RPM</div>
                <div className="text-lg font-bold text-white">{currentData.rpm.toLocaleString()}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-400">Pressure</div>
                <div className="text-lg font-bold text-white">{currentData.fuel_pressure.toFixed(1)} Bar</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-400">Updated</div>
                <div className="text-sm text-slate-300">
                  {new Date(currentData.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;