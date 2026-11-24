import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Shield, ShieldCheck, UserCheck, Eye, EyeOff, Lock, Mail, 
  AlertCircle, ArrowRight, CheckCircle, Server, UserPlus 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { VerifyOtpModal } from '../components/VerifyOtpModal';
import { api } from '../services/api';

export const LoginPage: React.FC = () => {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Mode: 'farmer' or 'admin'
  const initialPortal = searchParams.get('portal') === 'admin' ? 'admin' : 'farmer';
  const [portal, setPortal] = useState<'farmer' | 'admin'>(initialPortal);

  useEffect(() => {
    const p = searchParams.get('portal');
    if (p === 'admin') setPortal('admin');
    else if (p === 'farmer') setPortal('farmer');
  }, [searchParams]);

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // OTP Modal state for unverified accounts
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [otpEmail, setOtpEmail] = useState('');
  const [otpDevCode, setOtpDevCode] = useState<string | undefined>(undefined);

  // Admin Onboarding Modal state
  const [adminOnboardingOpen, setAdminOnboardingOpen] = useState(false);
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('');
  const [adminOnboardingError, setAdminOnboardingError] = useState<string | null>(null);
  const [adminOnboardingLoading, setAdminOnboardingLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login({ email: email.trim(), password });
      
      const savedRole = localStorage.getItem('agrishield_role');
      if (savedRole === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate('/farmer');
      }
    } catch (err: any) {
      // Check if error contains unverified email information
      try {
        const parsed = JSON.parse(err.message);
        if (parsed.code === 'EMAIL_NOT_VERIFIED') {
          setOtpEmail(parsed.email || email.trim());
          setOtpDevCode(parsed.dev_otp);
          setOtpModalOpen(true);
          return;
        }
      } catch (_) {
        // Not JSON formatted error, show normal message
      }
      setError(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminOnboardingError(null);

    if (adminPassword !== adminConfirmPassword) {
      setAdminOnboardingError('Passwords do not match.');
      return;
    }
    if (adminPassword.length < 8) {
      setAdminOnboardingError('Password must be at least 8 characters.');
      return;
    }

    setAdminOnboardingLoading(true);
    try {
      const res = await api.adminRegister({
        full_name: adminName.trim(),
        email: adminEmail.trim(),
        password: adminPassword,
        confirm_password: adminConfirmPassword,
      });

      setAdminOnboardingOpen(false);
      if (!res.requires_verification && res.access_token) {
        localStorage.setItem('agrishield_token', res.access_token);
        localStorage.setItem('agrishield_refresh_token', res.refresh_token || '');
        localStorage.setItem('agrishield_role', res.role || 'ADMIN');
        navigate('/admin');
      } else {
        setOtpEmail(res.email);
        setOtpDevCode(res.dev_otp);
        setOtpModalOpen(true);
      }
    } catch (err: any) {
      setAdminOnboardingError(err.message || 'Administrator registration failed.');
    } finally {
      setAdminOnboardingLoading(false);
    }
  };

  const fillAdminCredentials = () => {
    setEmail('admin@agrishield.io');
    setPassword('Admin@AgriShield2026');
  };

  const fillFarmerCredentials = () => {
    setEmail('ramesh.farmer@agrishield.io');
    setPassword('Farmer@Safe2026');
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#F7FBF9] dark:bg-[#07130F] transition-colors duration-300">
      
      {/* Top Banner Navigation */}
      <div className="p-4 sm:px-8 border-b border-emerald-900/10 dark:border-emerald-500/20 bg-white/70 dark:bg-[#07130F]/70 backdrop-blur-md flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md">
            <Shield className="w-5 h-5 stroke-[2.2]" />
          </div>
          <span className="text-xl font-black text-slate-900 dark:text-white">
            AGRI<span className="text-emerald-600 dark:text-emerald-400">SHIELD</span>
          </span>
        </Link>
        <Link
          to="/"
          className="text-xs font-bold text-slate-600 dark:text-emerald-300 hover:text-emerald-600 dark:hover:text-emerald-400"
        >
          ← Return to Website
        </Link>
      </div>

      {/* Main Authentication Container */}
      <div className="flex-1 flex items-center justify-center p-4 py-12">
        <div className="w-full max-w-md p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#0c1f18] border border-emerald-200/80 dark:border-emerald-800/80 shadow-2xl">
          
          {/* Portal Switcher Tabs */}
          <div className="grid grid-cols-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-emerald-950/60 border border-slate-200 dark:border-emerald-800/60 mb-6">
            <button
              type="button"
              onClick={() => {
                setPortal('farmer');
                setError(null);
              }}
              className={`py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                portal === 'farmer'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-emerald-300 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>FARMER PORTAL</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setPortal('admin');
                setError(null);
              }}
              className={`py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                portal === 'admin'
                  ? 'bg-slate-900 dark:bg-emerald-900 text-white shadow-md'
                  : 'text-slate-600 dark:text-emerald-300 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>ADMIN PORTAL</span>
            </button>
          </div>

          {/* Portal Header */}
          <div className="text-center mb-6">
            <div className={`w-14 h-14 mx-auto rounded-2xl flex items-center justify-center text-white shadow-lg mb-3 ${
              portal === 'admin'
                ? 'bg-gradient-to-tr from-slate-800 via-slate-900 to-emerald-900 shadow-slate-900/30'
                : 'bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-emerald-600/30'
            }`}>
              {portal === 'admin' ? <ShieldCheck className="w-8 h-8" /> : <UserCheck className="w-8 h-8" />}
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">
              {portal === 'admin' ? 'Administrator Authentication' : 'Farmer & Field Operator Login'}
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-emerald-200/80">
              {portal === 'admin'
                ? 'Secure administrative management of IoT devices, telemetry, and farmer safety'
                : 'Sign in to access your live sensor monitoring, pump relay, and emergency alarms'}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {portal === 'admin' ? 'Admin Email Address *' : 'Registered Farmer Email *'}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-emerald-600 dark:text-emerald-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={portal === 'admin' ? 'admin@agrishield.io' : 'farmer@example.com'}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-emerald-800/80 bg-slate-50 dark:bg-emerald-950/40 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  AgriShield Application Password *
                </label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400 absolute left-3.5 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-emerald-800/80 bg-slate-50 dark:bg-emerald-950/40 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3.5 rounded-2xl text-white font-black text-xs uppercase tracking-wider shadow-lg transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5 active:translate-y-0 ${
                portal === 'admin'
                  ? 'bg-slate-900 hover:bg-slate-800 dark:bg-emerald-900 dark:hover:bg-emerald-800 shadow-slate-900/25'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-600/25'
              }`}
            >
              <span>{loading ? 'Authenticating...' : `Sign in to ${portal === 'admin' ? 'Admin' : 'Farmer'} Portal`}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Fill Credentials for Review */}
          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-emerald-950">
            <div className="text-[11px] font-semibold text-slate-400 mb-2 flex items-center justify-between">
              <span>Quick Login Credentials:</span>
              <span className="text-[10px] text-emerald-600 font-bold uppercase">Pre-Seeded</span>
            </div>
            {portal === 'admin' ? (
              <button
                type="button"
                onClick={fillAdminCredentials}
                className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-emerald-800 bg-slate-50 dark:bg-emerald-950/40 text-xs font-mono text-slate-700 dark:text-emerald-300 hover:bg-slate-100 text-left flex items-center justify-between"
              >
                <span>admin@agrishield.io</span>
                <span className="text-[10px] font-bold text-emerald-600 uppercase">Fill Admin</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={fillFarmerCredentials}
                className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-emerald-800 bg-slate-50 dark:bg-emerald-950/40 text-xs font-mono text-slate-700 dark:text-emerald-300 hover:bg-slate-100 text-left flex items-center justify-between"
              >
                <span>ramesh.farmer@agrishield.io</span>
                <span className="text-[10px] font-bold text-emerald-600 uppercase">Fill Farmer</span>
              </button>
            )}
          </div>

          {/* Secondary Actions */}
          <div className="mt-5 text-center space-y-2">
            {portal === 'farmer' ? (
              <div>
                <span className="text-xs text-slate-500 dark:text-emerald-300/70">New farmer? </span>
                <Link
                  to="/register"
                  className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  Create Farmer Safety Profile
                </Link>
              </div>
            ) : (
              <div>
                <button
                  type="button"
                  onClick={() => setAdminOnboardingOpen(true)}
                  className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center justify-center gap-1.5 mx-auto"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Onboard New Administrator Account</span>
                </button>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Footer */}
      <div className="py-4 text-center text-xs text-slate-400 dark:text-emerald-400/50">
        AgriShield Platform &copy; 2026. Secure Email Authentication & Role Verification.
      </div>

      {/* OTP Verification Modal */}
      <VerifyOtpModal
        isOpen={otpModalOpen}
        onClose={() => setOtpModalOpen(false)}
        email={otpEmail}
        purpose={portal === 'admin' ? 'ADMIN_SETUP' : 'REGISTRATION'}
        roleHint={portal.toUpperCase()}
        initialDevOtp={otpDevCode}
      />

      {/* Admin Onboarding Modal */}
      {adminOnboardingOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#0c1f18] border border-emerald-200/80 dark:border-emerald-800/80 shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-900 dark:bg-emerald-900 text-white flex items-center justify-center shadow-md mb-3">
                <ShieldCheck className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">
                Admin Onboarding
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-emerald-200/80">
                Register an actual administrator email with OTP verification.
              </p>
            </div>

            {adminOnboardingError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{adminOnboardingError}</span>
              </div>
            )}

            <form onSubmit={handleAdminOnboarding} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Administrator Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  placeholder="Dr. Rajesh Nayak"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-emerald-800/80 bg-slate-50 dark:bg-emerald-950/40 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Actual Admin Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="rajesh.nayak@agri-safety.org"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-emerald-800/80 bg-slate-50 dark:bg-emerald-950/40 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Password (8+ chars) *
                  </label>
                  <input
                    type="password"
                    required
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-emerald-800/80 bg-slate-50 dark:bg-emerald-950/40 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={adminConfirmPassword}
                    onChange={(e) => setAdminConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-emerald-800/80 bg-slate-50 dark:bg-emerald-950/40 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setAdminOnboardingOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-emerald-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adminOnboardingLoading}
                  className="flex-1 py-2.5 rounded-xl bg-slate-900 dark:bg-emerald-900 text-white text-xs font-bold shadow-md hover:bg-slate-800"
                >
                  {adminOnboardingLoading ? 'Sending OTP...' : 'Send OTP & Verify'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
