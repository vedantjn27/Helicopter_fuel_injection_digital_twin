import React from 'react';
import { 
  Gauge, 
  Activity, 
  AlertTriangle, 
  Settings, 
  Database,
  Layers3,
  PlayCircle,
  Download
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Gauge },
    { id: 'visualization', label: '3D System', icon: Layers3 },
    { id: 'charts', label: 'Real-Time Charts', icon: Activity },
    { id: 'alerts', label: 'Alerts', icon: AlertTriangle },
    { id: 'faults', label: 'Fault Simulation', icon: Settings },
    { id: 'playback', label: 'Playback', icon: PlayCircle },
    { id: 'export', label: 'Export Data', icon: Download },
  ];

  return (
    <div className="w-64 bg-slate-900 border-r border-slate-700 h-full flex flex-col">
      <div className="p-6 border-b border-slate-700">
        <h1 className="text-xl font-bold text-white">Helicopter Fuel</h1>
        <p className="text-slate-400 text-sm">Digital Twin System</p>
      </div>
      
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <button
                  onClick={() => onTabChange(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all duration-200 ${
                    activeTab === item.id
                      ? 'bg-orange-500 text-white shadow-lg'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon size={20} />
                  <span className="font-medium">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
};

export default Sidebar;