import React from 'react';
import { AlertTriangle, Shield, CheckCircle, Clock, Wrench } from 'lucide-react';
import { TelemetryData } from '../../services/api';

interface SafetyRecommendationsProps {
  data: TelemetryData | null;
}

const SafetyRecommendations: React.FC<SafetyRecommendationsProps> = ({ data }) => {
  const generateRecommendations = () => {
    if (!data) return [];

    const recommendations = [];

    // RPM-based recommendations
    if (data.rpm > 5500) {
      recommendations.push({
        type: 'critical',
        icon: AlertTriangle,
        title: 'Engine Over-Speed Warning',
        description: 'Engine RPM exceeds safe operating limits. Reduce throttle immediately.',
        action: 'Immediate throttle reduction required',
        priority: 1
      });
    } else if (data.rpm > 4500) {
      recommendations.push({
        type: 'warning',
        icon: AlertTriangle,
        title: 'High RPM Operation',
        description: 'Engine operating at high RPM. Monitor closely for extended periods.',
        action: 'Consider reducing power if mission allows',
        priority: 2
      });
    }

    // Fuel pressure recommendations
    if (data.fuel_pressure > 7) {
      recommendations.push({
        type: 'critical',
        icon: AlertTriangle,
        title: 'Fuel Pressure Critical',
        description: 'Fuel pressure exceeds maximum safe operating pressure.',
        action: 'Check fuel system for blockages or pump malfunction',
        priority: 1
      });
    } else if (data.fuel_pressure < 2) {
      recommendations.push({
        type: 'critical',
        icon: AlertTriangle,
        title: 'Low Fuel Pressure',
        description: 'Fuel pressure below minimum operating threshold.',
        action: 'Check fuel pump operation and fuel supply',
        priority: 1
      });
    } else if (data.fuel_pressure > 6) {
      recommendations.push({
        type: 'warning',
        icon: AlertTriangle,
        title: 'Elevated Fuel Pressure',
        description: 'Fuel pressure approaching upper operating limits.',
        action: 'Monitor fuel system closely',
        priority: 2
      });
    }

    // Temperature recommendations
    if (data.fuel_temp > 100) {
      recommendations.push({
        type: 'critical',
        icon: AlertTriangle,
        title: 'Fuel Temperature Critical',
        description: 'Fuel temperature exceeds safe operating limits.',
        action: 'Reduce engine load and check cooling systems',
        priority: 1
      });
    } else if (data.fuel_temp > 80) {
      recommendations.push({
        type: 'warning',
        icon: AlertTriangle,
        title: 'High Fuel Temperature',
        description: 'Fuel temperature elevated. Monitor cooling systems.',
        action: 'Check engine cooling and reduce load if possible',
        priority: 2
      });
    }

    // Flow rate recommendations
    if (data.flow_rate > 14) {
      recommendations.push({
        type: 'warning',
        icon: AlertTriangle,
        title: 'High Fuel Consumption',
        description: 'Fuel flow rate higher than normal operating range.',
        action: 'Check for fuel leaks and optimize flight profile',
        priority: 2
      });
    } else if (data.flow_rate < 1 && data.rpm > 1000) {
      recommendations.push({
        type: 'critical',
        icon: AlertTriangle,
        title: 'Fuel Flow Anomaly',
        description: 'Low fuel flow despite engine operation.',
        action: 'Check fuel injector and fuel lines immediately',
        priority: 1
      });
    }

    // Anomaly-based recommendations
    if (data.anomaly) {
      recommendations.push({
        type: 'critical',
        icon: Shield,
        title: 'System Anomaly Detected',
        description: data.probable_cause || 'Anomalous behavior detected in fuel system.',
        action: 'Perform immediate system diagnostics and consider precautionary landing',
        priority: 1
      });
    }

    // General safety recommendations
    if (data.rpm > 3000 && data.fuel_temp > 70) {
      recommendations.push({
        type: 'info',
        icon: CheckCircle,
        title: 'Normal High-Power Operation',
        description: 'System operating within normal parameters for high-power flight.',
        action: 'Continue monitoring all parameters',
        priority: 3
      });
    }

    return recommendations.sort((a, b) => a.priority - b.priority);
  };

  const recommendations = generateRecommendations();

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'critical': return 'border-red-500 bg-red-500/10 text-red-400';
      case 'warning': return 'border-yellow-500 bg-yellow-500/10 text-yellow-400';
      case 'info': return 'border-blue-500 bg-blue-500/10 text-blue-400';
      default: return 'border-gray-500 bg-gray-500/10 text-gray-400';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'critical': return 'text-red-400';
      case 'warning': return 'text-yellow-400';
      case 'info': return 'text-blue-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
      <div className="flex items-center gap-3 mb-4">
        <Shield className="text-blue-400" size={24} />
        <h3 className="text-xl font-bold text-white">Safety Recommendations</h3>
      </div>

      {recommendations.length === 0 ? (
        <div className="text-center py-8">
          <CheckCircle className="mx-auto text-green-400 mb-4" size={48} />
          <p className="text-green-400 font-medium">All Systems Normal</p>
          <p className="text-slate-400 text-sm mt-2">No safety recommendations at this time</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {recommendations.map((rec, index) => {
            const Icon = rec.icon;
            return (
              <div
                key={index}
                className={`p-4 rounded-lg border-l-4 ${getTypeColor(rec.type)}`}
              >
                <div className="flex items-start gap-3">
                  <Icon className={getTypeIcon(rec.type)} size={20} />
                  <div className="flex-1">
                    <div className="font-medium text-white mb-1">{rec.title}</div>
                    <div className="text-sm text-slate-300 mb-2">{rec.description}</div>
                    <div className="text-xs text-slate-400 bg-slate-900/50 p-2 rounded">
                      <strong>Action:</strong> {rec.action}
                    </div>
                  </div>
                  <div className={`text-xs px-2 py-1 rounded ${
                    rec.priority === 1 ? 'bg-red-500/20 text-red-400' :
                    rec.priority === 2 ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-blue-500/20 text-blue-400'
                  }`}>
                    P{rec.priority}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4 p-3 bg-slate-900/50 rounded-lg">
        <div className="flex items-center gap-2 text-slate-400 text-xs">
          <Clock size={14} />
          <span>Last updated: {data ? new Date(data.timestamp).toLocaleTimeString() : '--:--:--'}</span>
        </div>
      </div>
    </div>
  );
};

export default SafetyRecommendations;