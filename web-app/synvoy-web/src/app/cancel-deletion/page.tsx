'use client'

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { authAPI } from '@/lib/api';
import Link from 'next/link';

function CancelDeletionContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid cancellation link. No token provided.');
    }
  }, [token]);

  const handleCancelDeletion = async () => {
    if (!token) {
      setError('Invalid cancellation link.');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      await authAPI.cancelDeletion(token);
      setSuccess(true);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/signin');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to cancel account deletion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 flex items-center justify-center px-4 sm:px-6 py-6 sm:py-8 md:py-12">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 px-4 sm:px-6 md:px-8 py-4 sm:py-5 md:py-6 relative">
            <div className="absolute inset-0 bg-black/5"></div>
            <div className="relative">
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-1">Cancel Account Deletion</h3>
              <p className="text-green-100 text-xs sm:text-sm">Restore your Synvoy account</p>
            </div>
          </div>

          {/* Content */}
          <div className="px-4 sm:px-6 md:px-8 py-6 sm:py-7 md:py-8">
            {success ? (
              <div className="space-y-4">
                <div className="bg-green-50 border-l-4 border-green-500 text-green-800 px-4 py-3 rounded-lg">
                  <p className="text-sm font-semibold mb-1">✅ Account Deletion Cancelled</p>
                  <p className="text-sm">
                    Your account deletion has been successfully cancelled. Your account is now active again.
                  </p>
                </div>
                <p className="text-sm text-gray-600 text-center">
                  Redirecting to sign in page...
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {error && (
                  <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg">
                    <p className="text-sm">{error}</p>
                  </div>
                )}

                <div className="bg-blue-50 border-l-4 border-blue-500 text-blue-800 px-4 py-3 rounded-lg">
                  <p className="text-sm font-semibold mb-1">⚠️ Confirm Cancellation</p>
                  <p className="text-sm">
                    Click the button below to cancel your account deletion. Your account will be restored immediately.
                  </p>
                </div>

                <button
                  onClick={handleCancelDeletion}
                  disabled={loading || !token}
                  className="w-full bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 text-white py-3 sm:py-3.5 px-4 rounded-lg sm:rounded-xl hover:from-green-700 hover:via-emerald-700 hover:to-teal-700 transition-all duration-300 font-semibold text-sm sm:text-base shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Cancelling...</span>
                    </>
                  ) : (
                    <>
                      <span>Cancel Account Deletion</span>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </>
                  )}
                </button>

                <div className="text-center">
                  <Link
                    href="/"
                    className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    Back to Home
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CancelDeletionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <CancelDeletionContent />
    </Suspense>
  );
}




