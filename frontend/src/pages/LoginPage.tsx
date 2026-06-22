import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { authService } from '../services';
import { useAuthStore } from '../store/auth';
import { BookOpen, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const setToken = useAuthStore((state) => state.setToken);
  const setUser = useAuthStore((state) => state.setUser);

  const mutation = useMutation({
    mutationFn: () => authService.login(email, password),
    onSuccess: (response) => {
      const responseData = response.data.data || response.data;
      const { token, user } = responseData;

      if (!token || !user) {
        setError('Invalid server response. Please try again.');
        return;
      }

      setError('');
      setToken(token);
      setUser(user);
      navigate('/dashboard');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error
        || error.response?.data?.message
        || error.message
        || 'Login failed. Please try again.';
      setError(errorMessage);
    },
  });

  return (
    <div className="flex min-h-screen bg-slate-950">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-purple-600 via-purple-700 to-blue-800 flex-col justify-between p-12 relative overflow-hidden">
        {/* Gradient Orbs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" />

        {/* Content */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
              <BookOpen className="w-7 h-7 text-purple-600" />
            </div>
            <span className="text-3xl font-bold text-white">StudyAI</span>
          </div>
          <h1 className="text-5xl font-bold text-white mb-6 leading-tight">
            Learn Smarter, Not Harder
          </h1>
          <p className="text-lg text-purple-100 mb-8 max-w-md">
            AI-powered study companion that helps you master any subject with personalized learning paths and intelligent flashcards.
          </p>
        </div>

        {/* Features */}
        <div className="relative z-10 space-y-4">
          {[
            'AI-generated flashcards',
            'Smart quiz generation',
            'Progress tracking',
            'Exam countdown timers',
          ].map((feature) => (
            <div key={feature} className="flex items-center gap-3 text-purple-100">
              <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-white" />
              </div>
              <span>{feature}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-slate-950">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">Welcome back</h2>
            <p className="text-slate-400">Sign in to your account to continue learning</p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              setError('');
              mutation.mutate();
            }}
            className="space-y-5"
          >
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
              />
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={mutation.isPending}
              className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {mutation.isPending ? 'Signing in...' : 'Sign in'}
              {!mutation.isPending && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <p className="mt-6 text-center text-slate-400">
            Don't have an account?{' '}
            <a href="/register" className="text-purple-400 hover:text-purple-300 font-medium transition-colors">
              Create one
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
