import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, Square, AlertTriangle } from 'lucide-react';
import { useHistoricalData } from '../../hooks/useRealTimeData';
import { TelemetryData } from '../../services/api';
import TelemetryGauges from '../Dashboard/TelemetryGauges';
import SystemDiagram from '../Dashboard/SystemDiagram';

const PlaybackPanel: React.FC = () => {
  const { data: historicalData, loading } = useHistoricalData(500);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [currentData, setCurrentData] = useState<TelemetryData | null>(null);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (historicalData.length > 0 && currentIndex < historicalData.length) {
      setCurrentData(historicalData[currentIndex]);
    }
  }, [historicalData, currentIndex]);

  useEffect(() => {
    if (isPlaying && historicalData.length > 0) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex(prev => {
          if (prev >= historicalData.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1000 / playbackSpeed);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, playbackSpeed, historicalData.length]);

  const handlePlay = () => {
    if (currentIndex >= historicalData.length - 1) {
      setCurrentIndex(0);
    }
    setIsPlaying(true);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleStop = () => {
    setIsPlaying(false);
    setCurrentIndex(0);
  };

  const handleSkipBack = () => {
    setCurrentIndex(prev => Math.max(0, prev - 10));
  };

  const handleSkipForward = () => {
    setCurrentIndex(prev => Math.min(historicalData.length - 1, prev + 10));
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newIndex = parseInt(e.target.value);
    setCurrentIndex(newIndex);
  };

  const formatTime = (index: number) => {
    if (!historicalData[index]) return '--:--:--';
    return new Date(historicalData[index].timestamp).toLocaleTimeString();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading historical data...</p>
        </div>
      </div>
    );
  }

  if (historicalData.length === 0) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <Play className="mx-auto text-slate-600 mb-4" size={48} />
          <p className="text-slate-400">No historical data available for playback</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Historical Playback</h2>
        <p className="text-slate-400">Review past telemetry data and system behavior</p>
      </div>

      {/* Playback Controls */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={handleSkipBack}
              className="p-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
            >
              <SkipBack size={20} />
            </button>
            
            {isPlaying ? (
              <button
                onClick={handlePause}
                className="p-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                <Pause size={24} />
              </button>
            ) : (
              <button
                onClick={handlePlay}
                className="p-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                <Play size={24} />
              </button>
            )}
            
            <button
              onClick={handleStop}
              className="p-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
            >
              <Square size={20} />
            </button>
            
            <button
              onClick={handleSkipForward}
              className="p-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
            >
              <SkipForward size={20} />
            </button>
          </div>

          <div className="flex items-center gap-4">
            <label className="text-sm text-slate-400">Speed:</label>
            <select
              value={playbackSpeed}
              onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
              className="bg-slate-700 text-white rounded px-3 py-1 text-sm"
            >
              <option value={0.5}>0.5x</option>
              <option value={1}>1x</option>
              <option value={2}>2x</option>
              <option value={5}>5x</option>
              <option value={10}>10x</option>
            </select>
          </div>
        </div>

        {/* Timeline Slider */}
        <div className="space-y-4">
          <input
            type="range"
            min="0"
            max={historicalData.length - 1}
            value={currentIndex}
            onChange={handleSliderChange}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
          />
          
          <div className="flex justify-between text-sm text-slate-400">
            <span>{formatTime(0)}</span>
            <span>
              {currentIndex + 1} / {historicalData.length} - {formatTime(currentIndex)}
            </span>
            <span>{formatTime(historicalData.length - 1)}</span>
          </div>
        </div>
      </div>

      {/* Current Data Display */}
      {currentData && (
        <div className="space-y-6">
          <TelemetryGauges data={currentData} />
          <SystemDiagram data={currentData} />
          
          {currentData.anomaly && (
            <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4">
              <div className="flex items-center gap-2 text-red-400 mb-2">
                <AlertTriangle size={20} />
                <span className="font-medium">Anomaly Detected in Historical Data</span>
              </div>
              {currentData.probable_cause && (
                <p className="text-red-300 text-sm">{currentData.probable_cause}</p>
              )}
              <div className="text-red-400 text-sm mt-2">
                Anomaly Score: {currentData.score?.toFixed(4)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PlaybackPanel;