import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, BookOpen, MessageSquare, User, Library, BarChart3, Bell, Lightbulb, FolderOpen, MoreHorizontal, X, Sparkles, CalendarDays, Trophy, LogOut, CalendarCheck } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { remindersApi } from '@/lib/api';
import { toast } from 'sonner';
import { ThemeToggle } from '@/lib/theme';

const bottomNavItems = [
  { to: '/', icon: LayoutDashboard, label: 'Home' },
  { to: '/materials', icon: BookOpen, label: 'Study' },
  { to: '/chat', icon: MessageSquare, label: 'Chat' },
  { to: '/profile', icon: User, label: 'Profile' },
];

const moreNavItems = [
  { to: '/quizzes', icon: Library, label: 'Quizzes' },
  { to: '/progress', icon: BarChart3, label: 'Progress' },
  { to: '/notes-summarizer', icon: Sparkles, label: 'Summarizer' },
  { to: '/study-plan', icon: CalendarDays, label: 'Study Plan' },
  { to: '/exam-planner', icon: CalendarCheck, label: 'Exam Planner' },
  { to: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
  { to: '/recommendations', icon: Lightbulb, label: 'Recommendations' },
  { to: '/resources', icon: FolderOpen, label: 'Resources' },
  { to: '/reminders', icon: Bell, label: 'Reminders' },
];

const sideNavItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/materials', icon: BookOpen, label: 'Materials' },
  { to: '/chat', icon: MessageSquare, label: 'AI Chat' },
  { to: '/quizzes', icon: Library, label: 'Quizzes' },
  { to: '/progress', icon: BarChart3, label: 'Progress' },
  { to: '/notes-summarizer', icon: Sparkles, label: 'Summarizer' },
  { to: '/study-plan', icon: CalendarDays, label: 'Study Plan' },
  { to: '/exam-planner', icon: CalendarCheck, label: 'Exam Planner' },
  { to: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
  { to: '/recommendations', icon: Lightbulb, label: 'Recommendations' },
  { to: '/resources', icon: FolderOpen, label: 'Resources' },
  { to: '/reminders', icon: Bell, label: 'Reminders' },
  { to: '/profile', icon: User, label: 'Profile' },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const isMoreActive = moreNavItems.some((item) => location.pathname === item.to);
  const firedRef = useRef<Set<string>>(new Set());

  // Persist current path so login can redirect back here
  useEffect(() => {
    localStorage.setItem('studymate_last_path', location.pathname);
  }, [location.pathname]);

  // Alarm sound for reminders
  const playAlarm = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
      oscillator.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(880, ctx.currentTime + 0.2);
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.5);
    } catch { /* audio not supported */ }
  };

  useEffect(() => {
    if (!('Notification' in window)) return;
    
    // Request permission on first load if not decided
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
    
    const checkReminders = async () => {
      if (Notification.permission !== 'granted') return;
      const now = new Date();
      const hhmm = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const dayKey = now.toDateString();
      try {
        const { reminders } = await remindersApi.list();
        reminders.filter(r => r.enabled && r.time === hhmm).forEach(r => {
          const key = `${r.id}-${hhmm}-${dayKey}`;
          if (!firedRef.current.has(key)) {
            firedRef.current.add(key);
            // Play alarm sound
            playAlarm();
            // Show browser notification
            new Notification(`⏰ ${r.title}`, { 
              body: 'Study time! 📚 Click to open Study Mate AI', 
              icon: '/favicon.ico',
              requireInteraction: true 
            });
            // Show in-app toast
            toast.info(`🔔 Reminder: ${r.title}`, { duration: 10000 });
          }
        });
      } catch { /* silent */ }
    };
    
    // Check every 15 seconds for more responsiveness
    const id = setInterval(checkReminders, 15_000);
    checkReminders();
    return () => clearInterval(id);
  }, []);

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-border/50 bg-card/50 backdrop-blur-md fixed inset-y-0 left-0 z-30">
        <div className="p-6 border-b border-border/50">
          <h1 className="text-xl font-bold text-primary flex items-center gap-2">
            <BookOpen className="h-6 w-6" />
            Study Mate AI
          </h1>
          {user && (
            <p className="text-xs text-muted-foreground mt-1 truncate">{user.name} · {user.department}</p>
          )}
        </div>
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          {sideNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'gradient-primary text-primary-foreground shadow-elevated'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                }`
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-border/50 space-y-2">
          <ThemeToggle className="w-full justify-center" />
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all">
            <LogOut className="h-5 w-5" /> Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className={`min-w-0 flex-1 lg:ml-64 ${location.pathname === '/chat' ? 'pb-0' : 'pb-20'} lg:pb-0`}>
        {children}
      </main>

      {/* More menu overlay */}
      {moreOpen && (
        <div className="lg:hidden fixed inset-0 z-50" onClick={() => setMoreOpen(false)}>
          <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" />
          <div
            className="absolute bottom-20 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm bg-card/95 backdrop-blur-md rounded-2xl shadow-float border border-border/50 p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-3 py-2 mb-1">
              <span className="text-sm font-semibold text-foreground">More</span>
              <button onClick={() => setMoreOpen(false)} className="text-muted-foreground hover:text-foreground transition">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1">
              {moreNavItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMoreOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-3 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                    }`
                  }
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              ))}
            </div>
            <div className="mt-1 pt-1 border-t border-border/50 space-y-1">
              <ThemeToggle className="w-full justify-center" />
              <button onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all">
                <LogOut className="h-4 w-4" /> Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-card/95 backdrop-blur-md border-t border-border/50 z-40 safe-bottom">
        <div className="flex items-center justify-around h-16">
          {bottomNavItems.slice(0, 2).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 px-3 py-2 text-xs font-medium transition-all ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
          {/* More button */}
          <button
            onClick={() => setMoreOpen((v) => !v)}
            className={`flex flex-col items-center gap-1 px-3 py-2 text-xs font-medium transition-all ${
              isMoreActive || moreOpen ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <MoreHorizontal className="h-5 w-5" />
            More
          </button>
          {bottomNavItems.slice(2).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 px-3 py-2 text-xs font-medium transition-all ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
