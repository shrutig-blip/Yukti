import React, { useState } from 'react';
import { Shield, Eye, EyeOff, RefreshCw, FileCheck2, Building2, ScrollText } from 'lucide-react';
import { authService } from '../../services/authService';
import { DEMO_ACCOUNT_EMAIL, DEMO_ACCOUNT_PASSWORD } from '../../config/demo';

const generateCaptcha = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // avoids confusing chars like 0/O, 1/I
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
};

interface LoginViewProps {
  onLoginSuccess: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState(DEMO_ACCOUNT_EMAIL);
  const [password, setPassword] = useState('');
  const [captcha, setCaptcha] = useState('');
  const [captchaCode, setCaptchaCode] = useState(generateCaptcha());
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password || !captcha) {
      setError('Please fill in all fields.');
      return;
    }
    if (captcha.toUpperCase() !== captchaCode) {
      setError('Invalid CAPTCHA.');
      setCaptchaCode(generateCaptcha());
      setCaptcha('');
      return;
    }

    try {
      setLoading(true);
      await authService.login(email, password);
      onLoginSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
      setCaptchaCode(generateCaptcha());
      setCaptcha('');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name || !email || !password || !captcha) {
      setError('Please fill in all fields.');
      return;
    }
    if (captcha.toUpperCase() !== captchaCode) {
      setError('Invalid CAPTCHA.');
      setCaptchaCode(generateCaptcha());
      setCaptcha('');
      return;
    }

    try {
      setLoading(true);
      await authService.register(name, email, password);
      setSuccess('Account created. You can now sign in.');
      setMode('login');
      setPassword('');
      setCaptcha('');
      setCaptchaCode(generateCaptcha());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
      setCaptchaCode(generateCaptcha());
      setCaptcha('');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCredentials = () => {
    setMode('login');
    setEmail(DEMO_ACCOUNT_EMAIL);
    setPassword(DEMO_ACCOUNT_PASSWORD);
    setError('');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-stretch">
      {/* Left rail — brand + real subject-matter content, not decoration */}
      <div className="hidden lg:flex lg:w-[42%] bg-[#102A43] text-white flex-col justify-between p-10 xl:p-14 relative overflow-hidden">
        <div className="absolute -right-24 -top-24 w-72 h-72 rounded-full bg-teal-800/20" />
        <div className="absolute -left-16 bottom-10 w-56 h-56 rounded-full bg-teal-800/10" />

        <div className="relative">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded bg-white/10 border border-white/20 flex items-center justify-center font-bold text-sm tracking-widest text-teal-300">
              CPCL
            </div>
            <div>
              <div className="text-sm font-semibold text-white leading-tight">
                Chennai Petroleum Corporation Limited
              </div>
              <div className="text-[11px] text-teal-300/90">
                Government of India Enterprise · IndianOil Group
              </div>
            </div>
          </div>

          <div className="mt-16 xl:mt-20">
            <div className="text-[11px] font-mono text-teal-300/80 tracking-wider mb-3">
              PROCURESURE-AI · GeM BID COMPLIANCE
            </div>
            <h1 className="text-3xl xl:text-[34px] font-bold leading-tight tracking-tight text-white max-w-sm">
              Statutory bid verification, without the paperwork chase.
            </h1>
            <p className="text-sm text-slate-300 mt-4 max-w-sm leading-relaxed">
              Sign in to review bidder eligibility, cross-checked automatically against
              statutory portals before your committee meets.
            </p>
          </div>
        </div>

        <div className="relative space-y-3">
          {[
            { icon: FileCheck2, text: 'Udyam, GST, PAN & EPFO cross-verification' },
            { icon: Building2, text: 'Startup India, NSIC & OEM authorization checks' },
            { icon: ScrollText, text: 'Immutable audit trail for every decision' },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center space-x-3 text-sm text-slate-200">
              <div className="w-7 h-7 rounded bg-white/10 flex items-center justify-center shrink-0">
                <Icon className="w-3.5 h-3.5 text-teal-300" />
              </div>
              <span>{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right — the actual sign-in form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-2 lg:hidden">
              <div className="w-9 h-9 rounded bg-[#102A43] flex items-center justify-center font-bold text-xs tracking-widest text-teal-300">
                CPCL
              </div>
              <span className="text-sm font-semibold text-slate-800">GeM Bid Compliance</span>
            </div>
            <div className="hidden lg:flex items-center space-x-1.5 text-xs text-slate-400 font-mono">
              <Shield className="w-3.5 h-3.5" />
              <span>REF: ACCESS/PROC/{new Date().getFullYear()}</span>
            </div>
          </div>

          <div className="mb-7">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              {mode === 'login' ? 'Officer sign in' : 'Register as procurement officer'}
            </h2>
            <p className="text-sm text-slate-500 mt-1.5">
              {mode === 'login'
                ? 'Enter your credentials to access the verification dashboard.'
                : 'Create an account to start reviewing bidder compliance.'}
            </p>
          </div>

          <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-[#0F766E]/40 focus:border-[#0F766E] transition-colors"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-1.5">
                Official Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your official email"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-[#0F766E]/40 focus:border-[#0F766E] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-[#0F766E]/40 focus:border-[#0F766E] pr-10 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-1.5">
                Security Check
              </label>
              <div className="flex gap-2">
                <div className="flex-1 bg-slate-100 border border-slate-200 rounded-md flex items-center justify-center font-mono font-semibold tracking-[0.3em] text-sm text-slate-700 select-none">
                  {captchaCode}
                </div>
                <button
                  type="button"
                  onClick={() => { setCaptchaCode(generateCaptcha()); setCaptcha(''); }}
                  title="Refresh"
                  className="px-3 rounded-md border border-slate-300 text-slate-500 hover:bg-slate-50 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                <input
                  type="text"
                  value={captcha}
                  onChange={(e) => setCaptcha(e.target.value)}
                  placeholder="Enter code"
                  className="w-32 px-3 py-2.5 border border-slate-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-[#0F766E]/40 focus:border-[#0F766E] transition-colors"
                />
              </div>
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3.5 py-2.5 rounded-md text-xs font-medium">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-3.5 py-2.5 rounded-md text-xs font-medium">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0F766E] hover:bg-teal-800 disabled:bg-teal-300 text-white font-semibold py-2.5 rounded-md text-sm transition-colors shadow-xs"
            >
              {loading
                ? mode === 'login' ? 'Signing in…' : 'Creating account…'
                : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          {mode === 'login' && (
            <button
              type="button"
              onClick={fillDemoCredentials}
              className="mt-3 w-full flex items-center justify-center gap-2 border border-dashed border-slate-300 text-slate-600 hover:border-[#0F766E] hover:text-[#0F766E] font-medium py-2.5 rounded-md text-sm transition-colors"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Quick Demo Access</span>
            </button>
          )}

          <div className="mt-6 text-center text-sm">
            {mode === 'login' ? (
              <button
                type="button"
                onClick={() => { setMode('register'); setError(''); setSuccess(''); }}
                className="text-[#0F766E] font-medium hover:underline"
              >
                New officer? Register here
              </button>
            ) : (
              <button
                type="button"
                onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
                className="text-[#0F766E] font-medium hover:underline"
              >
                Already have an account? Sign in
              </button>
            )}
          </div>

          <div className="mt-5 pt-5 border-t border-slate-200 text-center text-xs text-slate-400">
            Authorized Procurement Officers Only
          </div>
        </div>
      </div>
    </div>
  );
};