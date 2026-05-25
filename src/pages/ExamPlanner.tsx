import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CalendarCheck, Upload, FileText, Trash2, Sparkles, Clock, BookOpen, Loader2, Download } from 'lucide-react';
import { examPlannerApi, type ApiExamPlan, type ApiTimetable } from '@/lib/api';
import { toast } from 'sonner';

export default function ExamPlanner() {
  const [plans, setPlans] = useState<ApiExamPlan[]>([]);
  const [timetables, setTimetables] = useState<ApiTimetable[]>([]);
  const [loading, setLoading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showGenerate, setShowGenerate] = useState(false);
  const [uploadType, setUploadType] = useState<'school' | 'exam'>('school');
  const [title, setTitle] = useState('');
  const [selectedTimetables, setSelectedTimetables] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [examDate, setExamDate] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [plansRes, timetablesRes] = await Promise.all([
        examPlannerApi.listPlans(),
        examPlannerApi.listTimetables()
      ]);
      setPlans(plansRes.plans);
      setTimetables(timetablesRes.timetables);
    } catch {
      toast.error('Failed to load exam plans');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!title.trim()) { toast.error('Enter a title for this timetable'); return; }
    
    setLoading(true);
    try {
      const { timetable } = await examPlannerApi.uploadTimetable(file, title, uploadType);
      setTimetables(prev => [timetable, ...prev]);
      toast.success(`${uploadType === 'school' ? 'School' : 'Exam'} timetable uploaded!`);
      setShowUpload(false);
      setTitle('');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  const deleteTimetable = async (id: string) => {
    if (!confirm('Delete this timetable?')) return;
    try {
      await examPlannerApi.deleteTimetable(id);
      setTimetables(prev => prev.filter(t => t.id !== id));
      toast.success('Timetable deleted');
    } catch { toast.error('Failed to delete'); }
  };

  const generatePlan = async () => {
    if (selectedTimetables.length === 0) { toast.error('Select at least one timetable'); return; }
    if (!examDate) { toast.error('Select your exam period start date'); return; }
    
    setGenerating(true);
    try {
      const { plan } = await examPlannerApi.generatePlan(selectedTimetables, examDate);
      setPlans(prev => [plan, ...prev]);
      toast.success('AI Study Plan generated!');
      setShowGenerate(false);
      setSelectedTimetables([]);
      setExamDate('');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const deletePlan = async (id: string) => {
    if (!confirm('Delete this study plan?')) return;
    try {
      await examPlannerApi.deletePlan(id);
      setPlans(prev => prev.filter(p => p.id !== id));
      toast.success('Plan deleted');
    } catch { toast.error('Failed to delete'); }
  };

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CalendarCheck className="h-6 w-6 text-primary" /> Exam Planner
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upload your timetables and let AI create your study schedule
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowUpload(!showUpload)}
            className="gradient-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:opacity-90 transition">
            <Upload className="h-4 w-4" /> Upload Timetable
          </button>
          <button onClick={() => setShowGenerate(!showGenerate)} disabled={timetables.length === 0}
            className="bg-secondary text-secondary-foreground px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:opacity-90 transition disabled:opacity-50">
            <Sparkles className="h-4 w-4" /> AI Plan
          </button>
        </div>
      </div>

      {/* Upload Form */}
      {showUpload && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
          className="bg-card rounded-xl p-5 shadow-card space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Upload Timetable</h3>
          <div className="flex gap-2">
            <button onClick={() => setUploadType('school')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${uploadType === 'school' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              School Timetable
            </button>
            <button onClick={() => setUploadType('exam')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${uploadType === 'exam' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              Exam Timetable
            </button>
          </div>
          <input type="text" placeholder="e.g., 2nd Semester 2025" value={title} onChange={e => setTitle(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
            <input type="file" accept=".pdf,.png,.jpg,.jpeg,.txt" onChange={handleFileUpload} disabled={loading}
              className="hidden" id="timetable-upload" />
            <label htmlFor="timetable-upload" className="cursor-pointer block">
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Click to upload PDF, image, or text file</p>
            </label>
          </div>
          {loading && <p className="text-sm text-center text-muted-foreground"><Loader2 className="h-4 w-4 inline animate-spin mr-1" /> Processing...</p>}
        </motion.div>
      )}

      {/* Generate Plan Form */}
      {showGenerate && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
          className="bg-card rounded-xl p-5 shadow-card space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Generate AI Study Plan</h3>
          <p className="text-xs text-muted-foreground">Select timetables and exam start date</p>
          
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {timetables.map(t => (
              <label key={t.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer">
                <input type="checkbox" checked={selectedTimetables.includes(t.id)}
                  onChange={e => {
                    setSelectedTimetables(prev => 
                      e.target.checked ? [...prev, t.id] : prev.filter(id => id !== t.id)
                    );
                  }}
                  className="w-4 h-4 rounded border-border" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{t.title}</p>
                  <p className="text-xs text-muted-foreground">{t.type === 'school' ? 'School' : 'Exam'} Timetable</p>
                </div>
              </label>
            ))}
          </div>
          
          <input type="date" value={examDate} onChange={e => setExamDate(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          
          <button onClick={generatePlan} disabled={generating || selectedTimetables.length === 0 || !examDate}
            className="w-full py-2.5 rounded-lg gradient-primary text-primary-foreground text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 transition disabled:opacity-50">
            {generating ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</> : <><Sparkles className="h-4 w-4" /> Generate Study Plan</>}
          </button>
        </motion.div>
      )}

      {/* Timetables List */}
      {timetables.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Your Timetables</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {timetables.map((t, i) => (
              <motion.div key={t.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="bg-card rounded-xl p-4 shadow-card flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${t.type === 'school' ? 'bg-accent/10 text-accent' : 'bg-secondary/10 text-secondary'}`}>
                  <FileText className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{t.title}</p>
                  <p className="text-xs text-muted-foreground">{t.type === 'school' ? 'School' : 'Exam'} • {new Date(t.created_at).toLocaleDateString()}</p>
                </div>
                <button onClick={() => deleteTimetable(t.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition">
                  <Trash2 className="h-4 w-4" />
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Generated Plans */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground">AI Study Plans</h3>
        {plans.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-xl border border-dashed border-border">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-foreground font-medium">No study plans yet</p>
            <p className="text-sm text-muted-foreground mt-1">Upload timetables and generate your first AI plan</p>
          </div>
        ) : (
          plans.map((plan, i) => (
            <motion.div key={plan.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-card rounded-xl p-5 shadow-card border border-border/50">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h4 className="font-semibold text-foreground flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-secondary" />
                    Study Plan • Exam: {new Date(plan.exam_date).toLocaleDateString()}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">Created {new Date(plan.created_at).toLocaleDateString()}</p>
                </div>
                <button onClick={() => deletePlan(plan.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              
              {/* Schedule */}
              <div className="space-y-3">
                {plan.schedule.map((day, idx) => (
                  <div key={idx} className="bg-muted/30 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium text-foreground">{day.day}</span>
                      <span className="text-xs text-muted-foreground">• {day.date}</span>
                    </div>
                    <div className="space-y-1">
                      {day.tasks.map((task, tidx) => (
                        <div key={tidx} className="flex items-start gap-2 text-sm">
                          <span className="text-muted-foreground">{task.time}:</span>
                          <span className="text-foreground">{task.subject} - {task.activity}</span>
                          <span className="text-xs text-muted-foreground ml-auto">{task.duration}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
