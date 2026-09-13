import React, { useState } from 'react';
import { authService } from '../../services/authService';

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
  const [email, setEmail] = useState('');
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

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-blue-700 flex items-center justify-center">
            <span className="text-white text-2xl font-bold">G</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">GeM Bid Compliance</h1>
          <p className="text-slate-500 mt-2">AI-Powered Procurement Verification Platform</p>
        </div>

        <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="space-y-5">
          {mode === 'register' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Official Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your official email"
              className="w-full px-4 py-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-20"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-blue-600"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">CAPTCHA</label>
            <div className="flex gap-3">
              <div className="flex-1 bg-slate-200 rounded-lg flex items-center justify-center font-bold tracking-widest text-lg select-none">
                {captchaCode}
              </div>
              <button
                type="button"
                onClick={() => { setCaptchaCode(generateCaptcha()); setCaptcha(''); }}
                title="Refresh CAPTCHA"
                className="px-3 rounded-lg border border-slate-300 text-slate-500 hover:bg-slate-50 text-sm"
              >
                ↻
              </button>
              <input
                type="text"
                value={captcha}
                onChange={(e) => setCaptcha(e.target.value)}
                placeholder="Enter CAPTCHA"
                className="w-1/2 px-4 py-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 text-white font-semibold py-3 rounded-lg transition"
          >
            {loading
              ? mode === 'login' ? 'Signing In...' : 'Creating Account...'
              : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm">
          {mode === 'login' ? (
            <button
              type="button"
              onClick={() => { setMode('register'); setError(''); setSuccess(''); }}
              className="text-blue-600 font-medium hover:underline"
            >
              New officer? Register here
            </button>
          ) : (
            <button
              type="button"
              onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
              className="text-blue-600 font-medium hover:underline"
            >
              Already have an account? Sign in
            </button>
          )}
        </div>

        <div className="mt-4 text-center text-sm text-slate-500">
          Authorized Procurement Officers Only
        </div>
      </div>
    </div>
  );
};