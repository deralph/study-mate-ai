import { motion } from 'framer-motion';
import { Trophy, Medal, Crown, Flame, TrendingUp, Star } from 'lucide-react';

interface LeaderboardEntry {
  rank: number;
  name: string;
  department: string;
  points: number;
  streak: number;
  quizzes: number;
  level: number;
  avatar: string;
}

const leaderboardData: LeaderboardEntry[] = [
  { rank: 1, name: 'Omolara Adeyemi', department: 'Computer Science', points: 4850, streak: 21, quizzes: 42, level: 12, avatar: 'OA' },
  { rank: 2, name: 'Olamide Bakare', department: 'Mathematics', points: 4320, streak: 18, quizzes: 38, level: 11, avatar: 'OB' },
  { rank: 3, name: 'Olawale Fasanya', department: 'Engineering', points: 3980, streak: 15, quizzes: 35, level: 10, avatar: 'OF' },
  { rank: 4, name: 'Omobola Adesanya', department: 'Computer Science', points: 3650, streak: 12, quizzes: 30, level: 9, avatar: 'OA' },
  { rank: 5, name: 'Omolade Ige', department: 'Physics', points: 3420, streak: 10, quizzes: 28, level: 8, avatar: 'OI' },
  { rank: 6, name: 'Olabisi Oyekan', department: 'Biochemistry', points: 3100, streak: 9, quizzes: 25, level: 8, avatar: 'OO' },
  { rank: 7, name: 'Omowunmi Ajayi', department: 'Economics', points: 2890, streak: 7, quizzes: 22, level: 7, avatar: 'OA' },
  { rank: 8, name: 'Olakunle Daniels', department: 'Computer Science', points: 2650, streak: 6, quizzes: 20, level: 7, avatar: 'OD' },
  { rank: 9, name: 'Omolayo Femi', department: 'Accounting', points: 2400, streak: 5, quizzes: 18, level: 6, avatar: 'OF' },
  { rank: 10, name: 'Olabode Martins', department: 'Mass Communication', points: 2200, streak: 4, quizzes: 15, level: 6, avatar: 'OM' },
];

const rankStyles = [
  'from-yellow-400 to-amber-500', // gold
  'from-slate-300 to-slate-400', // silver
  'from-orange-400 to-orange-600', // bronze
];

const RankIcon = ({ rank }: { rank: number }) => {
  if (rank === 1) return <Crown className="h-5 w-5 text-yellow-500" />;
  if (rank === 2) return <Medal className="h-5 w-5 text-slate-400" />;
  if (rank === 3) return <Medal className="h-5 w-5 text-orange-500" />;
  return <span className="text-sm font-bold text-muted-foreground w-5 text-center">#{rank}</span>;
};

export default function Leaderboard() {
  const top3 = leaderboardData.slice(0, 3);
  const rest = leaderboardData.slice(3);

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Trophy className="h-6 w-6 text-accent" /> Leaderboard
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Top performers at AAUA — climb the ranks!</p>
      </div>

      {/* Top 3 Podium */}
      <div className="grid grid-cols-3 gap-3 items-end">
        {[top3[1], top3[0], top3[2]].map((entry, i) => {
          const heights = ['h-28', 'h-36', 'h-24'];
          const order = [1, 0, 2];
          return (
            <motion.div key={entry.rank} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.15 }}
              className="flex flex-col items-center">
              <div className={`w-14 h-14 lg:w-16 lg:h-16 rounded-full bg-gradient-to-br ${rankStyles[order[i]]} flex items-center justify-center text-white font-bold text-lg shadow-elevated mb-2`}>
                {entry.avatar}
              </div>
              <p className="text-xs lg:text-sm font-semibold text-foreground text-center truncate w-full">{entry.name.split(' ')[0]}</p>
              <p className="text-[10px] text-muted-foreground">{entry.points.toLocaleString()} pts</p>
              <div className={`${heights[i]} w-full mt-2 rounded-t-xl bg-gradient-to-t ${rankStyles[order[i]]} flex items-center justify-center opacity-20`}>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Points', value: leaderboardData.reduce((a, b) => a + b.points, 0).toLocaleString(), icon: Star, color: 'text-accent' },
          { label: 'Best Streak', value: `${leaderboardData[0].streak} days`, icon: Flame, color: 'text-destructive' },
          { label: 'Top Level', value: `Level ${leaderboardData[0].level}`, icon: TrendingUp, color: 'text-secondary' },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.05 }}
            className="bg-card/80 backdrop-blur-sm rounded-xl p-3 shadow-card border border-border/50 text-center">
            <stat.icon className={`h-5 w-5 mx-auto mb-1 ${stat.color}`} />
            <p className="text-sm font-bold text-foreground">{stat.value}</p>
            <p className="text-[10px] text-muted-foreground">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Full List */}
      <div className="bg-card/80 backdrop-blur-sm rounded-xl shadow-card border border-border/50 overflow-hidden">
        <div className="p-4 border-b border-border/50">
          <h3 className="text-sm font-semibold text-foreground">Full Rankings</h3>
        </div>
        <div className="divide-y divide-border/50">
          {leaderboardData.map((entry, i) => (
            <motion.div key={entry.rank} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.03 }}
              className={`flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition ${entry.rank <= 3 ? 'bg-accent/5' : ''}`}>
              <RankIcon rank={entry.rank} />
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-primary-foreground ${entry.rank <= 3 ? `bg-gradient-to-br ${rankStyles[entry.rank - 1]}` : 'bg-primary/70'}`}>
                {entry.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{entry.name}</p>
                <p className="text-[10px] text-muted-foreground">{entry.department} · Level {entry.level}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-foreground">{entry.points.toLocaleString()}</p>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground justify-end">
                  <span className="flex items-center gap-0.5"><Flame className="h-3 w-3 text-accent" />{entry.streak}</span>
                  <span>{entry.quizzes} quizzes</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
