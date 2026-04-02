import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Sun, Moon, Mail, Lock } from 'lucide-react';
import '../styles/Login.css';
import pic from '../../assets/pic.png';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const Login: React.FC = () => {
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember]         = useState(false);
  const [error, setError]               = useState('');
  const [isLoading, setIsLoading]       = useState(false);

  const { login }              = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate               = useNavigate();

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Login failed. Please check your credentials.'
      );
    } finally {
      setIsLoading(false);
    }
  };

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

            {/* Brand row — no logo image, just styled text + theme toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-baseline gap-[3px]">
                <span className="text-[1.15rem] font-black tracking-tight text-gray-900 dark:text-white">
                  B2A
                </span>
                <span className="text-[1.15rem] font-light tracking-tight text-gray-400 dark:text-gray-500">
                  Platform
                </span>
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

            {/* Heading */}
            <div>
              <h1 className="text-[2.2rem] font-extrabold tracking-tight leading-none text-gray-900 dark:text-white mb-2">
                Welcome Back!
              </h1>
              <p className="text-sm text-gray-400">Enter Your Details Below</p>
            </div>

            {/* Error */}
            {error && (
              <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-8">

              {/* Email */}
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="login-email"
                  className="text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-gray-400"
                >
                  Email
                </label>
                <div className="relative flex items-center">
                  <input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="hello@example.com"
                    required
                    disabled={isLoading}
                    className="w-full bg-transparent border-b border-gray-200 dark:border-white/10 focus:border-gray-900 dark:focus:border-white py-2.5 pl-10 pr-12 outline-none font-mono font-medium text-base text-gray-900 dark:text-white placeholder:font-normal placeholder:text-sm placeholder:text-gray-300 dark:placeholder:text-gray-600 transition-colors duration-200"
                  />
                  <Mail
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:scale-105 transition-transform duration-200 pointer-events-none"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="login-password"
                  className="text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-gray-400"
                >
                  Password
                </label>
                <div className="relative flex items-center">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    disabled={isLoading}
                    className="w-full bg-transparent border-b border-gray-200 dark:border-white/10 focus:border-gray-900 dark:focus:border-white py-2.5 pl-10 pr-12 outline-none font-mono font-medium text-base text-gray-900 dark:text-white placeholder:font-normal placeholder:text-sm placeholder:text-gray-300 dark:placeholder:text-gray-600 transition-colors duration-200"
                  />
                  <Lock
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:scale-105 transition-transform duration-200 pointer-events-none"
                  />
                  {/* Eye toggle */}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white hover:scale-105 transition-all duration-200"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Remember me + Forgot password */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2.5 text-sm text-gray-500 dark:text-gray-400 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="w-4 h-4 accent-gray-900 dark:accent-white cursor-pointer"
                  />
                  Remember me
                </label>
                <Link
                  to="/forgot-password"
                  className="text-sm text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  Forgot password?
                </Link>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-semibold tracking-wide hover:opacity-80 active:scale-[0.98] transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin opacity-60" />
                    Signing in…
                  </span>
                ) : 'Log in'}
              </button>

            </form>
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

export default Login;

