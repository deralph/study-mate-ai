import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bell, Plus, Trash2, Clock, Repeat } from 'lucide-react';
import { remindersApi, type ApiReminder } from '@/lib/api';
import { toast } from 'sonner';

export default function Reminders() {
  const [reminders, setReminders] = useState<ApiReminder[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('');
  const [recurrence, setRecurrence] = useState('once');

  useEffect(() => {
    remindersApi.list().then(d => setReminders(d.reminders)).catch(() => toast.error('Failed to load reminders'));
  }, []);

  const toggleReminder = async (id: string) => {
    const rem = reminders.find(r => r.id === id);
    if (!rem) return;
    try {
      const { reminder } = await remindersApi.update(id, { enabled: !rem.enabled });
      setReminders(prev => prev.map(r => r.id === id ? reminder : r));
    } catch { toast.error('Failed to update reminder'); }
  };

  const addReminder = async () => {
    if (!title.trim()) { toast.error('Enter a reminder title'); return; }
    if (!time) { toast.error('Select a reminder time'); return; }
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
    try {
      const { reminder } = await remindersApi.create({ title, time, recurrence });
      setReminders(prev => [...prev, reminder]);
      setTitle(''); setTime(''); setRecurrence('once'); setShowForm(false);
      const permOk = typeof Notification !== 'undefined' && Notification.permission === 'granted';
      toast.success(permOk ? 'Reminder created! You\'ll get a notification at the set time.' : 'Reminder created! Enable notifications in Profile to get alerts.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create reminder');
    }
  };

  const deleteReminder = async (id: string) => {
    try {
      await remindersApi.delete(id);
      setReminders(prev => prev.filter(r => r.id !== id));
      toast.success('Reminder deleted');
    } catch { toast.error('Failed to delete reminder'); }
  };

  return (
    <div className="p-4 lg:p-8 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Reminders</h1>
        <button onClick={() => setShowForm(!showForm)}
          className="gradient-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:opacity-90 transition">
          <Plus className="h-4 w-4" /> New
        </button>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
          className="bg-card rounded-xl p-5 shadow-card space-y-3">
          <input type="text" placeholder="Reminder title" value={title} onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          <select value={recurrence} onChange={(e) => setRecurrence(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="once">Once</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="custom">Custom</option>
          </select>
          <button onClick={addReminder} className="w-full py-2.5 rounded-lg gradient-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition">
            Create Reminder
          </button>
        </motion.div>
      )}

      <div className="space-y-3">
        {reminders.map((rem, i) => (
          <motion.div key={rem.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className={`bg-card rounded-xl p-4 shadow-card flex items-center gap-4 ${!rem.enabled ? 'opacity-50' : ''}`}>
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
              <Bell className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{rem.title}</p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {rem.time}</span>
                <span className="flex items-center gap-1"><Repeat className="h-3 w-3" /> {rem.recurrence}</span>
                {rem.condition && <span>{rem.condition}</span>}
              </div>
            </div>
            <button onClick={() => toggleReminder(rem.id)}
              className={`w-11 h-6 rounded-full transition-colors relative ${rem.enabled ? 'bg-primary' : 'bg-muted'}`}>
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-card shadow transition-transform ${rem.enabled ? 'translate-x-5' : ''}`} />
            </button>
            <button onClick={() => deleteReminder(rem.id)}
              className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition">
              <Trash2 className="h-4 w-4" />
            </button>
          </motion.div>
        ))}
      </div>

      {reminders.length === 0 && (
        <div className="text-center py-16">
          <Bell className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-foreground font-medium">No reminders set</p>
          <p className="text-sm text-muted-foreground mt-1">Create one to stay on track!</p>
        </div>
      )}
    </div>
  );
}
