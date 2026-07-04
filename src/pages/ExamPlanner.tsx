import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarCheck, Plus, Trash2, Sparkles, Clock, BookOpen, AlertTriangle, Flame, Gauge,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { getDepartment, levelFromYearLabel, searchCourses, type LevelNum } from '@/lib/course-data';

interface ExamItem {
  id: string;
  code: string;
  title: string;
  examDate: string; // ISO yyyy-mm-dd
  difficulty: number; // 1 (easy) - 5 (very hard)
  coverage: number; // 0-100, % of syllabus already covered
}

interface DayTask {
  code: string;
  title: string;
  minutes: number;
  reason: string;
}

interface DayPlan {
  date: string;
  dayLabel: string;
  daysToExamOf?: string;
  tasks: DayTask[];
}

const STORAGE_PREFIX = 'studymate_exam_items_';
const HOURS_PREFIX = 'studymate_daily_hours_';

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function daysBetween(a: string, b: string) {
  const ms = new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime();
  return Math.round(ms / 86400000);
}

/**
 * Priority score: higher = study this course sooner / more.
 * Weighs how close the exam is, how hard the student rated it, and how much
 * syllabus is still uncovered — so a hard, soon, poorly-covered course always
 * floats to the top, while an easy course far away with good coverage sinks.
 */
function priorityScore(item: ExamItem, from: string) {
  const days = Math.max(0, daysBetween(from, item.examDate));
  const urgency = 1 / (1 + days); // approaches 1 as exam nears, ~0 far away
  const difficultyNorm = item.difficulty / 5;
  const remaining = (100 - item.coverage) / 100;
  const score = urgency * 45 + difficultyNorm * 30 + remaining * 25;
  return { score: Math.round(score * 10) / 10, days, urgency, difficultyNorm, remaining };
}

function levelOfUrgency(days: number) {
  if (days <= 2) return { label: 'Critical', color: 'text-destructive', bg: 'bg-destructive/10' };
  if (days <= 5) return { label: 'High', color: 'text-accent', bg: 'bg-accent/10' };
  if (days <= 10) return { label: 'Moderate', color: 'text-secondary', bg: 'bg-secondary/10' };
  return { label: 'Low', color: 'text-muted-foreground', bg: 'bg-muted' };
}

export default function ExamPlanner() {
  const { user } = useAuth();
  const dept = user ? getDepartment(user.department) : undefined;
  const [level, setLevel] = useState<LevelNum>(user ? levelFromYearLabel(user.year) : 100);
  const storageKey = STORAGE_PREFIX + (user?.id || 'guest');
  const hoursKey = HOURS_PREFIX + (user?.id || 'guest');

  const [items, setItems] = useState<ExamItem[]>(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || '[]'); } catch { return []; }
  });
  const [dailyHours, setDailyHours] = useState<number>(() => {
    const v = Number(localStorage.getItem(hoursKey));
    return v > 0 ? v : 4;
  });

  const [showAdd, setShowAdd] = useState(false);
  const [codeQuery, setCodeQuery] = useState('');
  const [examDate, setExamDate] = useState('');
  const [difficulty, setDifficulty] = useState(3);
  const [coverage, setCoverage] = useState(0);

  useEffect(() => { localStorage.setItem(storageKey, JSON.stringify(items)); }, [items, storageKey]);
  useEffect(() => { localStorage.setItem(hoursKey, String(dailyHours)); }, [dailyHours, hoursKey]);

  const courseMatches = codeQuery.trim() ? searchCourses(codeQuery, dept?.id, level).slice(0, 6) : [];

  const addItem = (code: string, title: string) => {
    if (!examDate) { toast.error('Pick an exam date first'); return; }
    if (items.some(i => i.code === code)) { toast.error('That course is already in your plan'); return; }
    setItems(prev => [...prev, { id: `${Date.now()}`, code, title, examDate, difficulty, coverage }]);
    toast.success(`${code} added to your exam plan`);
    setCodeQuery(''); setExamDate(''); setDifficulty(3); setCoverage(0); setShowAdd(false);
  };

  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));

  const today = todayISO();
  const upcoming = useMemo(
    () => items.filter(i => i.examDate >= today).sort((a, b) => a.examDate.localeCompare(b.examDate)),
    [items, today]
  );

  const ranked = useMemo(
    () => upcoming
      .map(i => ({ item: i, ...priorityScore(i, today) }))
      .sort((a, b) => b.score - a.score),
    [upcoming, today]
  );

  // ─── Build a realistic day-by-day plan from today to the last exam ──────
  const plan: DayPlan[] = useMemo(() => {
    if (upcoming.length === 0) return [];
    const lastExam = upcoming.reduce((max, i) => (i.examDate > max ? i.examDate : max), upcoming[0].examDate);
    const totalDays = Math.max(1, daysBetween(today, lastExam) + 1);
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const days: DayPlan[] = [];

    for (let d = 0; d < totalDays; d++) {
      const date = new Date(today + 'T00:00:00');
      date.setDate(date.getDate() + d);
      const dateISO = date.toISOString().split('T')[0];

      // Courses whose exam hasn't happened yet as of this day
      const active = upcoming.filter(i => i.examDate >= dateISO);
      if (active.length === 0) { days.push({ date: dateISO, dayLabel: dayNames[date.getDay()], tasks: [] }); continue; }

      const scored = active.map(i => ({ item: i, ...priorityScore(i, dateISO) }));
      const totalScore = scored.reduce((s, x) => s + x.score, 0) || 1;
      const budget = dailyHours * 60;

      // Allocate minutes proportional to priority score; give every active
      // course at least a 15-min touch so nothing gets fully dropped.
      const tasks: DayTask[] = scored
        .sort((a, b) => b.score - a.score)
        .map(x => {
          let minutes = Math.round((x.score / totalScore) * budget);
          minutes = Math.max(15, Math.min(minutes, budget));
          const urgencyInfo = levelOfUrgency(x.days);
          const reason = x.days === 0
            ? 'Exam is TODAY — final review'
            : x.days <= 2
            ? `Exam in ${x.days} day${x.days === 1 ? '' : 's'} — top priority`
            : x.difficultyNorm >= 0.6
            ? 'Rated hard — needs more repetition'
            : x.remaining >= 0.5
            ? 'Syllabus coverage still low'
            : `${urgencyInfo.label} priority`;
          return { code: x.item.code, title: x.item.title, minutes, reason };
        });

      // Trim proportionally if total exceeds the daily budget (rounding overflow)
      const allocated = tasks.reduce((s, t) => s + t.minutes, 0);
      if (allocated > budget) {
        const factor = budget / allocated;
        tasks.forEach(t => { t.minutes = Math.max(10, Math.round(t.minutes * factor)); });
      }

      days.push({ date: dateISO, dayLabel: dayNames[date.getDay()], tasks });
    }
    return days;
  }, [upcoming, today, dailyHours]);

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CalendarCheck className="h-6 w-6 text-primary" /> Exam Planner
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Add every course on your exam timetable — the planner prioritizes what's hardest, closest, and least covered.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select value={level} onChange={e => setLevel(Number(e.target.value) as LevelNum)}
            className="text-sm rounded-lg border border-input bg-background px-2 py-2">
            {[100, 200, 300, 400].map(l => <option key={l} value={l}>{l} Level</option>)}
          </select>
          <button onClick={() => setShowAdd(v => !v)}
            className="gradient-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:opacity-90 transition">
            <Plus className="h-4 w-4" /> Add Exam
          </button>
        </div>
      </div>

      {/* Add exam form */}
      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="bg-card rounded-xl p-5 shadow-card space-y-4 overflow-hidden">
            <div className="relative">
              <input type="text" value={codeQuery} onChange={e => setCodeQuery(e.target.value)}
                placeholder={`Search a ${dept?.name || 'faculty'} course code (e.g. CSC 301)…`}
                className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              {courseMatches.length > 0 && (
                <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                  {courseMatches.map(c => (
                    <button key={c.code} onClick={() => addItem(c.code, c.title)}
                      className="w-full text-left px-3 py-2 rounded-lg bg-muted/50 hover:bg-muted text-sm transition">
                      <span className="font-medium text-foreground">{c.code}</span> — {c.title}
                    </button>
                  ))}
                </div>
              )}
              {codeQuery.trim() && courseMatches.length === 0 && (
                <div className="mt-2 flex items-center gap-2">
                  <p className="text-xs text-muted-foreground flex-1">Not found in the {level} Level catalog. Add it anyway as a custom course:</p>
                  <button onClick={() => addItem(codeQuery.trim().toUpperCase(), codeQuery.trim())}
                    className="text-xs px-2 py-1 rounded-lg bg-primary/10 text-primary font-medium hover:bg-primary/20">Add "{codeQuery.trim()}"</button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Exam date</label>
                <input type="date" value={examDate} min={today} onChange={e => setExamDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Difficulty for you (1 easy – 5 very hard)</label>
                <input type="range" min={1} max={5} value={difficulty} onChange={e => setDifficulty(Number(e.target.value))} className="w-full" />
                <p className="text-xs text-center text-foreground font-medium">{difficulty}</p>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Syllabus already covered (%)</label>
                <input type="range" min={0} max={100} step={5} value={coverage} onChange={e => setCoverage(Number(e.target.value))} className="w-full" />
                <p className="text-xs text-center text-foreground font-medium">{coverage}%</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Pick a course above to add it with these settings, or search a code to add it directly.</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Daily study budget */}
      <div className="bg-card rounded-xl p-4 shadow-card flex items-center gap-3">
        <Gauge className="h-4 w-4 text-primary shrink-0" />
        <label className="text-sm text-foreground shrink-0">Hours you can study per day</label>
        <input type="range" min={1} max={10} value={dailyHours} onChange={e => setDailyHours(Number(e.target.value))} className="flex-1" />
        <span className="text-sm font-semibold text-foreground w-16 text-right">{dailyHours}h/day</span>
      </div>

      {/* Priority ranking */}
      {ranked.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Flame className="h-4 w-4 text-destructive" /> Priority order</h3>
          <div className="space-y-2">
            {ranked.map(({ item, score, days }, i) => {
              const u = levelOfUrgency(days);
              return (
                <motion.div key={item.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                  className="bg-card rounded-xl p-4 shadow-card flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{item.code} — {item.title}</p>
                    <p className="text-xs text-muted-foreground">
                      Exam {new Date(item.examDate).toLocaleDateString()} · {days === 0 ? 'today' : `${days} day${days === 1 ? '' : 's'} away`} · difficulty {item.difficulty}/5 · {item.coverage}% covered
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${u.bg} ${u.color}`}>{u.label}</span>
                  <span className="text-xs font-semibold text-foreground shrink-0 w-14 text-right">score {score}</span>
                  <button onClick={() => removeItem(item.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition shrink-0">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Generated day-by-day plan */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Sparkles className="h-4 w-4 text-secondary" /> Your study schedule</h3>
        {plan.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-xl border border-dashed border-border">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-foreground font-medium">No courses added yet</p>
            <p className="text-sm text-muted-foreground mt-1">Add every course on your exam timetable to generate a prioritized day-by-day plan.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {plan.map((day, idx) => (
              <motion.div key={day.date} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}
                className="bg-card rounded-xl p-4 shadow-card border border-border/50">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">{day.dayLabel} · {new Date(day.date).toLocaleDateString()}</span>
                  {idx === 0 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">Today</span>}
                  {day.tasks.some(t => t.reason.includes('TODAY')) && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-medium flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> Exam day
                    </span>
                  )}
                </div>
                {day.tasks.length === 0 ? (
                  <p className="text-xs text-muted-foreground pl-6">No active exams left to prepare for.</p>
                ) : (
                  <div className="space-y-1.5">
                    {day.tasks.map((t, tIdx) => (
                      <div key={t.code + tIdx} className="flex items-center gap-2 text-sm pl-1">
                        <span className="w-16 shrink-0 text-xs font-semibold text-foreground">{t.minutes}m</span>
                        <span className="text-foreground font-medium shrink-0">{t.code}</span>
                        <span className="text-muted-foreground truncate">{t.title}</span>
                        <span className="ml-auto text-xs text-muted-foreground shrink-0 hidden sm:inline">{t.reason}</span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
