import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Shield, User, Phone, Mail, Lock, MapPin, 
  AlertCircle, ArrowRight, CheckCircle, HeartPulse, Sparkles 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { VerifyOtpModal } from '../components/VerifyOtpModal';

export const RegisterPage: React.FC = () => {
  const { t } = useTranslation();
  const { register } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    full_name: '',
    mobile_number: '',
    email: '',
    password: '',
    confirm_password: '',
    village: '',
    district: '',
    emergency_contact_name: '',
    emergency_contact_mobile: '',
  });

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // OTP modal
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [otpEmail, setOtpEmail] = useState('');
  const [devOtp, setDevOtp] = useState<string | undefined>(undefined);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (formData.password !== formData.confirm_password) {
      setError('Passwords do not match.');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const res = await register(formData);
      if (!res.requires_verification && res.access_token) {
        localStorage.setItem('agrishield_token', res.access_token);
        localStorage.setItem('agrishield_refresh_token', res.refresh_token || '');
        localStorage.setItem('agrishield_role', res.role || 'FARMER');
        navigate('/farmer');
      } else {
        setOtpEmail(res.email || formData.email.trim());
        setDevOtp(res.dev_otp);
        setOtpModalOpen(true);
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please verify details.');
    } finally {
      setLoading(false);
    }
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
          to="/login?portal=farmer"
          className="text-xs font-bold text-slate-600 dark:text-emerald-300 hover:text-emerald-600 dark:hover:text-emerald-400"
        >
          Already have an account? Sign In →
        </Link>
      </div>

      {/* Main Form Container */}
      <div className="flex-1 flex items-center justify-center p-4 py-10">
        <div className="w-full max-w-2xl p-6 sm:p-10 rounded-3xl bg-white dark:bg-[#0c1f18] border border-emerald-200/80 dark:border-emerald-800/80 shadow-2xl">
          
          <div className="text-center mb-8">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-600/30 mb-3">
              <Shield className="w-7 h-7" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              Farmer Profile Registration
            </h2>
            <p className="mt-1.5 text-xs sm:text-sm text-slate-500 dark:text-emerald-200/80 max-w-md mx-auto">
              Create your verified identity to link hardware telemetry, fall alerts, and automatic pump cutoff.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Section 1: Personal Details */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Farmer Full Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-emerald-600 dark:text-emerald-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    name="full_name"
                    required
                    value={formData.full_name}
                    onChange={handleChange}
                    placeholder="Suresh Kumar"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-emerald-800/80 bg-slate-50 dark:bg-emerald-950/40 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Mobile Number (10 digits) *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-emerald-600 dark:text-emerald-400 absolute left-3 top-3" />
                  <input
                    type="tel"
                    name="mobile_number"
                    required
                    maxLength={15}
                    value={formData.mobile_number}
                    onChange={handleChange}
                    placeholder="9876543210"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-emerald-800/80 bg-slate-50 dark:bg-emerald-950/40 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Real Email */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Farmer Email Address (OTP will be sent here) *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-emerald-600 dark:text-emerald-400 absolute left-3 top-3" />
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="suresh.farmer@example.com"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-emerald-800/80 bg-slate-50 dark:bg-emerald-950/40 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-emerald-300/60">
                A 6-digit ownership verification code will be sent to this email.
              </p>
            </div>

            {/* Section 3: Passwords */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  AgriShield Password (min 6 chars) *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    name="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-emerald-800/80 bg-slate-50 dark:bg-emerald-950/40 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Confirm Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    name="confirm_password"
                    required
                    value={formData.confirm_password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-emerald-800/80 bg-slate-50 dark:bg-emerald-950/40 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Location */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Village Name *
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    name="village"
                    required
                    value={formData.village}
                    onChange={handleChange}
                    placeholder="Hunsur"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-emerald-800/80 bg-slate-50 dark:bg-emerald-950/40 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  District Name *
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    name="district"
                    required
                    value={formData.district}
                    onChange={handleChange}
                    placeholder="Mysuru"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-emerald-800/80 bg-slate-50 dark:bg-emerald-950/40 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Section 5: Emergency Contacts */}
            <div className="pt-2">
              <div className="flex items-center gap-2 mb-2">
                <HeartPulse className="w-4 h-4 text-rose-500" />
                <span className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                  Emergency Rescue Contact Details
                </span>
              </div>
              <div className="grid sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/60">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Contact Person Name *
                  </label>
                  <input
                    type="text"
                    name="emergency_contact_name"
                    required
                    value={formData.emergency_contact_name}
                    onChange={handleChange}
                    placeholder="Kavitha (Spouse/Family)"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-emerald-800/80 bg-white dark:bg-[#0c1f18] text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Emergency Phone Number *
                  </label>
                  <input
                    type="tel"
                    name="emergency_contact_mobile"
                    required
                    maxLength={15}
                    value={formData.emergency_contact_mobile}
                    onChange={handleChange}
                    placeholder="9876543211"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-emerald-800/80 bg-white dark:bg-[#0c1f18] text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-sm uppercase tracking-wider shadow-xl shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5 active:translate-y-0"
              >
                <span>{loading ? 'Registering Account...' : 'Continue to Email Verification'}</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-emerald-950 text-center">
            <span className="text-xs text-slate-500 dark:text-emerald-300/70">Already registered? </span>
            <Link
              to="/login?portal=farmer"
              className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              Sign In to Farmer Portal
            </Link>
          </div>

        </div>
      </div>

      {/* Footer */}
      <div className="py-4 text-center text-xs text-slate-400 dark:text-emerald-400/50">
        AgriShield Platform &copy; 2026. Secure Farmer Registration & Fall Protection.
      </div>

      {/* OTP Verification Modal */}
      <VerifyOtpModal
        isOpen={otpModalOpen}
        onClose={() => setOtpModalOpen(false)}
        email={otpEmail}
        purpose="REGISTRATION"
        roleHint="FARMER"
        initialDevOtp={devOtp}
      />

    </div>
  );
};
