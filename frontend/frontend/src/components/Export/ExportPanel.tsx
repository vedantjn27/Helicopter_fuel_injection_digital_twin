import React, { useState } from 'react';
import { Download, Calendar, FileText, Database } from 'lucide-react';
import { apiService } from '../../services/api';

const ExportPanel: React.FC = () => {
  const [format, setFormat] = useState<'csv' | 'json'>('csv');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const data = await apiService.exportData(format, startDate || undefined, endDate || undefined);
      
      if (format === 'csv') {
        // Handle CSV blob download
        const url = window.URL.createObjectURL(data as Blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `anomalies_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        // Handle JSON download
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `anomalies_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Data Export</h2>
        <p className="text-slate-400">Export anomaly data for analysis and reporting</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Export Configuration */}
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4">Export Settings</h3>
          
          <div className="space-y-4">
            {/* Format Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Export Format
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setFormat('csv')}
                  className={`flex items-center gap-2 p-3 rounded-lg border transition-all ${
                    format === 'csv'
                      ? 'border-orange-500 bg-orange-500/10 text-orange-400'
                      : 'border-slate-600 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  <FileText size={18} />
                  CSV
                </button>
                <button
                  onClick={() => setFormat('json')}
                  className={`flex items-center gap-2 p-3 rounded-lg border transition-all ${
                    format === 'json'
                      ? 'border-orange-500 bg-orange-500/10 text-orange-400'
                      : 'border-slate-600 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  <Database size={18} />
                  JSON
                </button>
              </div>
            </div>

            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Date Range (Optional)
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    max={today}
                    className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm border border-slate-600 focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    max={today}
                    className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm border border-slate-600 focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Quick Date Presets */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Quick Presets
              </label>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => {
                    setStartDate(today);
                    setEndDate(today);
                  }}
                  className="px-3 py-1 text-xs bg-slate-700 text-slate-300 rounded hover:bg-slate-600 transition-colors"
                >
                  Today
                </button>
                <button
                  onClick={() => {
                    setStartDate(lastWeek);
                    setEndDate(today);
                  }}
                  className="px-3 py-1 text-xs bg-slate-700 text-slate-300 rounded hover:bg-slate-600 transition-colors"
                >
                  Last 7 Days
                </button>
                <button
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                  }}
                  className="px-3 py-1 text-xs bg-slate-700 text-slate-300 rounded hover:bg-slate-600 transition-colors"
                >
                  All Time
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={handleExport}
            disabled={exporting}
            className="w-full mt-6 bg-orange-600 text-white py-3 px-4 rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
          >
            <Download size={18} />
            {exporting ? 'Exporting...' : `Export as ${format.toUpperCase()}`}
          </button>
        </div>

        {/* Export Info */}
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4">Export Information</h3>
          
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <FileText className="text-orange-400 mt-1" size={20} />
              <div>
                <h4 className="font-medium text-white">CSV Format</h4>
                <p className="text-sm text-slate-400">
                  Comma-separated values, perfect for Excel and data analysis tools
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Database className="text-blue-400 mt-1" size={20} />
              <div>
                <h4 className="font-medium text-white">JSON Format</h4>
                <p className="text-sm text-slate-400">
                  Machine-readable format for API integration and custom processing
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Calendar className="text-green-400 mt-1" size={20} />
              <div>
                <h4 className="font-medium text-white">Date Filtering</h4>
                <p className="text-sm text-slate-400">
                  Filter exports by date range to focus on specific time periods
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-slate-900/50 rounded-lg">
            <h4 className="font-medium text-white mb-2">Exported Data Includes:</h4>
            <ul className="text-sm text-slate-400 space-y-1">
              <li>• Timestamp of each anomaly</li>
              <li>• All telemetry parameters (RPM, pressure, temperature, flow rate)</li>
              <li>• Anomaly scores and probable causes</li>
              <li>• Fault type information (if simulated)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportPanel;