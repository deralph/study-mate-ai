import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import { TrendingUp, Award, Target, Calendar, BookOpen, Bell, Activity, Loader2 } from 'lucide-react';
import { progressApi, type ProgressStatsResponse } from '@/lib/api';
import { toast } from 'sonner';

const emptySubjects = [
  { subject: 'Upload', hours: 0 },
  { subject: 'Quiz', hours: 0 },
  { subject: 'Study', hours: 0 },
];

const emptyTrend = [
  { week: 'W1', score: 0 },
  { week: 'W2', score: 0 },
  { week: 'W3', score: 0 },
  { week: 'W4', score: 0 },
];

const emptyRadar = [
  { subject: 'Materials', score: 0 },
  { subject: 'Quizzes', score: 0 },
  { subject: 'Practice', score: 0 },
  { subject: 'Revision', score: 0 },
];

export default function Progress() {
  const [data, setData] = useState<ProgressStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    progressApi.getStats()
      .then(setData)
      .catch(() => toast.error('Failed to load progress'))
      .finally(() => setLoading(false));
  }, []);

  const metrics = useMemo(() => {
    const stats = data?.stats;
    return [
      { label: 'Average Score', value: `${stats?.avgScore ?? 0}%`, icon: Target, color: 'bg-primary/10 text-primary' },
      { label: 'Completion Rate', value: `${stats?.completionRate ?? 0}%`, icon: Award, color: 'bg-secondary/10 text-secondary' },
      { label: 'Study Consistency', value: `${stats?.studyConsistency ?? 0}%`, icon: Calendar, color: 'bg-accent/10 text-accent' },
      { label: 'Improvement', value: `${(stats?.improvement ?? 0) >= 0 ? '+' : ''}${stats?.improvement ?? 0}%`, icon: TrendingUp, color: 'bg-secondary/10 text-secondary' },
    ];
  }, [data]);

  const hasAnyData = data?.stats.hasAnyData ?? false;
  const studyTimeData = data?.studyBySubject.length ? data.studyBySubject : emptySubjects;
  const performanceData = data?.weeklyPerformance.length ? data.weeklyPerformance : emptyTrend;
  const radarData = data?.radarData.length ? data.radarData : emptyRadar;

  if (loading) {
    return <div className="min-h-[50vh] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Progress & Analytics</h1>
        {!hasAnyData && <p className="text-sm text-muted-foreground mt-1">{data?.placeholders.emptyChartsMessage}</p>}
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {metrics.map((m, i) => (
          <motion.div key={m.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-card rounded-xl p-4 shadow-card">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-2 ${m.color}`}>
              <m.icon className="h-5 w-5" />
            </div>
            <p className="text-xl font-bold text-foreground">{m.value}</p>
            <p className="text-xs text-muted-foreground">{m.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-card rounded-xl p-5 shadow-card">
          <h3 className="text-sm font-semibold text-foreground mb-4">Study Hours by Subject</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={studyTimeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="subject" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
              <Bar dataKey="hours" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="bg-card rounded-xl p-5 shadow-card">
          <h3 className="text-sm font-semibold text-foreground mb-4">Quiz Performance Trend</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="week" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
              <Line type="monotone" dataKey="score" stroke="hsl(var(--secondary))" strokeWidth={2} dot={{ fill: 'hsl(var(--secondary))' }} />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="bg-card rounded-xl p-5 shadow-card lg:col-span-2">
          <h3 className="text-sm font-semibold text-foreground mb-4">Strengths & Weaknesses</h3>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <PolarRadiusAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <Radar dataKey="score" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} />
            </RadarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Subject Breakdown */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
        className="bg-card rounded-xl shadow-card overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Subject Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted text-muted-foreground text-xs">
                <th className="text-left p-3">Subject</th>
                <th className="text-left p-3">Hours</th>
                <th className="text-left p-3">Avg Score</th>
                <th className="text-left p-3">Quizzes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data?.subjectBreakdown.length ? data.subjectBreakdown.map((row) => (
                <tr key={row.subject}>
                  <td className="p-3 text-foreground">{row.subject}</td>
                  <td className="p-3">{row.hours}h</td>
                  <td className={`p-3 font-medium ${row.avg_score >= 70 ? 'text-secondary' : row.avg_score > 0 ? 'text-accent' : 'text-muted-foreground'}`}>{row.avg_score}%</td>
                  <td className="p-3">{row.quiz_count}</td>
                </tr>
              )) : (
                <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">No subject analytics yet. Upload materials, create quizzes, and complete study sessions.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[
          { title: 'Recent Activity', icon: Activity, items: data?.recentActivity.map(a => `${a.type || 'study'} · ${a.text}`) ?? [] },
          { title: 'Latest Materials', icon: BookOpen, items: data?.latestMaterials.map(m => `${m.title} · ${m.subject}`) ?? [] },
          { title: 'Upcoming Reminders', icon: Bell, items: data?.upcomingReminders.map(r => `${r.title} · ${r.time} (${r.recurrence})`) ?? [] },
        ].map((section, i) => (
          <motion.div key={section.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + i * 0.05 }} className="bg-card rounded-xl p-5 shadow-card">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><section.icon className="h-4 w-4 text-primary" /> {section.title}</h3>
            {section.items.length ? (
              <div className="space-y-2">{section.items.slice(0, 5).map((item) => <p key={item} className="text-xs text-muted-foreground border-b border-border/50 pb-2 last:border-0">{item}</p>)}</div>
            ) : <p className="text-xs text-muted-foreground">Nothing here yet.</p>}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
