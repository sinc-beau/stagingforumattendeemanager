import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogIn, Mail, Lock, Loader2, UserPlus, CheckCircle } from 'lucide-react';
import { signInWithMagicLink, signInWithPassword } from '../services/authService';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [showAccessRequest, setShowAccessRequest] = useState(false);
  const [accessRequestSubmitted, setAccessRequestSubmitted] = useState(false);
  const [accessRequestData, setAccessRequestData] = useState({
    firstName: '',
    lastName: '',
    email: ''
  });

  const from = (location.state as any)?.from?.pathname || '/';

  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate, from]);

  async function handleMagicLinkSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await signInWithMagicLink(email);

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setMagicLinkSent(true);
      setLoading(false);
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await signInWithPassword(email, password);

    if (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  async function handleAccessRequestSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data: existingUser } = await supabase
        .from('users')
        .select('email')
        .eq('email', accessRequestData.email)
        .maybeSingle();

      if (existingUser) {
        setError('An account with this email already exists.');
        setLoading(false);
        return;
      }

      const { error: signUpError } = await supabase.auth.signUp({
        email: accessRequestData.email,
        password: Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12),
        options: {
          data: {
            first_name: accessRequestData.firstName,
            last_name: accessRequestData.lastName,
          }
        }
      });

      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          setError('An account with this email already exists.');
        } else {
          setError(signUpError.message);
        }
        setLoading(false);
      } else {
        setAccessRequestSubmitted(true);
        setLoading(false);
      }
    } catch (err) {
      setError('Failed to submit access request. Please try again.');
      setLoading(false);
    }
  }

  if (accessRequestSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Request Submitted</h2>
            <p className="text-gray-600 mb-6">
              Your access request has been submitted successfully. An administrator will review your request and contact you at <span className="font-medium">{accessRequestData.email}</span>.
            </p>
            <button
              onClick={() => {
                setAccessRequestSubmitted(false);
                setShowAccessRequest(false);
                setAccessRequestData({ firstName: '', lastName: '', email: '' });
              }}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Back to login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (magicLinkSent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h2>
            <p className="text-gray-600 mb-6">
              We've sent a magic link to <span className="font-medium">{email}</span>.
              Click the link in the email to sign in.
            </p>
            <button
              onClick={() => setMagicLinkSent(false)}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Send another link
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showAccessRequest) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="bg-green-600 w-16 h-16 rounded-lg flex items-center justify-center mx-auto mb-4">
              <UserPlus className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Request Access</h1>
            <p className="text-gray-600">Fill in your details to request access to Forum Management</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleAccessRequestSubmit} className="space-y-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                First Name
              </label>
              <input
                id="firstName"
                type="text"
                value={accessRequestData.firstName}
                onChange={(e) => setAccessRequestData({ ...accessRequestData, firstName: e.target.value })}
                required
                placeholder="John"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
              />
            </div>

            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                Last Name
              </label>
              <input
                id="lastName"
                type="text"
                value={accessRequestData.lastName}
                onChange={(e) => setAccessRequestData({ ...accessRequestData, lastName: e.target.value })}
                required
                placeholder="Doe"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
              />
            </div>

            <div>
              <label htmlFor="requestEmail" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="requestEmail"
                  type="email"
                  value={accessRequestData.email}
                  onChange={(e) => setAccessRequestData({ ...accessRequestData, email: e.target.value })}
                  required
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  Submit Request
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setShowAccessRequest(false);
                setError(null);
              }}
              className="text-gray-600 hover:text-gray-900 text-sm"
            >
              Back to login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="bg-blue-600 w-16 h-16 rounded-lg flex items-center justify-center mx-auto mb-4">
            <LogIn className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
          <p className="text-gray-600">Sign in to access Forum Management</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleMagicLinkSubmit} className="space-y-4 mb-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Sending magic link...
              </>
            ) : (
              <>
                <Mail className="w-5 h-5" />
                Send magic link
              </>
            )}
          </button>
        </form>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white text-gray-500">Or for development</span>
          </div>
        </div>

        <button
          onClick={() => setShowPassword(!showPassword)}
          className="w-full text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          {showPassword ? 'Hide' : 'Show'} password login
        </button>

        {showPassword && (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gray-800 hover:bg-gray-900 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5" />
                  Sign in with password
                </>
              )}
            </button>
          </form>
        )}

        <div className="mt-8 text-center border-t border-gray-200 pt-6">
          <p className="text-gray-600 text-sm mb-3">Don't have access?</p>
          <button
            onClick={() => {
              setShowAccessRequest(true);
              setError(null);
            }}
            className="text-green-600 hover:text-green-700 font-medium text-sm flex items-center justify-center gap-2 mx-auto"
          >
            <UserPlus className="w-4 h-4" />
            Request Access
          </button>
        </div>
      </div>
    </div>
  );
}
