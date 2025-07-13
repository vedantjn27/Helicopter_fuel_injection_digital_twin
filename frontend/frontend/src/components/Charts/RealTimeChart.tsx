import React, { useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { TelemetryData } from '../../services/api';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface RealTimeChartProps {
  data: TelemetryData[];
  parameter: keyof Pick<TelemetryData, 'rpm' | 'fuel_pressure' | 'fuel_temp' | 'flow_rate'>;
  title: string;
  color: string;
  unit: string;
  maxDataPoints?: number;
}

const RealTimeChart: React.FC<RealTimeChartProps> = ({
  data,
  parameter,
  title,
  color,
  unit,
  maxDataPoints = 50
}) => {
  const chartRef = useRef<ChartJS<'line'>>(null);

  // Keep only the most recent data points
  const chartData = data.slice(-maxDataPoints);

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 300,
      easing: 'easeInOutQuart'
    },
    scales: {
      x: {
        display: true,
        grid: {
          color: 'rgba(71, 85, 105, 0.3)',
        },
        ticks: {
          color: '#94a3b8',
          maxTicksLimit: 8,
          callback: function(value, index) {
            if (index % 5 === 0) {
              const timestamp = chartData[value as number]?.timestamp;
              return timestamp ? new Date(timestamp).toLocaleTimeString().slice(0, 5) : '';
            }
            return '';
          }
        }
      },
      y: {
        display: true,
        grid: {
          color: 'rgba(71, 85, 105, 0.3)',
        },
        ticks: {
          color: '#94a3b8',
        }
      }
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        titleColor: '#f1f5f9',
        bodyColor: '#cbd5e1',
        borderColor: color,
        borderWidth: 1,
        callbacks: {
          title: (context) => {
            const timestamp = chartData[context[0].dataIndex]?.timestamp;
            return timestamp ? new Date(timestamp).toLocaleString() : '';
          },
          label: (context) => `${title}: ${context.parsed.y.toFixed(2)} ${unit}`
        }
      }
    },
    elements: {
      point: {
        radius: 2,
        hoverRadius: 6,
      },
      line: {
        borderWidth: 2,
        tension: 0.4,
      }
    }
  };

  const chartDataConfig = {
    labels: chartData.map((_, index) => index.toString()),
    datasets: [
      {
        data: chartData.map(item => item[parameter] as number),
        borderColor: color,
        backgroundColor: `${color}20`,
        fill: true,
        pointBackgroundColor: color,
        pointBorderColor: '#1e293b',
      }
    ]
  };

  return (
    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 h-80">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <div className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span className="text-sm text-slate-400">{unit}</span>
        </div>
      </div>
      <div className="h-64">
        <Line ref={chartRef} data={chartDataConfig} options={options} />
      </div>
    </div>
  );
};

export default RealTimeChart;