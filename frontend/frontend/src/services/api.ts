// API service for communicating with FastAPI backend
const API_BASE_URL = 'http://localhost:8000';

export interface TelemetryData {
  timestamp: string;
  rpm: number;
  throttle: number;
  fuel_pressure: number;
  fuel_temp: number;
  flow_rate: number;
  anomaly?: boolean;
  score?: number;
  probable_cause?: string;
  fault_type?: string;
}

export interface AlertData extends TelemetryData {
  _id: string;
}

class ApiService {
  private async fetchWithRetry(url: string, options?: RequestInit, retries = 3): Promise<Response> {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, options);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response;
      } catch (error) {
        if (i === retries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    throw new Error('Max retries exceeded');
  }

  async getTelemetry(): Promise<TelemetryData> {
    const response = await this.fetchWithRetry(`${API_BASE_URL}/telemetry`);
    return response.json();
  }

  async getTelemetryHistory(limit = 100): Promise<TelemetryData[]> {
    const response = await this.fetchWithRetry(`${API_BASE_URL}/telemetry/history?limit=${limit}`);
    return response.json();
  }

  async predictAnomaly(): Promise<{
    anomaly: boolean;
    score: number;
    probable_cause?: string;
    telemetry: TelemetryData;
  }> {
    const response = await this.fetchWithRetry(`${API_BASE_URL}/predict`, {
      method: 'POST',
    });
    return response.json();
  }

  async getAlerts(limit = 10): Promise<{ count: number; alerts: AlertData[] }> {
    const response = await this.fetchWithRetry(`${API_BASE_URL}/alerts?limit=${limit}`);
    return response.json();
  }

  async simulateFault(faultType: string): Promise<{
    fault_type: string;
    anomaly: boolean;
    score: number;
    telemetry: TelemetryData;
  }> {
    const response = await this.fetchWithRetry(`${API_BASE_URL}/simulate-fault`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: faultType }),
    });
    return response.json();
  }

  async sendAlert(): Promise<{ message: string; alert_data: string }> {
    const response = await this.fetchWithRetry(`${API_BASE_URL}/alert/send`, {
      method: 'POST',
    });
    return response.json();
  }

  async retrainModel(): Promise<{ message: string }> {
    const response = await this.fetchWithRetry(`${API_BASE_URL}/retrain`, {
      method: 'POST',
    });
    return response.json();
  }

  async exportData(format: 'csv' | 'json', startDate?: string, endDate?: string): Promise<Blob | any> {
    let url = `${API_BASE_URL}/telemetry/export?format=${format}`;
    if (startDate) url += `&start_date=${startDate}`;
    if (endDate) url += `&end_date=${endDate}`;
    
    const response = await this.fetchWithRetry(url);
    
    if (format === 'csv') {
      return response.blob();
    } else {
      return response.json();
    }
  }
}

export const apiService = new ApiService();