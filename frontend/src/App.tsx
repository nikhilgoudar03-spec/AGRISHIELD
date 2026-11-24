import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { WebSocketProvider } from './context/WebSocketContext';
import './i18n';

import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { SettingsPage } from './pages/SettingsPage';

// Admin Pages
import { AdminOverview } from './pages/admin/AdminOverview';
import { FarmerManagement } from './pages/admin/FarmerManagement';
import { DeviceManagement } from './pages/admin/DeviceManagement';

// Farmer Pages
import { FarmerOverview } from './pages/farmer/FarmerOverview';
import { LiveSensors } from './pages/farmer/LiveSensors';
import { CameraMonitoring } from './pages/farmer/CameraMonitoring';
import { FallDetectionPage } from './pages/farmer/FallDetectionPage';
import { PumpControlPage } from './pages/farmer/PumpControlPage';
import { GPSTrackingPage } from './pages/farmer/GPSTrackingPage';
import { EmergencyAlertsPage } from './pages/farmer/EmergencyAlertsPage';
import { HistoryReportsPage } from './pages/farmer/HistoryReportsPage';
import { ProfilePage } from './pages/farmer/ProfilePage';

// Authenticated Layout wrapper
const DashboardLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-darkbg-base flex items-center justify-center">
        <div className="text-xs font-bold text-slate-500 animate-pulse">Loading AgriShield Session...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-darkbg-base text-slate-900 dark:text-slate-100 flex flex-col transition-colors">
      <Navbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { role, isLoading, isAuthenticated } = useAuth();
  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (role !== 'ADMIN') return <Navigate to="/farmer" replace />;
  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <WebSocketProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Protected Farmer Routes */}
              <Route path="/farmer" element={<DashboardLayout />}>
                <Route index element={<FarmerOverview />} />
                <Route path="sensors" element={<LiveSensors />} />
                <Route path="camera" element={<CameraMonitoring />} />
                <Route path="safety" element={<FallDetectionPage />} />
                <Route path="pump" element={<PumpControlPage />} />
                <Route path="gps" element={<GPSTrackingPage />} />
                <Route path="alerts" element={<EmergencyAlertsPage />} />
                <Route path="history" element={<HistoryReportsPage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>

              {/* Protected Admin Routes */}
              <Route
                path="/admin"
                element={
                  <AdminRoute>
                    <DashboardLayout />
                  </AdminRoute>
                }
              >
                <Route index element={<AdminOverview />} />
                <Route path="farmers" element={<FarmerManagement />} />
                <Route path="devices" element={<DeviceManagement />} />
                <Route path="sensors" element={<LiveSensors />} />
                <Route path="camera" element={<CameraMonitoring />} />
                <Route path="fall-detection" element={<FallDetectionPage />} />
                <Route path="gps" element={<GPSTrackingPage />} />
                <Route path="pump" element={<PumpControlPage />} />
                <Route path="alerts" element={<EmergencyAlertsPage />} />
                <Route path="reports" element={<HistoryReportsPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </WebSocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
