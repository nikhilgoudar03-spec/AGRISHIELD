import { 
  User, Device, LatestTelemetry, SensorReading, CameraImage, 
  FallEvent, PumpStatus, GPSData, EmergencyAlert, UserSettings 
} from '../types';
import { offlineStorage } from './offlineStorage';

const API_BASE_URL = 'http://localhost:8000/api';

class ApiService {
  private getHeaders(): HeadersInit {
    const token = localStorage.getItem('agrishield_token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = { ...this.getHeaders(), ...(options.headers || {}) };

    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ detail: 'Network request failed' }));
      throw new Error(errorData.detail || `Error ${res.status}: ${res.statusText}`);
    }
    return res.json();
  }

  // --- Auth ---
  async login(credentials: { email: string; password: string }) {
    return this.request<{ access_token: string; refresh_token: string; role: string; user_id: number; full_name?: string }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify(credentials) }
    );
  }

  async register(data: any) {
    return this.request<{
      success: boolean;
      requires_verification: boolean;
      message: string;
      email: string;
      role?: string;
      smtp_configured: boolean;
      instructions?: string;
      dev_otp?: string;
      access_token?: string;
      refresh_token?: string;
      user_id?: number;
      full_name?: string;
    }>(
      '/auth/register',
      { method: 'POST', body: JSON.stringify(data) }
    );
  }

  async adminRegister(data: any) {
    return this.request<{
      success: boolean;
      requires_verification: boolean;
      message: string;
      email: string;
      role?: string;
      smtp_configured: boolean;
      instructions?: string;
      dev_otp?: string;
      access_token?: string;
      refresh_token?: string;
      user_id?: number;
      full_name?: string;
    }>(
      '/auth/admin/register',
      { method: 'POST', body: JSON.stringify(data) }
    );
  }

  async verifyOtp(data: { email: string; otp_code: string; purpose?: string }) {
    return this.request<{
      access_token: string;
      refresh_token: string;
      role: string;
      user_id: number;
      full_name?: string;
    }>(
      '/auth/verify-otp',
      { method: 'POST', body: JSON.stringify(data) }
    );
  }

  async resendOtp(data: { email: string; purpose?: string }) {
    return this.request<{
      success: boolean;
      requires_verification: boolean;
      message: string;
      email: string;
      role?: string;
      smtp_configured: boolean;
      instructions?: string;
      dev_otp?: string;
    }>(
      '/auth/resend-otp',
      { method: 'POST', body: JSON.stringify(data) }
    );
  }

  async getEmailStatus() {
    return this.request<{
      smtp_configured: boolean;
      smtp_host?: string;
      smtp_port?: number;
      from_email?: string;
      dev_fallback_active: boolean;
      instructions: string;
    }>('/auth/email-status');
  }

  async getCurrentUser(): Promise<User> {
    return this.request<User>('/auth/me');
  }

  async logout(): Promise<void> {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      localStorage.removeItem('agrishield_token');
      localStorage.removeItem('agrishield_refresh_token');
      localStorage.removeItem('agrishield_user');
    }
  }

  // --- Devices ---
  async getDevices(): Promise<Device[]> {
    try {
      const data = await this.request<Device[]>('/devices');
      offlineStorage.saveTelemetry('devices', data);
      return data;
    } catch (err) {
      const cached = await offlineStorage.getTelemetry('devices');
      if (cached && cached.data) {
        console.log('[AgriShield Offline] Serving cached device fleet list.');
        return cached.data;
      }
      throw err;
    }
  }

  async getDevice(id: number): Promise<Device> {
    try {
      const data = await this.request<Device>(`/devices/${id}`);
      offlineStorage.saveTelemetry(`device_${id}`, data);
      return data;
    } catch (err) {
      const cached = await offlineStorage.getTelemetry(`device_${id}`);
      if (cached && cached.data) return cached.data;
      throw err;
    }
  }

  async registerDevice(data: { device_uid: string; name: string; device_type?: string; api_key: string; farmer_id?: number }): Promise<Device> {
    return this.request<Device>('/devices', { method: 'POST', body: JSON.stringify(data) });
  }

  // --- Telemetry ---
  async getLatestTelemetry(deviceId: number): Promise<LatestTelemetry> {
    try {
      const data = await this.request<LatestTelemetry>(`/telemetry/latest?device_id=${deviceId}`);
      offlineStorage.saveTelemetry(`latest_telemetry_${deviceId}`, data);
      return data;
    } catch (err) {
      const cached = await offlineStorage.getTelemetry(`latest_telemetry_${deviceId}`);
      if (cached && cached.data) {
        console.log('[AgriShield Offline] Serving cached telemetry for device:', deviceId);
        return {
          ...cached.data,
          validity: 'STALE' as any
        };
      }
      throw err;
    }
  }

  async getSensorHistory(deviceId: number, sensorId: string, limit = 50): Promise<SensorReading[]> {
    try {
      const data = await this.request<SensorReading[]>(`/telemetry/history?device_id=${deviceId}&sensor_id=${sensorId}&limit=${limit}`);
      offlineStorage.saveTelemetry(`sensor_history_${deviceId}_${sensorId}`, data);
      return data;
    } catch (err) {
      const cached = await offlineStorage.getTelemetry(`sensor_history_${deviceId}_${sensorId}`);
      if (cached && cached.data) return cached.data;
      throw err;
    }
  }

  // --- Camera ---
  async getLatestCamera(deviceId: number): Promise<{ device_id: number; camera_status: string; image: CameraImage | null; message?: string }> {
    try {
      const data = await this.request<{ device_id: number; camera_status: string; image: CameraImage | null; message?: string }>(`/camera/latest?device_id=${deviceId}`);
      offlineStorage.saveTelemetry(`camera_latest_${deviceId}`, data);
      return data;
    } catch (err) {
      const cached = await offlineStorage.getTelemetry(`camera_latest_${deviceId}`);
      if (cached && cached.data) return cached.data;
      throw err;
    }
  }

  async getCameraHistory(deviceId: number, limit = 20): Promise<CameraImage[]> {
    try {
      const data = await this.request<CameraImage[]>(`/camera/history?device_id=${deviceId}&limit=${limit}`);
      offlineStorage.saveTelemetry(`camera_history_${deviceId}`, data);
      return data;
    } catch (err) {
      const cached = await offlineStorage.getTelemetry(`camera_history_${deviceId}`);
      if (cached && cached.data) return cached.data;
      throw err;
    }
  }

  // --- Pump ---
  async getPumpStatus(deviceId: number): Promise<PumpStatus> {
    try {
      const data = await this.request<PumpStatus>(`/pump/status?device_id=${deviceId}`);
      offlineStorage.saveTelemetry(`pump_status_${deviceId}`, data);
      return data;
    } catch (err) {
      const cached = await offlineStorage.getTelemetry(`pump_status_${deviceId}`);
      if (cached && cached.data) {
        return {
          ...cached.data,
          hardware_connected: false,
          status: 'OFFLINE'
        };
      }
      throw err;
    }
  }

  async getPumpHistory(deviceId: number): Promise<any[]> {
    return this.request<any[]>(`/reports/pump?device_id=${deviceId}&format=json`);
  }

  async sendPumpCommand(deviceId: number, command: 'ON' | 'OFF') {
    if (!navigator.onLine) {
      // Queue action in offline sync queue
      await offlineStorage.queueSyncAction({
        actionType: 'PUMP_COMMAND',
        endpoint: '/pump/command',
        method: 'POST',
        payload: { device_id: deviceId, command },
      });
      throw new Error('Spray pump hardware cutoff is queued in offline sync. Direct hardware activation requires online connection for safety acknowledgment.');
    }
    return this.request<{ status: string; command: string; message: string; current_reported_state: string }>(
      '/pump/command',
      { method: 'POST', body: JSON.stringify({ device_id: deviceId, command }) }
    );
  }

  // --- GPS ---
  async getLatestGPS(deviceId: number): Promise<GPSData> {
    return this.request<GPSData>(`/gps/latest?device_id=${deviceId}`);
  }

  async getGPSHistory(deviceId: number, limit = 50) {
    return this.request<GPSData[]>(`/gps/history?device_id=${deviceId}&limit=${limit}`);
  }

  // --- Emergency Alerts ---
  async getEmergencyAlerts(statusFilter?: string): Promise<EmergencyAlert[]> {
    const query = statusFilter ? `?status_filter=${statusFilter}` : '';
    return this.request<EmergencyAlert[]>(`/emergency${query}`);
  }

  async updateAlertStatus(alertId: number, status: 'NEW' | 'ACKNOWLEDGED' | 'RESOLVED') {
    return this.request(`/emergency/${alertId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  }

  async getActiveFall(deviceId: number): Promise<FallEvent | null> {
    return this.request<FallEvent | null>(`/emergency/fall/active?device_id=${deviceId}`);
  }

  async cancelFall(fallId: number, reason: string) {
    return this.request(`/emergency/fall/${fallId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
  }

  // --- Farmers ---
  async getFarmers(search?: string) {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return this.request<any[]>(`/farmers${query}`);
  }

  async assignDeviceToFarmer(farmerId: number, deviceId: number) {
    return this.request(`/farmers/${farmerId}/assign-device?device_id=${deviceId}`, { method: 'POST' });
  }

  // --- Settings ---
  async getSettings(): Promise<UserSettings> {
    return this.request<UserSettings>('/settings');
  }

  async updateSettings(settings: Partial<UserSettings>): Promise<UserSettings> {
    return this.request<UserSettings>('/settings', { method: 'PUT', body: JSON.stringify(settings) });
  }

  // --- Report Download URLs ---
  getSensorReportUrl(deviceId: number, format: 'csv' | 'pdf'): string {
    const token = localStorage.getItem('agrishield_token');
    return `${API_BASE_URL}/reports/sensors?device_id=${deviceId}&format=${format}&token=${token}`;
  }

  getPumpReportUrl(deviceId: number, format: 'csv' | 'pdf'): string {
    return `${API_BASE_URL}/reports/pump?device_id=${deviceId}&format=${format}`;
  }

  getEmergencyReportUrl(format: 'csv' | 'pdf'): string {
    return `${API_BASE_URL}/reports/emergency?format=${format}`;
  }
}

export const api = new ApiService();
