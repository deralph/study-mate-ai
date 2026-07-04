import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import {
  Lightbulb, Clock, BookOpen, Search, LayoutGrid, ArrowRight, Wand2, ListTree, ChevronDown, FileText,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { materialsApi, type ApiMaterial } from '@/lib/api';
import {
  DEPARTMENTS, LEVELS, getDepartment, getCoursesForDept, dedupeCourses, searchCourses,
  levelFromYearLabel, type Course, type LevelNum,
} from '@/lib/course-data';

const statusColors: Record<'C' | 'E', string> = {
  C: 'bg-primary/10 text-primary',
  E: 'bg-accent/10 text-accent',
};

// Rough "study minutes" + difficulty derived from unit load and topic count —
// purely a heuristic so recommendations feel prioritized without needing quiz history.
function estimate(course: Course) {
  const minutes = Math.max(20, course.units * 20 + course.topics.length * 4);
  const difficulty: 'Easy' | 'Medium' | 'Hard' = course.units >= 3 ? 'Hard' : course.topics.length > 5 ? 'Medium' : 'Easy';
  return { minutes, difficulty };
}

const difficultyColors = { Easy: 'bg-secondary/10 text-secondary', Medium: 'bg-accent/10 text-accent', Hard: 'bg-destructive/10 text-destructive' };

/** Does the student already have a usable material for this course? */
function hasMaterialFor(course: Course, materials: ApiMaterial[]): boolean {
  const code = course.code.toLowerCase().replace(/\s+/g, '');
  const titleWords = course.title.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  return materials.some(m => {
    if (m.status !== 'ready') return false;
    const matSubject = (m.subject || '').toLowerCase().replace(/\s+/g, '');
    const matCourseCode = (m.course_code || '').toLowerCase().replace(/\s+/g, '');
    if (matCourseCode && matCourseCode === code) return true;
    if (matSubject.includes(code)) return true;
    const matText = `${m.title} ${m.subject}`.toLowerCase();
    return titleWords.length > 0 && titleWords.filter(w => matText.includes(w)).length >= Math.min(2, titleWords.length);
  });
}

export default function Recommendations() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const dept = user ? getDepartment(user.department) : undefined;
  const [deptId, setDeptId] = useState(dept?.id || DEPARTMENTS[0].id);
  const [level, setLevel] = useState<LevelNum>(user ? levelFromYearLabel(user.year) : 100);
  const [semester, setSemester] = useState<1 | 2>(1);
  const [query, setQuery] = useState('');
  const [materials, setMaterials] = useState<ApiMaterial[]>([]);
  const [showOutline, setShowOutline] = useState(false);

  useEffect(() => {
    materialsApi.list().then(d => setMaterials(d.materials)).catch(() => {});
  }, []);

  const catalogCourses = useMemo(
    () => dedupeCourses(getCoursesForDept(deptId, level, semester)),
    [deptId, level, semester]
  );

  const searchResults = useMemo(
    () => (query.trim() ? searchCourses(query, deptId, level) : []),
    [query, deptId, level]
  );

  const activeDept = getDepartment(deptId);

  const goStudyOrGenerate = (course: Course) => {
    if (hasMaterialFor(course, materials)) {
      navigate('/materials', { state: { filterCourseCode: course.code, filterCourseTitle: course.title } });
    } else {
      toast.info(`No study material for ${course.code} yet — generating study resources instead`);
      navigate('/resources', { state: { course: { code: course.code, title: course.title, topics: course.topics } } });
    }
  };

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Lightbulb className="h-6 w-6 text-primary" /> Course Recommendations
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          What to study next, pulled straight from the {activeDept?.name || 'Faculty of Computing'} syllabus for your level.
        </p>
      </div>

      {/* Controls: department (rarely changed) + level switcher + semester */}
      <div className="bg-card rounded-xl p-4 shadow-card flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-4 w-4 text-muted-foreground" />
          <select value={deptId} onChange={e => setDeptId(e.target.value)}
            className="text-sm rounded-lg border border-input bg-background px-2 py-1.5">
            {DEPARTMENTS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Level</span>
          <select value={level} onChange={e => setLevel(Number(e.target.value) as LevelNum)}
            className="text-sm rounded-lg border border-input bg-background px-2 py-1.5">
            {LEVELS.map(l => <option key={l} value={l}>{l} Level</option>)}
          </select>
        </div>
        <div className="flex items-center gap-1 ml-auto">
          {[1, 2].map(s => (
            <button key={s} onClick={() => setSemester(s as 1 | 2)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${semester === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              Semester {s}
            </button>
          ))}
        </div>
      </div>

      {/* Course code / topic search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search a course code or topic (e.g. CSC 301, recursion, cryptography)…"
          className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>

      {query.trim() && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Search results ({searchResults.length})</h3>
          {searchResults.length === 0 ? (
            <p className="text-sm text-muted-foreground">No course at {level} Level matches "{query}" for {activeDept?.name}. Try another level or department above.</p>
          ) : (
            searchResults.map(c => (
              <CourseCard key={c.code} course={c} hasMaterial={hasMaterialFor(c, materials)} onStudy={() => goStudyOrGenerate(c)} />
            ))
          )}
        </div>
      )}

      {!query.trim() && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" /> {level} Level · Semester {semester} courses ({catalogCourses.length})
          </h3>
          {catalogCourses.length === 0 ? (
            <p className="text-sm text-muted-foreground">No courses recorded for this level/semester combination yet.</p>
          ) : (
            catalogCourses
              .slice()
              .sort((a, b) => (a.status === b.status ? 0 : a.status === 'C' ? -1 : 1))
              .map(c => (
                <CourseCard key={c.code} course={c} hasMaterial={hasMaterialFor(c, materials)} onStudy={() => goStudyOrGenerate(c)} />
              ))
          )}
        </div>
      )}

      {/* Full syllabus outline browser */}
      <div className="bg-card rounded-xl shadow-card overflow-hidden">
        <button onClick={() => setShowOutline(v => !v)}
          className="w-full flex items-center justify-between gap-3 p-4 hover:bg-muted/40 transition">
          <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <ListTree className="h-4 w-4 text-secondary" /> Full syllabus outline — {activeDept?.name}
          </span>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showOutline ? 'rotate-180' : ''}`} />
        </button>
        <AnimatePresence initial={false}>
          {showOutline && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-border">
              <SyllabusOutline deptId={deptId} defaultLevel={level} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function CourseCard({ course, hasMaterial, onStudy }: { course: Course; hasMaterial: boolean; onStudy: () => void }) {
  const { minutes, difficulty } = estimate(course);
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-xl p-5 shadow-card border-l-4 border-primary/30 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-foreground">{course.code} — {course.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{course.units} unit{course.units !== 1 ? 's' : ''} · Level {course.level}</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[course.status]}`}>{course.status === 'C' ? 'Compulsory' : 'Elective'}</span>
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${difficultyColors[difficulty]}`}>{difficulty}</span>
        </div>
      </div>
      {course.topics.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {course.topics.slice(0, 6).map(t => (
            <span key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{t}</span>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3 w-3" /> ~{minutes} min focused study</span>
        <button onClick={onStudy}
          className={`text-sm font-medium flex items-center gap-1 hover:underline ${hasMaterial ? 'text-primary' : 'text-secondary'}`}>
          {hasMaterial ? <><FileText className="h-3.5 w-3.5" /> Study this course</> : <><Wand2 className="h-3.5 w-3.5" /> Generate resources</>}
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>
    </motion.div>
  );
}

function SyllabusOutline({ deptId, defaultLevel }: { deptId: string; defaultLevel: LevelNum }) {
  const [openLevel, setOpenLevel] = useState<LevelNum | null>(defaultLevel);

  return (
    <div className="divide-y divide-border">
      {LEVELS.map(lvl => {
        const courses = dedupeCourses(getCoursesForDept(deptId, lvl)).sort((a, b) => a.semester - b.semester || a.code.localeCompare(b.code));
        const isOpen = openLevel === lvl;
        return (
          <div key={lvl}>
            <button onClick={() => setOpenLevel(isOpen ? null : lvl)}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/30 transition">
              <span className="text-sm font-medium text-foreground">{lvl} Level <span className="text-xs text-muted-foreground font-normal">({courses.length} courses)</span></span>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
              <div className="px-4 pb-4 space-y-4">
                {[1, 2].map(sem => {
                  const semCourses = courses.filter(c => c.semester === sem);
                  if (semCourses.length === 0) return null;
                  return (
                    <div key={sem} className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Semester {sem}</p>
                      <ul className="space-y-2">
                        {semCourses.map(c => (
                          <li key={c.code} className="rounded-lg bg-muted/30 p-3">
                            <p className="text-sm text-foreground">
                              <span className="font-semibold">{c.code}</span> — {c.title}
                              <span className="text-xs text-muted-foreground"> · {c.units} unit{c.units !== 1 ? 's' : ''} · {c.status === 'C' ? 'Compulsory' : 'Elective'}</span>
                            </p>
                            {c.topics.length > 0 && (
                              <ul className="mt-1.5 pl-4 list-disc marker:text-muted-foreground/50 space-y-0.5">
                                {c.topics.map(t => (
                                  <li key={t} className="text-xs text-muted-foreground">{t}</li>
                                ))}
                              </ul>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
