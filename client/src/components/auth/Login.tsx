import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import '../styles/login.css';   
import myFile from '../../assets/file.svg';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Login submitted:', { email, password, rememberMe });
  };

  return (
    <>
      {/* Main Content */}
      <div className="min-h-screen flex items-center justify-center p-4 relative z-10">
        {/* Login Card */}
        <div className="login-card rounded-3xl p-10 w-full max-w-md">
          {/* Logo and Brand */}
          <div className="flex items-center gap-3 mb-8">
            <div className="relative">
              <img 
                src={myFile} 
                alt="B2A Logo" 
                className="w-12 h-12 object-contain drop-shadow-lg"
              />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">B2A</h1>
          </div>

          {/* Sign In Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Sign in</h2>
            <p className="text-gray-600">Enter your credentials to continue</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="input-focus w-full px-4 py-3 border border-gray-200 rounded-xl outline-none transition-all duration-200 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                required
              />
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••"
                  className="input-focus w-full px-4 py-3 border border-gray-200 rounded-xl outline-none transition-all duration-200 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center">
              <input 
                type="checkbox"
                id="remember"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900 cursor-pointer"
              />
              <label htmlFor="remember" className="ml-2 text-sm text-gray-700 cursor-pointer">
                Remember me
              </label>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              className="w-full bg-gray-900 text-white py-3.5 rounded-xl font-semibold hover:bg-gray-800 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
            >
              Sign in
            </button>

            {/* Forgot Password */}
            <div className="text-center">
              <Link to="/forgot-password" className="text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors">
                Forgot your password?
              </Link>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default Login;