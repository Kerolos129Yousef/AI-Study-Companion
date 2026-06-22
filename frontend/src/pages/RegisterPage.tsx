import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { authService } from '../services';
import { useAuthStore } from '../store/auth';
import { BookOpen, ArrowRight } from 'lucide-react';
import { validateRegisterForm, RegisterFormValues } from '../utils/validation';

type FieldErrors = Partial<Record<keyof RegisterFormValues, string>>;

const inputBase =
  'w-full px-4 py-3 bg-slate-900 border rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-1 transition-colors';
const inputNormal = `${inputBase} border-slate-700 focus:border-purple-500 focus:ring-purple-500`;
const inputError = `${inputBase} border-red-500 focus:border-red-500 focus:ring-red-500`;

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState('');

  const navigate = useNavigate();
  const setToken = useAuthStore((state) => state.setToken);
  const setUser = useAuthStore((state) => state.setUser);

  const mutation = useMutation({
    mutationFn: (values: RegisterFormValues) =>
      authService.register(values.email, values.password, values.name),
    onSuccess: (response) => {
      const responseData = response.data.data || response.data;
      const { token, user } = responseData;

      if (!token || !user) {
        setServerError('Invalid server response. Please try again.');
        return;
      }

      setToken(token);
      setUser(user);
      navigate('/dashboard');
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        'Registration failed. Please try again.';
      setServerError(message);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError('');

    const result = validateRegisterForm({ name, email, password });
    if (!result.valid) {
      setFieldErrors(result.errors);
      return;
    }

    setFieldErrors({});
    mutation.mutate(result.sanitized);
  }

  return (
    <div className="flex min-h-screen bg-slate-950">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-purple-700 to-purple-800 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
              <BookOpen className="w-7 h-7 text-purple-600" />
            </div>
            <span className="text-3xl font-bold text-white">StudyAI</span>
          </div>
          <h1 className="text-5xl font-bold text-white mb-6 leading-tight">
            Start Your Learning Journey
          </h1>
          <p className="text-lg text-blue-100 mb-8 max-w-md">
            Join thousands of students using AI to study smarter and achieve better grades.
          </p>
        </div>

        <div className="relative z-10 space-y-4">
          {[
            'Free to get started',
            'No credit card required',
            'Instant AI-powered tools',
            'Join our community',
          ].map((feature) => (
            <div key={feature} className="flex items-center gap-3 text-blue-100">
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
            <h2 className="text-3xl font-bold text-white mb-2">Create your account</h2>
            <p className="text-slate-400">Join StudyAI and start learning smarter today</p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: undefined }));
                }}
                placeholder="John Doe"
                className={fieldErrors.name ? inputError : inputNormal}
                aria-invalid={!!fieldErrors.name}
                aria-describedby={fieldErrors.name ? 'name-error' : undefined}
              />
              {fieldErrors.name && (
                <p id="name-error" className="mt-1.5 text-sm text-red-400">
                  {fieldErrors.name}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
                }}
                placeholder="you@example.com"
                className={fieldErrors.email ? inputError : inputNormal}
                aria-invalid={!!fieldErrors.email}
                aria-describedby={fieldErrors.email ? 'email-error' : undefined}
              />
              {fieldErrors.email && (
                <p id="email-error" className="mt-1.5 text-sm text-red-400">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password)
                    setFieldErrors((prev) => ({ ...prev, password: undefined }));
                }}
                placeholder="••••••••"
                className={fieldErrors.password ? inputError : inputNormal}
                aria-invalid={!!fieldErrors.password}
                aria-describedby={
                  fieldErrors.password ? 'password-error' : 'password-hint'
                }
              />
              {fieldErrors.password ? (
                <p id="password-error" className="mt-1.5 text-sm text-red-400">
                  {fieldErrors.password}
                </p>
              ) : (
                <p id="password-hint" className="mt-1.5 text-xs text-slate-500">
                  Min. 8 characters with uppercase, lowercase, and a number.
                </p>
              )}
            </div>

            {serverError && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-sm text-red-400">{serverError}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={mutation.isPending}
              className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {mutation.isPending ? 'Creating account...' : 'Create account'}
              {!mutation.isPending && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <p className="mt-6 text-center text-slate-400">
            Already have an account?{' '}
            <a
              href="/login"
              className="text-purple-400 hover:text-purple-300 font-medium transition-colors"
            >
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
