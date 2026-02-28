import React, { useState } from 'react';
import { ArrowLeft, Mail, CheckCircle, AlertCircle } from 'lucide-react';
import '../styles/login.css';   
import myFile from '../../assets/file.svg';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error' | 'loading'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');

    try {
      // Replace with your actual API endpoint
      const response = await fetch('/api/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage('Password reset link has been sent to your email. Please check your inbox.');
      } else {
        setStatus('error');
        setMessage(data.message || 'This email is not registered in our database.');
      }
    } catch (error) {
      setStatus('error');
      setMessage('An error occurred. Please try again later.');
    }
  };

  const resetForm = () => {
    setStatus('idle');
    setEmail('');
    setMessage('');
  };

  return (
    <>
      {/* Blurred Logo Background */}
      <div className="logo-background">
        <div className="logo-bg-element"></div>
        <div className="logo-bg-element"></div>
        <div className="logo-bg-element"></div>
      </div>

      {/* Main Content */}
      <div className="min-h-screen flex items-center justify-center p-4 relative z-10">
        {/* Forgot Password Card */}
        <div className="login-card rounded-3xl p-10 w-full max-w-md">
          {/* Back Button */}
          <a
            href="/login"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-8 transition-colors group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span>Back to login</span>
          </a>

          {status === 'idle' || status === 'loading' ? (
            <>
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

              {/* Header */}
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Forgot Password?</h2>
                <p className="text-gray-600">
                  Enter your email address and we'll send you a link to reset your password.
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Email Field */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="input-focus w-full px-4 py-3 pl-12 border border-gray-200 rounded-xl outline-none transition-all duration-200 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                      required
                      disabled={status === 'loading'}
                    />
                    <Mail className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2" />
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="w-full bg-gray-900 text-white py-3.5 rounded-xl font-semibold hover:bg-gray-800 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {status === 'loading' ? 'Sending...' : 'Send Reset Link'}
                </button>

                {/* Back to Login Link */}
                <p className="text-center text-sm text-gray-600">
                  Remember your password?{' '}
                  <a href="/login" className="text-gray-900 font-semibold hover:underline">
                    Sign in
                  </a>
                </p>
              </form>
            </>
          ) : status === 'success' ? (
            <>
              {/* Success State */}
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-6">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                
                <h2 className="text-3xl font-bold text-gray-900 mb-3">Check Your Email</h2>
                <p className="text-gray-600 mb-2">
                  {message}
                </p>
                <p className="text-sm text-gray-500 mb-8">
                  Didn't receive the email? Check your spam folder or try again.
                </p>

                <div className="space-y-3">
                  <button
                    onClick={resetForm}
                    className="w-full bg-gray-900 text-white py-3.5 rounded-xl font-semibold hover:bg-gray-800 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
                  >
                    Try Another Email
                  </button>
                  
                  <a
                    href="/login"
                    className="block w-full text-center py-3.5 text-gray-700 font-semibold hover:text-gray-900 transition-colors"
                  >
                    Back to Login
                  </a>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Error State */}
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-6">
                  <AlertCircle className="w-8 h-8 text-red-600" />
                </div>
                
                <h2 className="text-3xl font-bold text-gray-900 mb-3">Email Not Found</h2>
                <p className="text-gray-600 mb-8">
                  {message}
                </p>

                <div className="space-y-3">
                  <button
                    onClick={resetForm}
                    className="w-full bg-gray-900 text-white py-3.5 rounded-xl font-semibold hover:bg-gray-800 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
                  >
                    Try Again
                  </button>
                  
                  <a
                    href="/signup"
                    className="block w-full text-center py-3.5 text-gray-700 font-semibold hover:text-gray-900 transition-colors"
                  >
                    Create an Account
                  </a>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default ForgotPassword;
