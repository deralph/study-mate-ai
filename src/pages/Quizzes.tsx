import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Clock, CheckCircle, ArrowLeft, ArrowRight, Timer, Loader2, Plus, BookOpen } from 'lucide-react';
import { quizzesApi, materialsApi, type ApiQuiz, type ApiQuestion, type ApiMaterial } from '@/lib/api';
import { toast } from 'sonner';
import { useLocation } from 'react-router-dom';

export default function Quizzes() {
  const [quizzes, setQuizzes] = useState<ApiQuiz[]>([]);
  const [materials, setMaterials] = useState<ApiMaterial[]>([]);
  const [activeQuiz, setActiveQuiz] = useState<string | null>(null);
  const [activeQuestions, setActiveQuestions] = useState<ApiQuestion[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<{ score: number; total: number; percentage: number; pointsEarned: number } | null>(null);
  const [resultQuestions, setResultQuestions] = useState<ApiQuestion[]>([]);
  const [generating, setGenerating] = useState(false);
  const [showGenerate, setShowGenerate] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState('');
  const location = useLocation();

  useEffect(() => {
    quizzesApi.list().then(d => setQuizzes(d.quizzes)).catch(() => {});
    materialsApi.list().then(d => setMaterials(d.materials.filter(m => m.status === 'ready'))).catch(() => {});
    const startId = (location.state as any)?.startQuizId;
    if (startId) {
      startQuiz(startId);
      window.history.replaceState({}, '');
    }
  }, []);

  const handleGenerate = async () => {
    if (!selectedMaterial) { toast.error('Select a material first'); return; }
    setGenerating(true);
    try {
      const { quiz } = await quizzesApi.generate(selectedMaterial, 10);
      setQuizzes(prev => [quiz as ApiQuiz, ...prev]);
      toast.success('Quiz generated!');
      setShowGenerate(false);
      setSelectedMaterial('');
    } catch (err: unknown) {
      console.log(err instanceof Error ? err.message : 'Generation failed');
      toast.error(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const startQuiz = async (quizId: string) => {
    try {
      const { quiz } = await quizzesApi.get(quizId);
      setActiveQuestions(quiz.questions);
      setActiveQuiz(quizId);
      setCurrentQ(0);
      setAnswers({});
      setSubmitted(false);
      setResult(null);
    } catch {
      toast.error('Failed to load quiz');
    }
  };

  const handleSubmit = async () => {
    if (!activeQuiz) return;
    try {
      const { attempt, questions } = await quizzesApi.submit(activeQuiz, answers);
      setResult(attempt);
      setResultQuestions(questions);
      setSubmitted(true);
      setQuizzes(prev => prev.map(q => q.id === activeQuiz ? { ...q, status: 'completed', best_score: Math.max(q.best_score ?? 0, Math.round(attempt.percentage)) } : q));
    } catch {
      toast.error('Failed to submit quiz');
    }
  };

  const questions = activeQuestions;

  if (activeQuiz && !submitted) {
    const q = questions[currentQ];
    return (
      <div className="p-4 lg:p-8 max-w-3xl mx-auto space-y-6">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Question {currentQ + 1} of {questions.length}</span>
            <span className="flex items-center gap-1 text-accent font-medium"><Timer className="h-4 w-4" /> 15:00</span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full gradient-primary rounded-full transition-all" style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }} />
          </div>
        </div>

        {/* Question */}
        <motion.div key={q.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-card rounded-xl p-6 shadow-card space-y-4">
          <p className="text-lg font-semibold text-foreground">{q.question}</p>
          {q.type === 'short-answer' ? (
            <textarea placeholder="Type your answer..." value={answers[q.id] || ''} onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
              className="w-full p-3 rounded-lg border border-input bg-background text-sm text-foreground resize-none h-24 focus:outline-none focus:ring-2 focus:ring-ring" />
          ) : (
            <div className="space-y-2">
              {q.options?.map((opt) => (
                <button key={opt} onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                  className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition ${answers[q.id] === opt ? 'border-primary bg-primary/10 text-primary' : 'border-border text-foreground hover:bg-muted'}`}>
                  {opt}
                </button>
              ))}
            </div>
          )}
        </motion.div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button onClick={() => setCurrentQ((p) => Math.max(0, p - 1))} disabled={currentQ === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground disabled:opacity-40 hover:bg-muted transition">
            <ArrowLeft className="h-4 w-4" /> Previous
          </button>
          {currentQ < questions.length - 1 ? (
            <button onClick={() => setCurrentQ((p) => p + 1)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg gradient-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition">
              Next <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button onClick={handleSubmit}
              className="flex items-center gap-2 px-4 py-2 rounded-lg gradient-secondary text-secondary-foreground text-sm font-medium hover:opacity-90 transition">
              Submit <CheckCircle className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  if (submitted && result) {
    const pct = Math.round(result.percentage);
    return (
      <div className="p-4 lg:p-8 max-w-3xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="text-center bg-card rounded-2xl p-8 shadow-card space-y-4">
          <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center text-3xl font-bold ${pct >= 70 ? 'bg-secondary/10 text-secondary' : 'bg-accent/10 text-accent'}`}>
            {pct}%
          </div>
          <h2 className="text-2xl font-bold text-foreground">{pct >= 70 ? 'Great Job! 🎉' : 'Keep Practicing! 💪'}</h2>
          <p className="text-muted-foreground">{result.score} of {result.total} correct · +{result.pointsEarned} pts</p>
        </motion.div>

        <div className="space-y-3">
          {resultQuestions.map((q) => {
            const correct = q.isCorrect ?? ((answers[q.id] || '').toLowerCase().trim() === q.correctAnswer.toLowerCase().trim());
            return (
              <div key={q.id} className={`bg-card rounded-xl p-4 shadow-card border-l-4 ${correct ? 'border-secondary' : 'border-destructive'}`}>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-sm font-medium text-foreground">{q.question}</p>
                  <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${correct ? 'bg-secondary/10 text-secondary' : 'bg-destructive/10 text-destructive'}`}>
                    {correct ? '✓ Correct' : '✗ Wrong'}
                  </span>
                </div>
                <p className="text-xs mt-1"><span className="text-muted-foreground">Your answer:</span> <span className={correct ? 'text-secondary' : 'text-destructive'}>{answers[q.id] || '(no answer)'}</span></p>
                {!correct && <p className="text-xs text-secondary mt-1 font-medium">✓ Correct: {q.correctAnswer}</p>}
                <p className="text-xs text-muted-foreground mt-2 italic">{q.explanation}</p>
              </div>
            );
          })}
        </div>

        <button onClick={() => { setActiveQuiz(null); setSubmitted(false); setAnswers({}); setCurrentQ(0); setResult(null); }}
          className="w-full py-3 rounded-xl gradient-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition">
          Back to Quizzes
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Quizzes</h1>
        <button onClick={() => setShowGenerate(!showGenerate)}
          className="gradient-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:opacity-90 transition">
          <Plus className="h-4 w-4" /> Generate Quiz
        </button>
      </div>

      {showGenerate && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
          className="bg-card rounded-xl p-5 shadow-card space-y-3">
          <p className="text-sm font-semibold text-foreground">Generate Quiz from Material</p>
          {materials.length === 0 ? (
            <p className="text-sm text-muted-foreground">Upload and process a material first to generate quizzes.</p>
          ) : (
            <>
              <select value={selectedMaterial} onChange={e => setSelectedMaterial(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">Select a material…</option>
                {materials.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
              </select>
              <button onClick={handleGenerate} disabled={!selectedMaterial || generating}
                className="w-full py-2.5 rounded-lg gradient-primary text-primary-foreground text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 transition disabled:opacity-50">
                {generating ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</> : <><BookOpen className="h-4 w-4" /> Generate 10 Questions</>}
              </button>
            </>
          )}
        </motion.div>
      )}

      {quizzes.length === 0 ? (
        <div className="text-center py-16">
          <BookOpen className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-foreground font-medium">No quizzes yet</p>
          <p className="text-sm text-muted-foreground mt-1">Upload a material and generate your first quiz</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {quizzes.map((quiz, i) => (
            <motion.div key={quiz.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-card rounded-xl p-5 shadow-card space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-foreground">{quiz.title}</p>
                  <p className="text-xs text-muted-foreground">{quiz.subject}</p>
                </div>
                {quiz.best_score != null && (
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-secondary/10 text-secondary">
                    Best: {quiz.best_score}%
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3" /> {quiz.question_count} questions</span>
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {quiz.duration} min</span>
              </div>
              <button onClick={() => startQuiz(quiz.id)}
                className="w-full py-2 rounded-lg gradient-primary text-primary-foreground text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 transition">
                <Play className="h-4 w-4" /> {quiz.status === 'completed' ? 'Retake' : 'Start Quiz'}
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
