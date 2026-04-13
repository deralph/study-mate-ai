import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Sparkles, Copy, Check, Upload } from 'lucide-react';
import { toast } from 'sonner';

const SAMPLE_SUMMARIES: Record<string, string> = {
  default: `## Key Points

1. **Main Concept**: The text covers fundamental principles of the subject with emphasis on practical application.

2. **Important Definitions**: Key terms are highlighted and explained in context with real-world examples.

3. **Core Arguments**: The material presents three main arguments supporting the thesis, backed by empirical evidence.

4. **Conclusion**: The summary emphasizes understanding over memorization, encouraging critical thinking.

### Quick Review
- Focus on chapters 3-5 for exam preparation
- Practice problems are essential for mastery
- Connect concepts across different modules for deeper understanding`,
};

export default function NotesSummarizer() {
  const [inputText, setInputText] = useState('');
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSummarize = () => {
    if (!inputText.trim()) {
      toast.error('Please paste or type your notes first');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setSummary(SAMPLE_SUMMARIES.default);
      setLoading(false);
      toast.success('Notes summarized successfully!');
    }, 2000);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(summary);
    setCopied(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-accent" /> Notes Summarizer
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Paste your notes and get an AI-powered summary instantly</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Input */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          <div className="bg-card/80 backdrop-blur-sm rounded-xl p-5 shadow-card border border-border/50 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" /> Your Notes
              </h3>
              <span className="text-xs text-muted-foreground">{inputText.length} chars</span>
            </div>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Paste your lecture notes, textbook excerpts, or study material here..."
              className="w-full h-64 p-4 rounded-xl border border-input bg-background/50 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSummarize}
                disabled={loading || !inputText.trim()}
                className="flex-1 py-3 rounded-xl gradient-primary text-primary-foreground font-medium text-sm flex items-center justify-center gap-2 hover:opacity-90 transition disabled:opacity-50 shadow-elevated"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {loading ? 'Summarizing...' : 'Summarize'}
              </button>
              <button className="px-4 py-3 rounded-xl border border-border/50 text-sm font-medium text-muted-foreground flex items-center gap-2 hover:bg-muted/50 transition">
                <Upload className="h-4 w-4" /> Upload File
              </button>
            </div>
          </div>
        </motion.div>

        {/* Output */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="bg-card/80 backdrop-blur-sm rounded-xl p-5 shadow-card border border-border/50 space-y-3 h-full">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-secondary" /> Summary
              </h3>
              {summary && (
                <button onClick={handleCopy} className="text-xs text-primary flex items-center gap-1 hover:underline">
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              )}
            </div>
            {summary ? (
              <div className="prose prose-sm text-foreground max-w-none h-72 overflow-y-auto">
                {summary.split('\n').map((line, i) => {
                  if (line.startsWith('## ')) return <h2 key={i} className="text-base font-bold text-foreground mt-2 mb-1">{line.replace('## ', '')}</h2>;
                  if (line.startsWith('### ')) return <h3 key={i} className="text-sm font-semibold text-foreground mt-3 mb-1">{line.replace('### ', '')}</h3>;
                  if (line.startsWith('- ')) return <li key={i} className="text-sm text-muted-foreground ml-4">{line.replace('- ', '')}</li>;
                  if (line.match(/^\d+\./)) return <p key={i} className="text-sm text-foreground my-1">{line}</p>;
                  if (line.trim() === '') return <br key={i} />;
                  return <p key={i} className="text-sm text-foreground">{line}</p>;
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-72 text-muted-foreground/50">
                <Sparkles className="h-12 w-12 mb-3" />
                <p className="text-sm font-medium">Your summary will appear here</p>
                <p className="text-xs mt-1">Paste your notes and click Summarize</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
