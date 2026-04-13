import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, GraduationCap, Building, Calendar, Camera, Lock, Trash2, Save } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';

export default function Profile() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [email] = useState(user?.email ?? '');
  const [department, setDepartment] = useState(user?.department ?? '');
  const [year, setYear] = useState(user?.year ?? '');
  const [university] = useState(user?.university ?? 'Adekunle Ajasin University (AAUA)');

  return (
    <div className="p-4 lg:p-8 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Profile & Settings</h1>

      {/* Avatar */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center bg-card/80 backdrop-blur-sm rounded-xl p-6 shadow-card border border-border/50">
        <div className="relative">
          <div className="w-24 h-24 rounded-full gradient-hero flex items-center justify-center text-3xl font-bold text-primary-foreground shadow-elevated">
            {name.split(' ').map((n) => n[0]).join('')}
          </div>
          <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-elevated">
            <Camera className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-3 text-lg font-semibold text-foreground">{name}</p>
        <p className="text-sm text-muted-foreground">{department} · {year}</p>
      </motion.div>

      {/* Profile Fields */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="bg-card/80 backdrop-blur-sm rounded-xl p-5 shadow-card border border-border/50 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Personal Information</h3>
        <div className="space-y-3">
          {[
            { label: 'Full Name', value: name, onChange: setName, icon: User },
            { label: 'Email', value: email, onChange: null, icon: Mail },
            { label: 'Department', value: department, onChange: setDepartment, icon: GraduationCap },
            { label: 'Year', value: year, onChange: setYear, icon: Calendar },
            { label: 'University', value: university, onChange: null, icon: Building },
          ].map((field) => (
            <div key={field.label} className="space-y-1">
              <label className="text-xs text-muted-foreground flex items-center gap-1"><field.icon className="h-3 w-3" /> {field.label}</label>
              <input type="text" value={field.value} readOnly={!field.onChange}
                onChange={field.onChange ? (e) => field.onChange(e.target.value) : undefined}
                className={`w-full px-3 py-2.5 rounded-xl border border-input text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all ${!field.onChange ? 'bg-muted/50 cursor-not-allowed' : 'bg-background/50'}`} />
            </div>
          ))}
        </div>
        <button onClick={() => toast.success('Profile updated!')}
          className="gradient-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 hover:opacity-90 transition shadow-elevated">
          <Save className="h-4 w-4" /> Save Changes
        </button>
      </motion.div>

      {/* Study Preferences */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="bg-card/80 backdrop-blur-sm rounded-xl p-5 shadow-card border border-border/50 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Study Preferences</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground">Low Bandwidth Mode</p>
              <p className="text-xs text-muted-foreground">Reduce data usage</p>
            </div>
            <ToggleSwitch />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground">Push Notifications</p>
              <p className="text-xs text-muted-foreground">Study reminders and updates</p>
            </div>
            <ToggleSwitch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground">Auto-detect Device</p>
              <p className="text-xs text-muted-foreground">Adapt content to your device</p>
            </div>
            <ToggleSwitch defaultChecked />
          </div>
        </div>
      </motion.div>

      {/* Danger Zone */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="bg-card/80 backdrop-blur-sm rounded-xl p-5 shadow-card border border-destructive/20 space-y-3">
        <h3 className="text-sm font-semibold text-destructive">Danger Zone</h3>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm text-foreground hover:bg-muted/50 transition">
          <Lock className="h-4 w-4" /> Change Password
        </button>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl border border-destructive/30 text-sm text-destructive hover:bg-destructive/10 transition">
          <Trash2 className="h-4 w-4" /> Delete Account
        </button>
      </motion.div>
    </div>
  );
}

function ToggleSwitch({ defaultChecked = false }: { defaultChecked?: boolean }) {
  const [on, setOn] = useState(defaultChecked);
  return (
    <button onClick={() => setOn(!on)} className={`w-11 h-6 rounded-full transition-colors relative ${on ? 'bg-primary' : 'bg-muted'}`}>
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-card shadow transition-transform ${on ? 'translate-x-5' : ''}`} />
    </button>
  );
}
