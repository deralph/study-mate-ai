import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Mail, Lock, Eye, EyeOff, ArrowRight, User, GraduationCap, Building, Calendar, KeyRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { authApi } from '@/lib/api';
import { ThemeToggle } from '@/lib/theme';

const DEPARTMENTS = [
  'Computer Science', 'Mathematics', 'Physics', 'Chemistry', 'Biology',
  'Biochemistry', 'Microbiology', 'Economics', 'Accounting', 'Business Administration',
  'English', 'History', 'Political Science', 'Law', 'Education',
  'Engineering', 'Mass Communication', 'Sociology', 'Philosophy',
];

const YEARS = ['100 Level', '200 Level', '300 Level', '400 Level', '500 Level', 'Postgraduate'];

export default function Login() {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [year, setYear] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [showResetPass, setShowResetPass] = useState(false);
  const [remember, setRemember] = useState(false);
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const { login, signup } = useAuth();

  const isRegister = mode === 'register';
  const isForgot = mode === 'forgot';
  const activePassword = isForgot ? resetPassword : password;
  const passwordStrength = activePassword.length === 0 ? 0 : activePassword.length < 6 ? 1 : activePassword.length < 10 ? 2 : 3;
  const strengthLabels = ['', 'Weak', 'Fair', 'Strong'];
  const strengthColors = ['', 'bg-destructive', 'bg-accent', 'bg-secondary'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isForgot) {
        const normalizedEmail = email.includes('@') ? email : `${email}@aaua.edu.ng`;
        const { message } = await authApi.forgotPassword(normalizedEmail, resetPassword);
        toast.success(message);
        setPassword('');
        setResetPassword('');
        setMode('login');
        return;
      }

      if (isRegister) {
        if (!department || !year) { toast.error('Please fill all fields'); return; }
        await signup({
          name,
          email: email.includes('@') ? email : `${email}@aaua.edu.ng`,
          password,
          department,
          year,
          university: 'Adekunle Ajasin University (AAUA)',
        });
        toast.success('Account created! Welcome to Study Mate AI 🎉');
      } else {
        await login(email, password);
        toast.success('Welcome back!');
      }
      const lastPath = localStorage.getItem('studymate_last_path');
      localStorage.removeItem('studymate_last_path');
      navigate(lastPath && lastPath !== '/login' ? lastPath : '/');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = "w-full px-3 py-2.5 rounded-xl border border-input bg-background/50 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring backdrop-blur-sm transition-all";

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
      <div className="fixed right-4 top-4 z-20">
        <ThemeToggle />
      </div>
      {/* Decorative blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-secondary/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-accent/5 blur-3xl" />
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md space-y-6 relative z-10">
        {/* Logo */}
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl gradient-hero flex items-center justify-center mx-auto mb-4 shadow-elevated">
            <BookOpen className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Study Mate AI</h1>
          <p className="text-sm text-muted-foreground mt-1">Your AI-powered study companion · AAUA</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-card/80 backdrop-blur-md rounded-2xl p-6 shadow-elevated border border-border/50 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">{isForgot ? 'Reset Password' : isRegister ? 'Create Account' : 'Welcome Back'}</h2>

          <AnimatePresence mode="wait">
            {isRegister && (
              <motion.div key="register-fields" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-3 overflow-hidden">
                {/* Full Name */}
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Omolara Adeyemi" required
                      className={`${inputClass} pl-10`} />
                  </div>
                </div>

                {/* Department */}
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Department</label>
                  <div className="relative">
                    <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <select value={department} onChange={(e) => setDepartment(e.target.value)} required
                      className={`${inputClass} pl-10 appearance-none`}>
                      <option value="">Select department</option>
                      {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </div>

                {/* Year */}
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Year of Study</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <select value={year} onChange={(e) => setYear(e.target.value)} required
                      className={`${inputClass} pl-10 appearance-none`}>
                      <option value="">Select year</option>
                      {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>

                {/* University - read-only */}
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">University</label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input type="text" value="Adekunle Ajasin University (AAUA)" readOnly
                      className={`${inputClass} pl-10 bg-muted/50 cursor-not-allowed`} />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Email */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@aaua.edu.ng" required
                className={`${inputClass} pl-10`} />
            </div>
          </div>

          {/* Password */}
          {!isForgot && (
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input type={showPass ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required
                  className={`${inputClass} pl-10 pr-10`} />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition">
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {isRegister && password.length > 0 && (
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 flex gap-1">
                    {[1, 2, 3].map((l) => (
                      <div key={l} className={`h-1 flex-1 rounded-full transition-all ${passwordStrength >= l ? strengthColors[passwordStrength] : 'bg-muted'}`} />
                    ))}
                  </div>
                  <span className={`text-xs ${passwordStrength === 3 ? 'text-secondary' : passwordStrength === 2 ? 'text-accent' : 'text-destructive'}`}>
                    {strengthLabels[passwordStrength]}
                  </span>
                </div>
              )}
            </div>
          )}

          {isForgot && (
            <div className="space-y-3 rounded-xl border border-border/60 bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">Enter your account email and choose a new password.</p>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">New Password</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input type={showResetPass ? 'text' : 'password'} value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} placeholder="New password" required minLength={6}
                    className={`${inputClass} pl-10 pr-10`} />
                  <button type="button" onClick={() => setShowResetPass(!showResetPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition">
                    {showResetPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {resetPassword.length > 0 && (
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 flex gap-1">
                      {[1, 2, 3].map((l) => (
                        <div key={l} className={`h-1 flex-1 rounded-full transition-all ${passwordStrength >= l ? strengthColors[passwordStrength] : 'bg-muted'}`} />
                      ))}
                    </div>
                    <span className={`text-xs ${passwordStrength === 3 ? 'text-secondary' : passwordStrength === 2 ? 'text-accent' : 'text-destructive'}`}>
                      {strengthLabels[passwordStrength]}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {!isRegister && !isForgot && (
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)}
                  className="w-4 h-4 rounded border-input text-primary accent-primary" /> Remember me
              </label>
              <button type="button" onClick={() => setMode('forgot')} className="text-xs text-primary font-medium hover:underline">Forgot password?</button>
            </div>
          )}

          <button type="submit" disabled={submitting} className="w-full py-3 rounded-xl gradient-primary text-primary-foreground font-medium text-sm flex items-center justify-center gap-2 hover:opacity-90 transition shadow-elevated disabled:opacity-60 disabled:cursor-not-allowed">
            {submitting ? 'Please wait…' : isForgot ? 'Reset Password' : isRegister ? 'Create Account' : 'Sign In'} {!submitting && <ArrowRight className="h-4 w-4" />}
          </button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border/50" /></div>
            <div className="relative flex justify-center"><span className="bg-card/80 px-3 text-xs text-muted-foreground">or continue with</span></div>
          </div>

          {/* <button type="button" className="w-full py-2.5 rounded-xl border border-border/50 text-sm font-medium text-foreground flex items-center justify-center gap-2 hover:bg-muted/50 transition backdrop-blur-sm">
            <svg className="h-5 w-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Google
          </button> */}
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {isForgot ? 'Remember your password?' : isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button onClick={() => setMode(isForgot || isRegister ? 'login' : 'register')} className="text-primary font-medium hover:underline">
            {isForgot || isRegister ? 'Sign In' : 'Sign Up'}
          </button>
        </p>
      </motion.div>
    </div>
  );
}
