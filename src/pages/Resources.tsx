import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Star, Bookmark, BookmarkCheck, ExternalLink, Search, Video, FileText, File, Sparkles, Loader2 } from 'lucide-react';
import { resourcesApi, type ApiResource } from '@/lib/api';
import { toast } from 'sonner';

const typeIcons: Record<string, React.ElementType> = { Video, Article: FileText, PDF: File };

export default function Resources() {
  const [resources, setResources] = useState<ApiResource[]>([]);
  const [search, setSearch] = useState('');
  const [filterSubject, setFilterSubject] = useState('All');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    resourcesApi.list().then(d => setResources(d.resources)).catch(() => toast.error('Failed to load resources'));
  }, []);

  const subjects = ['All', ...new Set(resources.map((r) => r.subject).filter(Boolean))];
  const filtered = resources.filter(
    (r) => (filterSubject === 'All' || r.subject === filterSubject) && r.title.toLowerCase().includes(search.toLowerCase())
  );

  const toggleBookmark = async (id: string) => {
    try {
      const { bookmarked } = await resourcesApi.toggleBookmark(id);
      setResources(prev => prev.map(r => r.id === id ? { ...r, bookmarked } : r));
    } catch { toast.error('Failed to update bookmark'); }
  };

  const generateResources = async () => {
    setGenerating(true);
    try {
      const { resources: fresh } = await resourcesApi.generate();
      setResources(fresh);
      toast.success('Resources generated from your profile and materials');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate resources');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-foreground">Resources Hub</h1>
        <button onClick={generateResources} disabled={generating}
          className="gradient-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:opacity-90 transition disabled:opacity-60">
          {generating ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating</> : <><Sparkles className="h-4 w-4" /> Generate</>}
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" placeholder="Search resources..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {subjects.map((s) => (
            <button key={s} onClick={() => setFilterSubject(s)}
              className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition ${filterSubject === s ? 'gradient-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filtered.map((res, i) => {
          const Icon = typeIcons[res.type] || FileText;
          return (
            <motion.div key={res.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-card rounded-xl p-5 shadow-card space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{res.title}</p>
                    <p className="text-xs text-muted-foreground">{res.subject} · {res.duration}</p>
                  </div>
                </div>
                <button onClick={() => toggleBookmark(res.id)} className="text-accent hover:scale-110 transition-transform">
                  {res.bookmarked ? <BookmarkCheck className="h-5 w-5" /> : <Bookmark className="h-5 w-5" />}
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-xs text-accent">
                  <Star className="h-3.5 w-3.5 fill-current" /> {res.rating}
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">{res.type}</span>
              </div>
              <a href={res.url} target="_blank" rel="noopener noreferrer"
                className="w-full py-2 rounded-lg border border-border text-sm font-medium text-foreground flex items-center justify-center gap-2 hover:bg-muted transition">
                <ExternalLink className="h-4 w-4" /> Open Resource
              </a>
            </motion.div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <FileText className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-foreground font-medium">No resources yet</p>
          <p className="text-sm text-muted-foreground mt-1">Generate blogs, topics, and study links from your course and uploaded materials.</p>
        </div>
      )}
    </div>
  );
}
