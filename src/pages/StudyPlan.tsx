import { useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, BookOpen, Clock, CheckCircle, Sparkles, Target, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { studyPlanApi } from '@/lib/api';

interface DayPlan {
  day: number;
  date: string;
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
  const [examDate, setExamDate] = useState('');
  const [subject, setSubject] = useState('');
  const [plan, setPlan] = useState<DayPlan[]>([]);
  const [generated, setGenerated] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!examDate) { toast.error('Please select an exam date'); return; }
    if (new Date(examDate) <= new Date()) { toast.error('Exam date must be in the future'); return; }
    setLoading(true);
    try {
      const { plan: result } = await studyPlanApi.generate(examDate, subject);
      setPlan(result.plan as DayPlan[]);
      setGenerated(true);
      toast.success(`AI study plan generated! ${result.plan.length} days planned`);
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
        <p className="text-sm text-muted-foreground mt-1">Enter your exam date and get a personalized daily reading plan</p>
      </div>

      {/* Input Section */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="bg-card/80 backdrop-blur-sm rounded-xl p-5 shadow-card border border-border/50 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground flex items-center gap-1">
              <Target className="h-3 w-3" /> Exam Date
            </label>
            <input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2.5 rounded-xl border border-input bg-background/50 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground flex items-center gap-1">
              <BookOpen className="h-3 w-3" /> Subject (optional)
            </label>
            <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Data Structures, Calculus"
              className="w-full px-3 py-2.5 rounded-xl border border-input bg-background/50 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
        </div>
        <button onClick={handleGenerate} disabled={loading}
          className="w-full sm:w-auto px-6 py-3 rounded-xl gradient-primary text-primary-foreground font-medium text-sm flex items-center justify-center gap-2 hover:opacity-90 transition shadow-elevated disabled:opacity-60">
          {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating with AI…</> : <><Sparkles className="h-4 w-4" /> Generate Study Plan</>}
        </button>
      </motion.div>

      {/* Plan Output */}
      {generated && plan.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-primary" /> Study</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-accent" /> Revision</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-secondary" /> Practice</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-muted-foreground" /> Rest</span>
          </div>
          {plan.map((day, i) => (
            <motion.div key={day.day} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
              className={`rounded-xl p-4 shadow-card border-l-4 ${typeStyles[day.type]} flex items-start gap-4`}>
              <div className="text-center min-w-[50px]">
                <p className="text-lg font-bold text-foreground">Day {day.day}</p>
                <p className="text-[10px] text-muted-foreground">{day.date}</p>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium">{typeLabels[day.type]}</span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />{day.hours}h</span>
                </div>
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
          <p className="text-sm text-muted-foreground mt-1">Set your exam date above to get started</p>
        </div>
      )}
    </div>
  );
}
