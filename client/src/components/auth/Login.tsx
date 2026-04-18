import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Sun, Moon, Mail, Lock, AlertCircle, Clock } from 'lucide-react';
import '../styles/Login.css';
import pic from '../../assets/pic.png';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';

// ── Simple field-level validation (no extra deps) ──────────────────────────
interface FieldErrors { email?: string; password?: string; }

function validate(email: string, password: string): FieldErrors {
  const errors: FieldErrors = {};
  if (!email.trim()) {
    errors.email = "L'adresse email est requise.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Format d'email invalide.";
  }
  if (!password) {
    errors.password = "Le mot de passe est requis.";
  } else if (password.length < 8) {
    errors.password = "Minimum 8 caractères.";
  }
  return errors;
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p role="alert" className="flex items-center gap-1 text-xs text-red-500 mt-1 font-medium">
      <AlertCircle size={12} className="flex-shrink-0" />
      {msg}
    </p>
  );
}

const Login: React.FC = () => {
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember]         = useState(false);
  const [fieldErrors, setFieldErrors]   = useState<FieldErrors>({});
  const [isLoading, setIsLoading]       = useState(false);
  const [expiredBanner, setExpiredBanner] = useState(false);

  useEffect(() => {
    const reason = sessionStorage.getItem('sessionExpiredReason');
    if (reason === 'inactivity') {
      setExpiredBanner(true);
      sessionStorage.removeItem('sessionExpiredReason');
    }
  }, []);

  const { login }              = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { toast }              = useToast();
  const navigate               = useNavigate();

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const errors = validate(email, password);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setIsLoading(true);
    try {
      await login(email, password);
      toast("Connexion réussie — bienvenue !", "success");
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Identifiants incorrects. Veuillez réessayer.';
      toast(msg, "error");
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
            <img src={pic} alt="" aria-hidden="true" className="w-full h-full object-cover object-center" />
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
                className="touch-target rounded-lg border border-gray-200 dark:border-white/10 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                aria-label={theme === 'dark' ? 'Activer le mode clair' : 'Activer le mode sombre'}
              >
                {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
              </button>
            </div>

            {/* Heading */}
            <div>
              <h1 className="text-[2.2rem] font-extrabold tracking-tight leading-none text-gray-900 dark:text-white mb-2">
                Bienvenue !
              </h1>
              <p className="text-sm text-gray-400">Saisissez vos identifiants pour accéder à la plateforme.</p>
            </div>

            {/* Inactivity expiry banner */}
            {expiredBanner && (
              <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40">
                <Clock size={16} className="shrink-0 mt-0.5 text-amber-500" />
                <p className="text-sm text-amber-700 dark:text-amber-400 font-medium">
                  Session expirée pour cause d'inactivité. Veuillez vous reconnecter.
                </p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>

              {/* Email */}
              <div className="flex flex-col gap-1.5">
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
                    onChange={(e) => { setEmail(e.target.value); if (fieldErrors.email) setFieldErrors(p => ({ ...p, email: undefined })); }}
                    placeholder="hello@example.com"
                    disabled={isLoading}
                    aria-invalid={!!fieldErrors.email}
                    aria-describedby={fieldErrors.email ? "email-error" : undefined}
                    className={`w-full bg-transparent border-b py-2.5 pl-10 pr-4 outline-none font-mono font-medium text-base text-gray-900 dark:text-white placeholder:font-normal placeholder:text-sm placeholder:text-gray-300 dark:placeholder:text-gray-600 transition-colors duration-200 ${fieldErrors.email ? 'border-red-400 dark:border-red-500' : 'border-gray-200 dark:border-white/10 focus:border-gray-900 dark:focus:border-white'}`}
                  />
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none" />
                </div>
                <span id="email-error"><FieldError msg={fieldErrors.email} /></span>
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="login-password"
                  className="text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-gray-400"
                >
                  Mot de passe
                </label>
                <div className="relative flex items-center">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); if (fieldErrors.password) setFieldErrors(p => ({ ...p, password: undefined })); }}
                    placeholder="••••••••"
                    disabled={isLoading}
                    aria-invalid={!!fieldErrors.password}
                    aria-describedby={fieldErrors.password ? "password-error" : undefined}
                    className={`w-full bg-transparent border-b py-2.5 pl-10 pr-12 outline-none font-mono font-medium text-base text-gray-900 dark:text-white placeholder:font-normal placeholder:text-sm placeholder:text-gray-300 dark:placeholder:text-gray-600 transition-colors duration-200 ${fieldErrors.password ? 'border-red-400 dark:border-red-500' : 'border-gray-200 dark:border-white/10 focus:border-gray-900 dark:focus:border-white'}`}
                  />
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <span id="password-error"><FieldError msg={fieldErrors.password} /></span>
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
                  Se souvenir de moi
                </label>
                <Link
                  to="/forgot-password"
                  className="text-sm text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  Mot de passe oublié ?
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
                    Connexion…
                  </span>
                ) : 'Se connecter'}
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
