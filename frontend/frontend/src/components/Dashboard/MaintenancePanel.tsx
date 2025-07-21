import React from 'react';
import { Wrench, Calendar, AlertCircle, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { TelemetryData } from '../../services/api';

interface MaintenanceItem {
  component: string;
  type: 'scheduled' | 'predictive' | 'overdue';
  description: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  hoursRemaining?: number;
  cyclesRemaining?: number;
}

interface MaintenancePanelProps {
  data: TelemetryData | null;
}

const MaintenancePanel: React.FC<MaintenancePanelProps> = ({ data }) => {
  const generateMaintenanceItems = (): MaintenanceItem[] => {
    const items: MaintenanceItem[] = [
      {
        component: 'Fuel Pump',
        type: 'scheduled',
        description: '500-hour inspection and filter replacement',
        dueDate: '2024-02-15',
        priority: 'medium',
        hoursRemaining: 45,
        cyclesRemaining: 120
      },
      {
        component: 'Fuel Injector',
        type: 'predictive',
        description: 'Cleaning and calibration based on performance data',
        dueDate: '2024-02-08',
        priority: 'high',
        hoursRemaining: 12,
        cyclesRemaining: 35
      },
      {
        component: 'Fuel Lines',
        type: 'scheduled',
        description: 'Annual pressure test and inspection',
        dueDate: '2024-03-20',
        priority: 'low',
        hoursRemaining: 180,
        cyclesRemaining: 450
      },
      {
        component: 'Engine Oil',
        type: 'scheduled',
        description: 'Oil change and filter replacement',
        dueDate: '2024-01-28',
        priority: 'critical',
        hoursRemaining: 5,
        cyclesRemaining: 15
      }
    ];

    // Add dynamic maintenance items based on current data
    if (data) {
      if (data.fuel_pressure > 6.5) {
        items.push({
          component: 'Fuel System',
          type: 'predictive',
          description: 'High pressure detected - check for blockages',
          dueDate: '2024-01-25',
          priority: 'high',
          hoursRemaining: 2
        });
      }

      if (data.fuel_temp > 85) {
        items.push({
          component: 'Cooling System',
          type: 'predictive',
          description: 'Elevated fuel temperature - inspect cooling system',
          dueDate: '2024-01-26',
          priority: 'medium',
          hoursRemaining: 8
        });
      }

      if (data.anomaly) {
        items.push({
          component: 'Fuel System',
          type: 'predictive',
          description: 'Anomaly detected - comprehensive system check required',
          dueDate: '2024-01-24',
          priority: 'critical',
          hoursRemaining: 0
        });
      }
    }

    return items.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  };

  const maintenanceItems = generateMaintenanceItems();

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'border-red-500 bg-red-500/10 text-red-400';
      case 'high': return 'border-orange-500 bg-orange-500/10 text-orange-400';
      case 'medium': return 'border-yellow-500 bg-yellow-500/10 text-yellow-400';
      case 'low': return 'border-green-500 bg-green-500/10 text-green-400';
      default: return 'border-gray-500 bg-gray-500/10 text-gray-400';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'scheduled': return Calendar;
      case 'predictive': return TrendingUp;
      case 'overdue': return AlertCircle;
      default: return Wrench;
    }
  };

  const getStatusIcon = (priority: string, hoursRemaining?: number) => {
    if (priority === 'critical' || (hoursRemaining !== undefined && hoursRemaining <= 0)) {
      return AlertCircle;
    }
    if (priority === 'high' || (hoursRemaining !== undefined && hoursRemaining <= 10)) {
      return AlertCircle;
    }
    return CheckCircle;
  };

  const criticalCount = maintenanceItems.filter(item => item.priority === 'critical').length;
  const overdueCount = maintenanceItems.filter(item => item.hoursRemaining !== undefined && item.hoursRemaining <= 0).length;

  return (
    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Wrench className="text-orange-400" size={24} />
          <h3 className="text-xl font-bold text-white">Maintenance Schedule</h3>
        </div>
        <div className="flex items-center gap-4">
          {criticalCount > 0 && (
            <div className="flex items-center gap-1 bg-red-500/20 px-2 py-1 rounded">
              <AlertCircle className="text-red-400" size={16} />
              <span className="text-red-400 text-sm font-medium">{criticalCount} Critical</span>
            </div>
          )}
          {overdueCount > 0 && (
            <div className="flex items-center gap-1 bg-orange-500/20 px-2 py-1 rounded">
              <Clock className="text-orange-400" size={16} />
              <span className="text-orange-400 text-sm font-medium">{overdueCount} Overdue</span>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3 max-h-80 overflow-y-auto">
        {maintenanceItems.map((item, index) => {
          const TypeIcon = getTypeIcon(item.type);
          const StatusIcon = getStatusIcon(item.priority, item.hoursRemaining);
          
          return (
            <div
              key={index}
              className={`p-4 rounded-lg border-l-4 ${getPriorityColor(item.priority)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <TypeIcon className="text-slate-400 mt-1" size={18} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-white">{item.component}</span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        item.type === 'scheduled' ? 'bg-blue-500/20 text-blue-400' :
                        item.type === 'predictive' ? 'bg-purple-500/20 text-purple-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {item.type}
                      </span>
                    </div>
                    <div className="text-sm text-slate-300 mb-2">{item.description}</div>
                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      <div className="flex items-center gap-1">
                        <Calendar size={12} />
                        <span>Due: {item.dueDate}</span>
                      </div>
                      {item.hoursRemaining !== undefined && (
                        <div className="flex items-center gap-1">
                          <Clock size={12} />
                          <span>{item.hoursRemaining}h remaining</span>
                        </div>
                      )}
                      {item.cyclesRemaining !== undefined && (
                        <div className="flex items-center gap-1">
                          <TrendingUp size={12} />
                          <span>{item.cyclesRemaining} cycles</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <StatusIcon 
                  className={
                    item.priority === 'critical' || (item.hoursRemaining !== undefined && item.hoursRemaining <= 0) 
                      ? 'text-red-400' 
                      : item.priority === 'high' || (item.hoursRemaining !== undefined && item.hoursRemaining <= 10)
                      ? 'text-orange-400'
                      : 'text-green-400'
                  } 
                  size={20} 
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-4">
        <div className="bg-slate-900/50 p-3 rounded-lg text-center">
          <div className="text-2xl font-bold text-white">{maintenanceItems.length}</div>
          <div className="text-xs text-slate-400">Total Items</div>
        </div>
        <div className="bg-slate-900/50 p-3 rounded-lg text-center">
          <div className="text-2xl font-bold text-orange-400">{criticalCount + overdueCount}</div>
          <div className="text-xs text-slate-400">Urgent</div>
        </div>
        <div className="bg-slate-900/50 p-3 rounded-lg text-center">
          <div className="text-2xl font-bold text-green-400">
            {maintenanceItems.filter(item => item.priority === 'low').length}
          </div>
          <div className="text-xs text-slate-400">Routine</div>
        </div>
      </div>
    </div>
  );
};

export default MaintenancePanel;