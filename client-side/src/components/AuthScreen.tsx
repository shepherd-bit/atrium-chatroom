import { useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAuthErrorMessage } from '../lib/pocketbase';

type Mode = 'login' | 'register';

const inputClasses =
  'w-full h-10 px-3.5 rounded-[12px] bg-white border border-[#EAEAEA] text-[13px] text-[#0A0A0A] placeholder:text-[#71717A] focus:outline-none focus:border-[#0A0A0A] focus:ring-1 focus:ring-[#0A0A0A] transition-all';

const labelClasses = 'block text-[11px] font-semibold tracking-widest uppercase text-[#71717A] mb-1.5';

export const AuthScreen = () => {
  const { login, register } = useAuth();

  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'register') {
      if (!name.trim()) {
        setError('Please enter your name.');
        return;
      }
      if (password.length < 8) {
        setError('Password must be at least 8 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (mode === 'login') {
        await login(email.trim(), password);
      } else {
        await register({ name: name.trim(), email: email.trim(), password });
      }
      // Success: AuthContext flips `user`, which swaps this screen out.
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-[#FCFCFD] px-4">
      <div className="w-full max-w-[380px]">
        {/* Brand */}
        <div className="flex items-center gap-2.5 mb-8 justify-center">
          <div className="w-8 h-8 rounded-[12px] bg-[#0A0A0A] flex items-center justify-center shadow-sm">
            <div className="w-2.5 h-2.5 rounded-full bg-white" />
          </div>
          <span className="text-[15px] font-semibold tracking-tight">Atrium</span>
        </div>

        <div className="bg-white border border-[#EAEAEA] rounded-[16px] p-6 shadow-sm">
          <h1 className="text-[18px] font-semibold text-center">
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="text-[13px] text-[#71717A] text-center mt-1 mb-6">
            {mode === 'login'
              ? 'Sign in to continue to your workspace.'
              : 'Join your team on Atrium.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {mode === 'register' && (
              <div>
                <label htmlFor="auth-name" className={labelClasses}>
                  Name
                </label>
                <input
                  id="auth-name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Rivera"
                  className={inputClasses}
                  required
                />
              </div>
            )}

            <div>
              <label htmlFor="auth-email" className={labelClasses}>
                Email
              </label>
              <input
                id="auth-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className={inputClasses}
                required
              />
            </div>

            <div>
              <label htmlFor="auth-password" className={labelClasses}>
                Password
              </label>
              <input
                id="auth-password"
                type="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={inputClasses}
                required
              />
            </div>

            {mode === 'register' && (
              <div>
                <label htmlFor="auth-confirm-password" className={labelClasses}>
                  Confirm password
                </label>
                <input
                  id="auth-confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className={inputClasses}
                  required
                />
              </div>
            )}

            {error && (
              <div className="px-3 py-2.5 rounded-[12px] bg-[#FEF2F2] border border-[#FECACA] text-[12px] text-[#B91C1C]">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-10 rounded-[12px] bg-[#0A0A0A] text-white text-[13px] font-medium hover:bg-[#27272A] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting && (
                <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              )}
              {mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>
        </div>

        <p className="text-[13px] text-[#71717A] text-center mt-5">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
            className="text-[#0A0A0A] font-medium hover:underline"
          >
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default AuthScreen;
