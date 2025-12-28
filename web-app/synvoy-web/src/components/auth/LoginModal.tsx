'use client'

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToRegister: (email?: string) => void;
}

export default function LoginModal({ isOpen, onClose, onSwitchToRegister }: LoginModalProps) {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isUserNotRegistered, setIsUserNotRegistered] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const { login } = useAuth();

  // Handle visibility for smooth transitions and prevent body scroll
  useEffect(() => {
    let savedScrollY = 0;
    
    if (isOpen) {
      // Save current scroll position
      savedScrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop;
      
      // Lock body scroll and prevent horizontal overflow
      const originalOverflow = document.body.style.overflow;
      const originalOverflowX = document.body.style.overflowX;
      const originalPosition = document.body.style.position;
      const originalTop = document.body.style.top;
      const originalWidth = document.body.style.width;
      
      // Lock scroll position
      document.body.style.position = 'fixed';
      document.body.style.top = `-${savedScrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      document.body.style.overflowX = 'hidden';
      
      // Small delay to trigger animation
      requestAnimationFrame(() => {
        setIsVisible(true);
      });
      
      return () => {
        // Restore body styles first
        document.body.style.position = originalPosition;
        document.body.style.top = originalTop;
        document.body.style.width = originalWidth;
        document.body.style.overflow = originalOverflow;
        document.body.style.overflowX = originalOverflowX;
        
        // Restore scroll position after a brief delay to ensure styles are applied
        requestAnimationFrame(() => {
          window.scrollTo({
            top: savedScrollY,
            behavior: 'auto'
          });
        });
      };
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  // Don't render if not open (for accessibility and performance)
  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsUserNotRegistered(false);
    setLoading(true);

    try {
      await login(usernameOrEmail, password);
      onClose();
      // Redirect will happen automatically via AuthContext
    } catch (err: any) {
      // Check if user is not registered
      if (err.message === 'user_not_registered' || err.message?.includes('user_not_registered')) {
        setIsUserNotRegistered(true);
        setError('');
      } else {
        setError(err.message || 'Login failed. Please try again.');
        setIsUserNotRegistered(false);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Backdrop with fade animation */}
      <div 
        className={`fixed bg-black/60 backdrop-blur-sm transition-opacity duration-300 ease-out z-[49] ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
          onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          height: '100%',
          overflow: 'hidden'
        }}
      />
      
      {/* Modal container - centered in viewport */}
      <div 
        className="fixed z-50 flex items-center justify-center"
        style={{ 
          position: 'fixed', 
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          height: '100vh',
          width: '100%',
          maxWidth: '100vw',
          padding: '1rem',
          pointerEvents: 'none',
          overflow: 'auto',
          boxSizing: 'border-box'
        }}
      >
        {/* Modal with scale and slide animation */}
        <div 
          className={`transform overflow-hidden rounded-3xl bg-white shadow-2xl transition-all duration-400 ease-out w-full max-w-md pointer-events-auto my-auto ${
            isVisible 
              ? 'opacity-100 scale-100 translate-y-0' 
              : 'opacity-0 scale-95 translate-y-4'
          }`}
          style={{
            transition: 'opacity 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
            maxHeight: 'calc(100vh - 2rem)',
            margin: 'auto'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header with gradient */}
          <div className="bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 px-8 py-6 relative">
            <div className="absolute inset-0 bg-black/5"></div>
            <div className="relative flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-white mb-1">Welcome Back</h3>
                <p className="text-blue-100 text-sm">Sign in to continue your journey</p>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-all duration-300 backdrop-blur-sm"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
        </button>
            </div>
        </div>

          {/* Form Content */}
          <div className="px-8 py-8">
            <form onSubmit={handleSubmit} className="space-y-5">
          {isUserNotRegistered && (
                <div className="bg-blue-50 border-l-4 border-blue-500 text-blue-800 px-4 py-4 rounded-lg animate-shake">
                  <div className="flex items-start space-x-3">
                    <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm font-semibold mb-2">Account Not Found</p>
                      <p className="text-sm mb-3">This email address is not registered. Would you like to create an account?</p>
                      <button
                        type="button"
                        onClick={() => {
                          setIsUserNotRegistered(false);
                          onSwitchToRegister(usernameOrEmail);
                        }}
                        className="text-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg transition-colors duration-200"
                      >
                        Create Account
                      </button>
                    </div>
                  </div>
            </div>
          )}
          
          {error && !isUserNotRegistered && (
                <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg flex items-start space-x-2 animate-shake">
                  <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm whitespace-pre-line">{error}</p>
            </div>
          )}

              {/* Email or Username Field */}
          <div>
                <label htmlFor="usernameOrEmail" className="block text-sm font-semibold text-gray-700 mb-2">
                  Email or Username
            </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
            <input
              id="usernameOrEmail"
              type="text"
              value={usernameOrEmail}
              onChange={(e) => setUsernameOrEmail(e.target.value)}
              required
                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 bg-gray-50 focus:bg-white"
              placeholder="Enter your email or username"
            />
                </div>
          </div>

              {/* Password Field */}
          <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
              Password
            </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
            <input
              id="password"
                    type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
                    className="w-full pl-12 pr-12 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 bg-gray-50 focus:bg-white"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? (
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.736m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Remember me & Forgot password */}
              <div className="flex items-center justify-between">
                <label className="flex items-center cursor-pointer group">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2 cursor-pointer" 
                  />
                  <span className="ml-2 text-sm text-gray-600 group-hover:text-gray-900 transition-colors">Remember me</span>
                </label>
                <button
                  type="button"
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                >
                  Forgot password?
                </button>
          </div>

              {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 text-white py-3.5 px-4 rounded-xl hover:from-blue-700 hover:via-cyan-700 hover:to-teal-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-2"
          >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
          </button>
        </form>

            {/* Divider */}
            <div className="mt-6 mb-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500">New to Synvoy?</span>
                </div>
              </div>
            </div>

            {/* Sign up link */}
            <div className="text-center">
              <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <button
                  type="button"
              onClick={() => onSwitchToRegister(usernameOrEmail)}
                  className="font-semibold text-blue-600 hover:text-blue-700 transition-colors duration-300"
            >
                  Create one now
            </button>
          </p>
        </div>
      </div>
    </div>
      </div>
    </>
  );
}

