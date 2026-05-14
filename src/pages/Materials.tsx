import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Upload, Search, FileText, Trash2, Play, CloudUpload, Loader2, Eye, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { materialsApi, type ApiMaterial } from '@/lib/api';

const fileTypeColors: Record<string, string> = {
  pdf: 'bg-destructive/10 text-destructive',
  docx: 'bg-primary/10 text-primary',
  txt: 'bg-muted text-muted-foreground',
  image: 'bg-accent/10 text-accent',
};

export default function Materials() {
  const [materials, setMaterials] = useState<ApiMaterial[]>([]);
  const [search, setSearch] = useState('');
  const [filterSubject, setFilterSubject] = useState('All');
  const [showUpload, setShowUpload] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadSubject, setUploadSubject] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [viewing, setViewing] = useState<(ApiMaterial & { text_content?: string }) | null>(null);
  const [fileUrl, setFileUrl] = useState('');
  const [opening, setOpening] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => () => { if (fileUrl) URL.revokeObjectURL(fileUrl); }, [fileUrl]);

  useEffect(() => {
    materialsApi.list().then(d => setMaterials(d.materials)).catch(() => toast.error('Failed to load materials'));
  }, []);

  const subjects = ['All', ...new Set(materials.map((m) => m.subject).filter(Boolean))];
  const filtered = materials.filter(
    (m) => (filterSubject === 'All' || m.subject === filterSubject) && m.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setUploadTitle(file.name.replace(/\.[^.]+$/, ''));
    setShowUpload(true);
  };

  const handleUpload = async () => {
    if (!selectedFile) { toast.error('Please select a file'); return; }
    setUploading(true);
    try {
      const { material } = await materialsApi.upload(selectedFile, uploadTitle || selectedFile.name, uploadSubject);
      setMaterials(prev => [material, ...prev]);
      toast.success('Material uploaded! Processing…');
      setShowUpload(false);
      setSelectedFile(null);
      setUploadTitle('');
      setUploadSubject('');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await materialsApi.delete(id);
      setMaterials(prev => prev.filter(m => m.id !== id));
      toast.success('Material deleted');
    } catch {
      toast.error('Failed to delete material');
    }
  };

  const handleOpen = async (material: ApiMaterial) => {
    setOpening(material.id);
    try {
      const [{ material: full }, blob] = await Promise.all([materialsApi.get(material.id), materialsApi.fileBlob(material.id)]);
      if (fileUrl) URL.revokeObjectURL(fileUrl);
      setFileUrl(URL.createObjectURL(blob));
      setViewing(full);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to open material');
    } finally {
      setOpening(null);
    }
  };

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Materials</h1>
        <button onClick={() => setShowUpload(!showUpload)}
          className="gradient-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:opacity-90 transition">
          <Upload className="h-4 w-4" /> Upload
        </button>
      </div>

      {/* Upload Area */}
      {showUpload && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
          className="border-2 border-dashed rounded-2xl p-6 space-y-4 border-border">
          <div
            className={`text-center py-6 rounded-xl transition-colors ${dragOver ? 'bg-primary/5 border-primary' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFileSelect(f); }}>
            <CloudUpload className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-foreground font-medium">{selectedFile ? selectedFile.name : 'Drag & drop or browse'}</p>
            <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, TXT, Images — Max 10MB</p>
            <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt,.png,.jpg,.jpeg" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }} />
            <button type="button" onClick={() => fileInputRef.current?.click()}
              className="mt-3 px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition">
              Browse Files
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input type="text" placeholder="Title (optional)" value={uploadTitle} onChange={e => setUploadTitle(e.target.value)}
              className="px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            <input type="text" placeholder="Subject (optional)" value={uploadSubject} onChange={e => setUploadSubject(e.target.value)}
              className="px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <button onClick={handleUpload} disabled={!selectedFile || uploading}
            className="w-full py-2.5 rounded-lg gradient-primary text-primary-foreground text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 transition disabled:opacity-50">
            {uploading ? <><Loader2 className="h-4 w-4 animate-spin" /> Uploading…</> : <><Upload className="h-4 w-4" /> Upload Material</>}
          </button>
        </motion.div>
      )}

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" placeholder="Search materials..." value={search} onChange={(e) => setSearch(e.target.value)}
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

      {/* Materials Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((mat, i) => (
          <motion.div key={mat.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-card rounded-xl p-4 shadow-card space-y-3">
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold uppercase ${fileTypeColors[mat.file_type] || 'bg-muted text-muted-foreground'}`}>
                {mat.file_type}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{mat.title}</p>
                <p className="text-xs text-muted-foreground">{mat.subject}</p>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{mat.upload_date}</span>
              <span>{mat.file_size}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className={`text-xs px-2 py-1 rounded-full ${mat.status === 'ready' ? 'bg-secondary/10 text-secondary' : mat.status === 'processing' ? 'bg-accent/10 text-accent' : 'bg-destructive/10 text-destructive'}`}>
                {mat.status === 'processing' ? '⏳ Processing' : mat.status === 'ready' ? '✓ Ready' : '✗ Error'}
              </span>
              <div className="flex gap-2">
                <button onClick={() => handleOpen(mat)} disabled={opening === mat.id}
                  className="p-1.5 rounded-lg hover:bg-muted transition text-muted-foreground hover:text-foreground disabled:opacity-50" title="Open Material">
                  {opening === mat.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                </button>
                <button onClick={() => navigate('/quizzes')}
                  className="p-1.5 rounded-lg hover:bg-muted transition text-muted-foreground hover:text-foreground" title="Generate Quiz">
                  <Play className="h-4 w-4" />
                </button>
                <button className="p-1.5 rounded-lg hover:bg-destructive/10 transition text-muted-foreground hover:text-destructive" title="Delete"
                  onClick={() => handleDelete(mat.id)}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <FileText className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-foreground font-medium">No materials found</p>
          <p className="text-sm text-muted-foreground mt-1">Upload your first study material to get started</p>
        </div>
      )}

      {viewing && (
        <div className="fixed inset-0 z-50 bg-foreground/60 backdrop-blur-sm p-3 lg:p-8 flex items-center justify-center">
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="bg-card rounded-xl shadow-float border border-border w-full max-w-5xl h-[88vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-border flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="font-semibold text-foreground truncate">{viewing.title}</h2>
                <p className="text-xs text-muted-foreground">{viewing.subject} · {viewing.file_type} · {viewing.file_size}</p>
              </div>
              <button onClick={() => setViewing(null)} className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition" title="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 bg-background overflow-auto">
              {['PNG', 'JPG', 'JPEG'].includes(viewing.file_type) ? (
                <img src={fileUrl} alt={viewing.title} className="max-w-full mx-auto" />
              ) : viewing.file_type === 'PDF' ? (
                <iframe src={fileUrl} title={viewing.title} className="w-full h-full" />
              ) : viewing.text_content ? (
                <pre className="whitespace-pre-wrap text-sm leading-6 p-5 text-foreground font-sans">{viewing.text_content}</pre>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-6">
                  <FileText className="h-14 w-14 text-muted-foreground/30 mb-3" />
                  <p className="text-foreground font-medium">Preview not available for this file type</p>
                  <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="mt-4 px-4 py-2 rounded-lg gradient-primary text-primary-foreground text-sm font-medium">Open original file</a>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
