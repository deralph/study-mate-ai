import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Sparkles, FileQuestion, FileText, RotateCcw, AlertCircle } from 'lucide-react';
import { chatApi, type ApiChatMessage } from '@/lib/api';
import { toast } from 'sonner';

const quickChips = [
  { label: 'Explain this concept to me', icon: Sparkles },
  { label: 'Create practice quiz questions', icon: FileQuestion },
  { label: 'Summarize my uploaded notes', icon: FileText },
];

export default function Chat() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ApiChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatApi.createSession().then(({ session }) => setSessionId(session.id)).catch(() => toast.error('Failed to start chat session'));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  const sendMessage = async () => {
    if (!input.trim() || !sessionId || typing) return;
    const text = input.trim();
    setInput('');
    setTyping(true);
    setError('');

    setMessages(prev => [...prev, {
      id: `tmp-${Date.now()}`, role: 'user', content: text, references: [],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }]);

    try {
      const { userMessage, aiMessage } = await chatApi.sendMessage(sessionId, text);
      setMessages(prev => [...prev.slice(0, -1), userMessage, aiMessage]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'AI failed to respond';
      setError(msg);
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setTyping(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    chatApi.createSession().then(({ session }) => setSessionId(session.id)).catch(() => {});
  };

  return (
    <div className="flex h-[calc(100dvh-4rem)] max-w-full flex-col overflow-hidden lg:h-screen">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border bg-card px-3 py-3 sm:px-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full gradient-hero flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-foreground">StudyAI Assistant</h1>
            <p className="text-xs text-secondary">● Powered by Gemini</p>
          </div>
        </div>
        <button onClick={clearChat} className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition" title="New chat">
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="min-w-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden p-3 sm:p-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full gradient-hero flex items-center justify-center mb-4">
              <Sparkles className="h-8 w-8 text-primary-foreground" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">How can I help you study?</h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">Ask me anything. I can explain concepts, create quizzes, and summarize your uploaded notes.</p>
          </div>
        )}

        {messages.map((msg) => (
          <motion.div key={msg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className={`flex min-w-0 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[92%] overflow-hidden rounded-2xl px-3 py-3 text-sm sm:max-w-[85%] sm:px-4 lg:max-w-[70%] ${msg.role === 'user' ? 'gradient-primary text-primary-foreground rounded-br-md' : 'bg-card shadow-card text-foreground rounded-bl-md'}`}>
              <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{msg.content}</p>
              {msg.references && msg.references.length > 0 && (
                <div className="mt-2 flex gap-1 flex-wrap">
                  {msg.references.map((ref) => (
                    <span key={ref} className="text-[10px] bg-primary/20 px-2 py-0.5 rounded-full">{ref}</span>
                  ))}
                </div>
              )}
              <p className={`text-[10px] mt-1.5 ${msg.role === 'user' ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>{msg.timestamp}</p>
            </div>
          </motion.div>
        ))}

        {typing && (
          <div className="flex justify-start">
            <div className="bg-card shadow-card rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0s' }} />
                <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0.15s' }} />
                <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0.3s' }} />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 rounded-xl px-4 py-3">
            <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick chips */}
      {messages.length === 0 && (
        <div className="flex shrink-0 gap-2 overflow-x-auto px-3 pb-2 sm:px-4">
          {quickChips.map((chip) => (
            <button key={chip.label} onClick={() => setInput(chip.label)}
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-border text-sm text-foreground hover:bg-muted transition whitespace-nowrap">
              <chip.icon className="h-4 w-4 text-primary" /> {chip.label}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="shrink-0 border-t border-border bg-card px-3 py-3 sm:px-4">
        <div className="mx-auto flex max-w-3xl items-center gap-2">
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask anything about your studies..."
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            className="min-w-0 flex-1 rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring sm:px-4" />
          <button onClick={sendMessage} disabled={!input.trim() || typing || !sessionId}
            className="p-2.5 rounded-xl gradient-primary text-primary-foreground disabled:opacity-40 transition">
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
