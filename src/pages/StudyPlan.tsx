import { useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, BookOpen, Clock, CheckCircle, Sparkles, Target, Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { studyPlanApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { getDepartment, levelFromYearLabel, getCoursesForDept, dedupeCourses, LEVELS, type LevelNum } from '@/lib/course-data';

interface ExamRow { id: string; date: string; courseCode: string; custom: string }
const newRow = (): ExamRow => ({ id: Math.random().toString(36).slice(2), date: '', courseCode: '', custom: '' });
const OTHER = '__other__';

interface DayPlan {
  day: number;
  date: string;
  subject: string;
  focus: string;
  topics: string[];
  hours: number;
  type: 'study' | 'revision' | 'practice' | 'rest';
}

const typeStyles = {
  study: 'border-l-primary bg-primary/5',
  revision: 'border-l-accent bg-accent/5',
  practice: 'border-l-secondary bg-secondary/5',
  rest: 'border-l-muted-foreground bg-muted/50',
};

const typeLabels = {
  study: '📖 Study', revision: '🔁 Revision', practice: '✍️ Practice', rest: '😴 Rest',
};

export default function StudyPlan() {
  const { user } = useAuth();
  const dept = user ? getDepartment(user.department) : undefined;
  const [level, setLevel] = useState<LevelNum>(user ? levelFromYearLabel(user.year) : 100);
  const courseOptions = dedupeCourses(getCoursesForDept(dept?.id || '', level)).sort((a, b) => a.code.localeCompare(b.code));
  const [exams, setExams] = useState<ExamRow[]>([newRow()]);
  const [plan, setPlan] = useState<DayPlan[]>([]);
  const [planSubject, setPlanSubject] = useState('');
  const [generated, setGenerated] = useState(false);
  const [loading, setLoading] = useState(false);
  const today = new Date().toISOString().split('T')[0];

  const updateRow = (id: string, patch: Partial<ExamRow>) => setExams(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));
  const removeRow = (id: string) => setExams(prev => prev.length > 1 ? prev.filter(r => r.id !== id) : prev);

  const handleGenerate = async () => {
    const payload: { date: string; subject: string; courseCode?: string; topics?: string[] }[] = [];
    for (const [i, r] of exams.entries()) {
      if (!r.date) { toast.error(`Exam ${i + 1}: pick a date`); return; }
      if (new Date(r.date) < new Date(today)) { toast.error(`Exam ${i + 1}: date must be today or later`); return; }
      if (!r.courseCode) { toast.error(`Exam ${i + 1}: choose a course`); return; }
      if (r.courseCode === OTHER) {
        if (!r.custom.trim()) { toast.error(`Exam ${i + 1}: type the course name`); return; }
        payload.push({ date: r.date, subject: r.custom.trim() });
      } else {
        const c = courseOptions.find(c => c.code === r.courseCode);
        if (!c) { toast.error(`Exam ${i + 1}: choose a course`); return; }
        payload.push({ date: r.date, subject: `${c.code} — ${c.title}`, courseCode: c.code, topics: c.topics });
      }
    }
    setLoading(true);
    try {
      const { plan: result } = await studyPlanApi.generate(payload);
      setPlan(result.plan as DayPlan[]);
      setPlanSubject(result.subject);
      setGenerated(true);
      toast.success(`Study plan ready: ${payload.length} exam${payload.length > 1 ? 's' : ''}, ${result.plan.length} sessions`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate plan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <CalendarDays className="h-6 w-6 text-primary" /> Study Plan Generator
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Add all your exams (date + course) and get one reading plan that covers every course</p>
      </div>

      {/* Input Section */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="bg-card/80 backdrop-blur-sm rounded-xl p-5 shadow-card border border-border/50 space-y-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Course level</span>
          <select value={level} onChange={(e) => { setLevel(Number(e.target.value) as LevelNum); setExams(prev => prev.map(r => r.courseCode === OTHER ? r : { ...r, courseCode: '' })); }}
            className="rounded-lg border border-input bg-background px-2 py-1 text-xs text-foreground">
            {LEVELS.map(l => <option key={l} value={l}>{l} Level</option>)}
          </select>
        </div>
        <div className="space-y-3">
          {exams.map((r, idx) => (
            <div key={r.id} className="rounded-xl border border-border/60 bg-background/40 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">Exam {idx + 1}</span>
                {exams.length > 1 && (
                  <button onClick={() => removeRow(r.id)} className="p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition" title="Remove exam">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1 min-w-0">
                  <label className="text-xs text-muted-foreground flex items-center gap-1"><Target className="h-3 w-3" /> Exam date</label>
                  <input type="date" value={r.date} min={today} onChange={(e) => updateRow(r.id, { date: e.target.value })}
                    className="w-full min-w-0 px-3 py-2.5 rounded-xl border border-input bg-background/50 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div className="space-y-1 min-w-0">
                  <label className="text-xs text-muted-foreground flex items-center gap-1"><BookOpen className="h-3 w-3" /> Course</label>
                  <select value={r.courseCode} onChange={(e) => updateRow(r.id, { courseCode: e.target.value })}
                    className="w-full min-w-0 px-3 py-2.5 rounded-xl border border-input bg-background/50 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="">Select course…</option>
                    {courseOptions.map(c => <option key={c.code} value={c.code}>{c.code} — {c.title}</option>)}
                    <option value={OTHER}>Other (type a course name)</option>
                  </select>
                </div>
              </div>
              {r.courseCode === OTHER && (
                <input type="text" value={r.custom} onChange={(e) => updateRow(r.id, { custom: e.target.value })} placeholder="e.g. Data Structures"
                  className="w-full px-3 py-2.5 rounded-xl border border-input bg-background/50 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              )}
            </div>
          ))}
          <button onClick={() => setExams(prev => [...prev, newRow()])}
            className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
            <Plus className="h-4 w-4" /> Add another exam
          </button>
        </div>
        <button onClick={handleGenerate} disabled={loading}
          className="w-full sm:w-auto px-6 py-3 rounded-xl gradient-primary text-primary-foreground font-medium text-sm flex items-center justify-center gap-2 hover:opacity-90 transition shadow-elevated disabled:opacity-60">
          {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating with AI…</> : <><Sparkles className="h-4 w-4" /> Generate Study Plan</>}
        </button>
      </motion.div>

      {/* Plan Output */}
      {generated && plan.length > 0 && (
        <div className="space-y-3">
          <div className="bg-card rounded-xl p-4 shadow-card border border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Generated plan</p>
              <h2 className="text-lg font-bold text-foreground">{exams.length > 1 ? `${exams.length} exams` : (planSubject || 'Study')} study plan</h2>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>{new Set(plan.map(d => d.date)).size} days</span>
              <span>{plan.reduce((sum, day) => sum + Number(day.hours || 0), 0)} study hours</span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-primary" /> Study</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-accent" /> Revision</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-secondary" /> Practice</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-muted-foreground" /> Rest</span>
          </div>
          {plan.map((day, i) => (
            <motion.div key={`${day.date}-${day.subject}-${i}`} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i * 0.03, 0.6) }}
              className={`rounded-xl p-4 shadow-card border-l-4 ${typeStyles[day.type]} flex items-start gap-4`}>
              <div className="text-center min-w-[50px]">
                <p className="text-lg font-bold text-foreground">Day {day.day}</p>
                <p className="text-[10px] text-muted-foreground">{day.date}</p>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-xs font-medium">{typeLabels[day.type]}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{day.subject || planSubject}</span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />{day.hours}h</span>
                </div>
                <p className="text-sm font-semibold text-foreground mb-2">{day.focus || `${day.subject || planSubject} study session`}</p>
                <div className="flex flex-wrap gap-1.5">
                  {day.topics.map((topic, j) => (
                    <span key={j} className="text-xs px-2 py-1 rounded-full bg-background/80 text-foreground border border-border/50">{topic}</span>
                  ))}
                </div>
              </div>
              <button className="p-1 hover:text-secondary transition">
                <CheckCircle className="h-5 w-5 text-muted-foreground/30" />
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {!generated && (
        <div className="text-center py-16">
          <CalendarDays className="h-16 w-16 mx-auto text-muted-foreground/20 mb-4" />
          <p className="text-foreground font-medium">No plan generated yet</p>
          <p className="text-sm text-muted-foreground mt-1">Add your exams above to get started</p>
        </div>
      )}
    </div>
  );
}
