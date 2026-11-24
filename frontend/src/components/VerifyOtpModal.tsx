import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  ShieldCheck, Mail, ArrowRight, AlertCircle, RefreshCw, 
  Info, CheckCircle, X, KeyRound, Server 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

interface VerifyOtpModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
  purpose?: string;
  roleHint?: string;
  initialDevOtp?: string;
  onSuccess?: () => void;
}

export const VerifyOtpModal: React.FC<VerifyOtpModalProps> = ({
  isOpen,
  onClose,
  email,
  purpose = 'REGISTRATION',
  roleHint = 'FARMER',
  initialDevOtp,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const { verifyOtp } = useAuth();
  const navigate = useNavigate();

  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);
  const [devOtp, setDevOtp] = useState<string | null>(initialDevOtp || null);
  const [emailStatus, setEmailStatus] = useState<{
    smtp_configured: boolean;
    instructions?: string;
    smtp_host?: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      api.getEmailStatus()
        .then((res) => setEmailStatus(res))
        .catch(() => setEmailStatus({ smtp_configured: false }));
    }
  }, [isOpen]);

  useEffect(() => {
    if (initialDevOtp) {
      setDevOtp(initialDevOtp);
    }
  }, [initialDevOtp]);

  if (!isOpen) return null;

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.trim().length < 4) {
      setError('Please enter a valid verification code.');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const res = await verifyOtp({
        email,
        otp_code: otpCode.trim(),
        purpose,
      });

      if (onSuccess) {
        onSuccess();
      } else {
        onClose();
        if (res.role === 'ADMIN') {
          navigate('/admin');
        } else {
          navigate('/farmer');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please check the code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError(null);
    setResending(true);
    setResendSuccess(null);

    try {
      const res = await api.resendOtp({ email, purpose });
      setResendSuccess(res.message || 'A fresh verification code was sent.');
      if (res.dev_otp) {
        setDevOtp(res.dev_otp);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to resend verification code.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative w-full max-w-md p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#0c1f18] border border-emerald-200/80 dark:border-emerald-800/80 shadow-2xl animate-in zoom-in-95 duration-200">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-emerald-950 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-600/30 mb-3">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white">
            Email Verification Required
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-emerald-200/80">
            A single-use verification code was dispatched to:
          </p>
          <div className="mt-1 font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 py-1 px-3 rounded-lg inline-block border border-emerald-200 dark:border-emerald-800">
            {email}
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Resend Success Notification */}
        {resendSuccess && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0 text-emerald-500" />
            <span>{resendSuccess}</span>
          </div>
        )}

        {/* Verification Form */}
        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 text-center">
              Enter 6-Digit Verification Code
            </label>
            <div className="relative max-w-[260px] mx-auto">
              <KeyRound className="w-5 h-5 text-emerald-600 dark:text-emerald-400 absolute left-3.5 top-3" />
              <input
                type="text"
                maxLength={6}
                required
                autoFocus
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="123456"
                className="w-full pl-11 pr-4 py-2.5 rounded-2xl border-2 border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/40 text-slate-900 dark:text-white text-center font-mono text-2xl font-black tracking-[6px] focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-sm shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5"
          >
            <span>{loading ? 'Verifying Ownership...' : 'Verify & Enter Dashboard'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Real SMTP vs Local Setup Guidance */}
        <div className="mt-5 p-3.5 rounded-2xl border text-xs leading-relaxed bg-slate-50 dark:bg-emerald-950/40 border-slate-200 dark:border-emerald-800/60">
          {emailStatus?.smtp_configured ? (
            <div className="text-emerald-700 dark:text-emerald-300 flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
              <span>Real SMTP active via <strong>{emailStatus.smtp_host}</strong>. Check your inbox and spam folder.</span>
            </div>
          ) : (
            <div>
              <div className="flex items-start gap-2 text-amber-800 dark:text-amber-300 font-semibold mb-1">
                <Server className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <span>SMTP Email Provider Notice:</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-emerald-200/70">
                To send live emails to inboxes, set <code>SMTP_HOST</code>, <code>SMTP_PORT</code>, <code>SMTP_USER</code>, and <code>SMTP_PASSWORD</code> in <code>backend/.env</code>.
              </p>
              {devOtp && (
                <div className="mt-2 p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-amber-900 dark:text-amber-200">Local Review Code:</span>
                  <button
                    type="button"
                    onClick={() => setOtpCode(devOtp)}
                    className="font-mono text-xs font-black text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded bg-white dark:bg-darkbg-card border border-emerald-300 dark:border-emerald-700 hover:scale-105 transition-transform"
                    title="Click to auto-fill"
                  >
                    {devOtp} (Click to Fill)
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Resend Action */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-emerald-950 text-center flex items-center justify-between text-xs">
          <span className="text-slate-500 dark:text-emerald-300/70">Didn't receive code?</span>
          <button
            type="button"
            disabled={resending}
            onClick={handleResend}
            className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
            <span>{resending ? 'Sending...' : 'Resend Code'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
