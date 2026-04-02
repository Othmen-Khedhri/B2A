import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, CheckCircle, AlertCircle, Sun, Moon } from 'lucide-react';
import '../styles/Login.css';
import pic from '../../assets/pic1.jpg';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

const ForgotPassword: React.FC = () => {
  const [email, setEmail]     = useState('');
  const [status, setStatus]   = useState<'idle' | 'success' | 'error' | 'loading'>('idle');
  const [message, setMessage] = useState('');
  const { theme, toggleTheme } = useTheme();

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus('loading');
    try {
      const { data } = await api.post('/auth/forgot-password', { email });
      setStatus('success');
      setMessage(data.message || 'Password reset link has been sent to your email. Please check your inbox.');
    } catch (err: unknown) {
      setStatus('error');
      setMessage(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'An error occurred. Please try again later.'
      );
    }
  };

  const resetForm = () => { setStatus('idle'); setEmail(''); setMessage(''); };

  return (
    <div className="min-h-screen w-full bg-[#F2F2F2] dark:bg-[#0D0D0D] flex items-center justify-center p-6">

      {/* ── Floating card ── */}
      <div
        className="bg-white dark:bg-[#1A1A1D] rounded-3xl shadow-2xl w-full max-w-5xl flex overflow-hidden"
        style={{ minHeight: '78vh' }}
      >

        {/* ══ LEFT — image ══ */}
        <div className="hidden md:block w-1/2 flex-shrink-0 p-5">
          <div className="w-full h-full rounded-2xl overflow-hidden">
            <img src={pic} alt="" className="w-full h-full object-cover object-center" />
          </div>
        </div>

        {/* ══ RIGHT — form panel ══ */}
        <div className="flex-1 flex flex-col justify-between px-12 py-12 min-w-0">

          {/* ── Top content ── */}
          <div className="flex flex-col gap-9">

            {/* Brand row */}
            <div className="flex items-center justify-between">
              <div className="flex items-baseline gap-[3px]">
                <span className="text-[1.15rem] font-black tracking-tight text-gray-900 dark:text-white">B2A</span>
                <span className="text-[1.15rem] font-light tracking-tight text-gray-400 dark:text-gray-500">Platform</span>
              </div>
              <button
                type="button"
                onClick={toggleTheme}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-white/10 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
              </button>
            </div>

            {/* Back link */}
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors group w-fit -mt-4"
            >
              <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
              Back to sign in
            </Link>

            {/* ── Idle / Loading / Error state ── */}
            {(status === 'idle' || status === 'loading' || status === 'error') && (
              <div className="flex flex-col gap-8 -mt-2">

                {/* Heading */}
                <div>
                  <h1 className="text-[2.2rem] font-extrabold tracking-tight leading-none text-gray-900 dark:text-white mb-2">
                    Forgot password?
                  </h1>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    Enter your email and we'll send you a reset link.
                  </p>
                </div>

                {/* Error */}
                {status === 'error' && (
                  <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-sm -mt-2">
                    <AlertCircle size={15} className="shrink-0 mt-0.5" />
                    {message}
                  </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex flex-col gap-8">

                  {/* Email */}
                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="fp-email"
                      className="text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-gray-400"
                    >
                      Email
                    </label>
                    <div className="relative flex items-center">
                      <input
                        id="fp-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="hello@example.com"
                        required
                        disabled={status === 'loading'}
                        className="w-full bg-transparent border-b border-gray-200 dark:border-white/10 focus:border-gray-900 dark:focus:border-white py-2.5 pl-10 pr-4 outline-none text-gray-900 dark:text-white text-sm placeholder:text-gray-300 dark:placeholder:text-gray-600 transition-colors duration-200"
                      />
                      <Mail
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none"
                      />
                    </div>
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={status === 'loading'}
                    className="w-full py-4 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-semibold tracking-wide hover:opacity-80 active:scale-[0.98] transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {status === 'loading' ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin opacity-60" />
                        Sending…
                      </span>
                    ) : 'Send reset link'}
                  </button>

                </form>
              </div>
            )}

            {/* ── Success state ── */}
            {status === 'success' && (
              <div className="flex flex-col gap-6 -mt-2">

                <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                  <CheckCircle size={22} className="text-gray-900 dark:text-white" />
                </div>

                <div>
                  <h1 className="text-[2.2rem] font-extrabold tracking-tight leading-none text-gray-900 dark:text-white mb-2">
                    Check your email
                  </h1>
                  <p className="text-sm text-gray-400 leading-relaxed">{message}</p>
                  <p className="text-xs text-gray-400 mt-1">Didn't receive it? Check your spam folder.</p>
                </div>

                <div className="flex flex-col gap-3 mt-2">
                  <button
                    onClick={resetForm}
                    className="w-full py-4 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-semibold tracking-wide hover:opacity-80 active:scale-[0.98] transition-all duration-150"
                  >
                    Try another email
                  </button>
                  <Link
                    to="/login"
                    className="flex items-center justify-center gap-2 w-full py-3 text-sm text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                  >
                    <ArrowLeft size={14} />
                    Back to sign in
                  </Link>
                </div>

              </div>
            )}

          </div>

          {/* Footer */}
          <p className="text-center text-xs text-gray-400 pt-6">
            © B2A Platform {new Date().getFullYear()}
          </p>

        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
