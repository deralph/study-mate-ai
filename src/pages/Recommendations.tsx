import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Lightbulb, Clock, Zap, Play, Calendar, Check, Loader2 } from 'lucide-react';
import { recommendationsApi, type ApiRecommendation } from '@/lib/api';
import { toast } from 'sonner';

const difficultyColors = { Easy: 'bg-secondary/10 text-secondary', Medium: 'bg-accent/10 text-accent', Hard: 'bg-destructive/10 text-destructive' };
const priorityColors = { high: 'border-destructive/40', medium: 'border-accent/40', low: 'border-border' };

export default function Recommendations() {
  const [recommendations, setRecommendations] = useState<ApiRecommendation[]>([]);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    recommendationsApi.get().then(d => setRecommendations(d.recommendations)).catch(() => toast.error('Failed to load recommendations'));
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { recommendations: fresh } = await recommendationsApi.generate();
      setRecommendations(fresh);
      toast.success('New recommendations generated!');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate');
    } finally {
      setGenerating(false);
    }
  };

  const handleComplete = async (id: string) => {
    try {
      await recommendationsApi.markComplete(id);
      setRecommendations(prev => prev.map(r => r.id === id ? { ...r, completed: true } : r));
      toast.success('Marked as completed!');
    } catch { toast.error('Failed to update'); }
  };

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Study Recommendations</h1>
          <p className="text-sm text-muted-foreground mt-1">Personalized suggestions based on your performance</p>
        </div>
        <button onClick={handleGenerate} disabled={generating}
          className="gradient-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:opacity-90 transition disabled:opacity-60">
          {generating ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating</> : <><Zap className="h-4 w-4" /> Generate New</>}
        </button>
      </div>

      {recommendations.length === 0 ? (
        <div className="text-center py-16">
          <Lightbulb className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-foreground font-medium">No recommendations yet</p>
          <p className="text-sm text-muted-foreground mt-1">Take a quiz or upload materials to get personalized suggestions</p>
        </div>
      ) : (
        <div className="space-y-3">
          {recommendations.map((rec, i) => (
            <motion.div key={rec.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className={`bg-card rounded-xl p-5 shadow-card border-l-4 ${priorityColors[rec.priority]} ${rec.completed ? 'opacity-50' : ''} space-y-3`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-foreground">{rec.topic}</p>
                  <p className="text-xs text-muted-foreground">{rec.subject}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${difficultyColors[rec.difficulty]}`}>{rec.difficulty}</span>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {rec.estimated_time}</span>
                <span className="flex items-center gap-1"><Lightbulb className="h-3 w-3" /> {rec.reason}</span>
              </div>
              <div className="flex gap-2">
                {!rec.completed ? (
                  <>
                    <button className="flex-1 py-2 rounded-lg gradient-primary text-primary-foreground text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 transition">
                      <Play className="h-4 w-4" /> Start Now
                    </button>
                    <button onClick={() => handleComplete(rec.id)} className="flex-1 py-2 rounded-lg border border-border text-sm font-medium text-foreground flex items-center justify-center gap-2 hover:bg-muted transition">
                      <Check className="h-4 w-4" /> Mark Done
                    </button>
                  </>
                ) : (
                  <div className="flex items-center justify-center gap-2 text-sm text-secondary w-full">
                    <Check className="h-4 w-4" /> Completed
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
