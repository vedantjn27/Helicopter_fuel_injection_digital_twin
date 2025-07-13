import React, { useState, useEffect } from 'react';
import { AlertTriangle, Clock, Bell, Send, WifiOff, RefreshCw } from 'lucide-react';
import { apiService, AlertData } from '../../services/api';

const AlertsPanel: React.FC = () => {
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const fetchAlerts = async () => {
    try {
      setError(null);
      const response = await apiService.getAlerts(20);
      setAlerts(response.alerts);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
      setError('Unable to connect to the backend server. Please ensure the API server is running on http://localhost:8000');
    } finally {
      setLoading(false);
    }
  };

  const retryConnection = async () => {
    setIsRetrying(true);
    setLoading(true);
    await fetchAlerts();
    setIsRetrying(false);
  };

  const sendAlert = async () => {
    setSending(true);
    try {
      await apiService.sendAlert();
      // Optionally show success message
    } catch (error) {
      console.error('Failed to send alert:', error);
      setError('Failed to send alert. Please check your connection.');
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 5000);
    return () => clearInterval(interval);
  }, []);

  const getSeverityColor = (alert: AlertData) => {
    if (alert.score && alert.score < -0.5) return 'border-red-500 bg-red-500/10';
    if (alert.score && alert.score < -0.2) return 'border-yellow-500 bg-yellow-500/10';
    return 'border-orange-500 bg-orange-500/10';
  };

  const getSeverityIcon = (alert: AlertData) => {
    if (alert.score && alert.score < -0.5) return 'text-red-400';
    if (alert.score && alert.score < -0.2) return 'text-yellow-400';
    return 'text-orange-400';
  };

  if (loading && !error) {
    return (
      <div className="space-y-6">
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-slate-700 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Show connection error state
  if (error && alerts.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Anomaly Alerts</h2>
          <p className="text-slate-400">Real-time system anomaly notifications</p>
        </div>

        <div className="bg-slate-800 rounded-xl p-8 border border-slate-700 text-center">
          <WifiOff className="mx-auto text-slate-500 mb-4" size={64} />
          <h3 className="text-xl font-semibold text-white mb-2">Connection Error</h3>
          <p className="text-slate-400 mb-6 max-w-md mx-auto">{error}</p>
          
          <div className="space-y-4">
            <button
              onClick={retryConnection}
              disabled={isRetrying}
              className="flex items-center gap-2 bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 mx-auto"
            >
              <RefreshCw className={isRetrying ? 'animate-spin' : ''} size={18} />
              {isRetrying ? 'Retrying...' : 'Retry Connection'}
            </button>
            
            <div className="text-sm text-slate-500">
              <p>Make sure your backend server is running:</p>
              <code className="bg-slate-700 px-2 py-1 rounded mt-1 inline-block">
                python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
              </code>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Anomaly Alerts</h2>
          <p className="text-slate-400">Real-time system anomaly notifications</p>
        </div>
        <div className="flex items-center gap-3">
          {error && (
            <button
              onClick={retryConnection}
              disabled={isRetrying}
              className="flex items-center gap-2 bg-slate-600 text-white px-3 py-2 rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={isRetrying ? 'animate-spin' : ''} size={16} />
              Retry
            </button>
          )}
          <button
            onClick={sendAlert}
            disabled={sending || !!error}
            className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
          >
            <Send size={18} />
            {sending ? 'Sending...' : 'Send Latest Alert'}
          </button>
        </div>
      </div>

      {error && alerts.length > 0 && (
        <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2 text-yellow-400">
            <AlertTriangle size={18} />
            <span className="font-medium">Connection Warning</span>
          </div>
          <p className="text-yellow-300 text-sm mt-1">
            Showing cached data. Live updates are currently unavailable.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="text-red-400" size={24} />
            <span className="text-xl font-bold text-white">{alerts.length}</span>
          </div>
          <p className="text-slate-400">Total Anomalies</p>
        </div>

        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="text-yellow-400" size={24} />
            <span className="text-xl font-bold text-white">
              {alerts.length > 0 ? 'Active' : 'None'}
            </span>
          </div>
          <p className="text-slate-400">Recent Activity</p>
        </div>

        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center gap-3 mb-2">
            <Bell className={error ? "text-red-400" : "text-green-400"} size={24} />
            <span className="text-xl font-bold text-white">
              {error ? 'Offline' : 'Enabled'}
            </span>
          </div>
          <p className="text-slate-400">Alert System</p>
        </div>
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700">
        <div className="p-6 border-b border-slate-700">
          <h3 className="text-lg font-semibold text-white">Recent Anomalies</h3>
        </div>
        
        <div className="max-h-96 overflow-y-auto">
          {alerts.length === 0 ? (
            <div className="p-8 text-center">
              <AlertTriangle className="mx-auto text-slate-600 mb-4" size={48} />
              <p className="text-slate-400">No anomalies detected</p>
            </div>
          ) : (
            <div className="space-y-2 p-4">
              {alerts.map((alert) => (
                <div
                  key={alert._id}
                  className={`p-4 rounded-lg border-l-4 ${getSeverityColor(alert)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className={`${getSeverityIcon(alert)}`} size={18} />
                        <span className="font-medium text-white">
                          {alert.probable_cause || 'Anomaly Detected'}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-slate-400">RPM:</span>
                          <span className="ml-2 text-white font-mono">{alert.rpm}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">Pressure:</span>
                          <span className="ml-2 text-white font-mono">{alert.fuel_pressure.toFixed(1)} Bar</span>
                        </div>
                        <div>
                          <span className="text-slate-400">Temp:</span>
                          <span className="ml-2 text-white font-mono">{alert.fuel_temp.toFixed(1)}°C</span>
                        </div>
                        <div>
                          <span className="text-slate-400">Flow:</span>
                          <span className="ml-2 text-white font-mono">{alert.flow_rate.toFixed(1)} L/min</span>
                        </div>
                      </div>
                      
                      {alert.score && (
                        <div className="mt-2">
                          <span className="text-slate-400 text-sm">Anomaly Score:</span>
                          <span className={`ml-2 font-mono text-sm ${getSeverityIcon(alert)}`}>
                            {alert.score.toFixed(4)}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="text-right text-sm text-slate-400">
                      {new Date(alert.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AlertsPanel;