import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { analyticsService, flashcardService, courseService, studyPlanService } from '../services';
import { useAuthStore } from '../store/auth';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import {
  BookOpen, CreditCard, CheckCircle2, TrendingUp, ArrowRight,
  Brain, Clock, FileText, Sparkles, RotateCcw, Trash2,
  ChevronDown, X, Activity, Target,
} from 'lucide-react';
import { useState, useMemo, useRef, useEffect } from 'react';

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(isoString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface Lecture {
  id: string;
  title: string;
  courseTitle: string;
}

interface StudyTask {
  id: string;
  title: string;
  type: 'read' | 'quiz' | 'flashcard' | 'review';
  duration: string;
  priority: 'high' | 'medium' | 'low';
  course: string;
}

/* ─── Config maps ────────────────────────────────────────────────────────── */
const activityIconMap: Record<string, { icon: typeof Brain; bg: string; text: string }> = {
  quiz:       { icon: Target,     bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  flashcards: { icon: CreditCard, bg: 'bg-purple-500/10',  text: 'text-purple-400'  },
  lecture:    { icon: FileText,    bg: 'bg-yellow-500/10',  text: 'text-yellow-400'  },
  course:     { icon: BookOpen,    bg: 'bg-blue-500/10',    text: 'text-blue-400'    },
  summary:    { icon: Brain,       bg: 'bg-blue-500/10',    text: 'text-blue-400'    },
};

const priorityBadge: Record<string, string> = {
  high:   'bg-red-500/10 text-red-400 border border-red-500/20',
  medium: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
  low:    'bg-slate-700/50 text-slate-400 border border-slate-700',
};

const taskTypeIcon: Record<string, { icon: typeof Brain; color: string }> = {
  read:      { icon: FileText,   color: 'text-blue-400'    },
  quiz:      { icon: Target,     color: 'text-emerald-400' },
  flashcard: { icon: CreditCard, color: 'text-purple-400'  },
  review:    { icon: RotateCcw,  color: 'text-yellow-400'  },
};

/* ─── Activity Row ───────────────────────────────────────────────────────── */
function ActivityRow({ item }: { item: any }) {
  const cfg = activityIconMap[item.type] || activityIconMap.course;
  const Icon = cfg.icon;
  return (
    <div className="flex items-center gap-4 py-3.5 border-b border-slate-800/60 last:border-0 group hover:bg-slate-900/40 rounded-xl px-3 -mx-3 transition-colors">
      <div className={`w-9 h-9 rounded-xl ${cfg.bg} flex items-center justify-center shrink-0`}>
        <Icon className={`w-4 h-4 ${cfg.text}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white font-medium truncate">{item.label}</p>
        {item.subLabel && <p className="text-xs text-slate-500 truncate mt-0.5">{item.subLabel}</p>}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {item.score !== undefined && (
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${item.score >= 85 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
            {item.score}%
          </span>
        )}
        <span className="text-xs text-slate-600">{timeAgo(item.time)}</span>
      </div>
    </div>
  );
}

/* ─── Study Plan Task ────────────────────────────────────────────────────── */
function StudyPlanTask({ task, onRemove }: { task: StudyTask; onRemove: (id: string) => void }) {
  const [done, setDone] = useState(false);
  const cfg = taskTypeIcon[task.type] || taskTypeIcon.read;
  const Icon = cfg.icon;
  return (
    <div className={`flex items-center gap-4 py-3.5 border-b border-slate-800/60 last:border-0 px-3 -mx-3 transition-all group ${done ? 'opacity-40' : ''}`}>
      <button
        onClick={() => setDone(!done)}
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
          done ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600 hover:border-purple-500'
        }`}
      >
        {done && <CheckCircle2 className="w-3 h-3 text-white" />}
      </button>
      <div className="w-8 h-8 rounded-lg bg-slate-800/80 flex items-center justify-center shrink-0">
        <Icon className={`w-4 h-4 ${cfg.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate transition-all ${done ? 'line-through text-slate-500' : 'text-white'}`}>{task.title}</p>
        <p className="text-xs text-slate-500 mt-0.5">{task.course}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {task.duration && (
          <span className="flex items-center gap-1 text-xs text-slate-500">
            <Clock className="w-3 h-3" />
            {task.duration}
          </span>
        )}
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded capitalize ${priorityBadge[task.priority]}`}>
          {task.priority}
        </span>
        <button
          onClick={() => onRemove(task.id)}
          className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all ml-1"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

/* ─── Lecture Multi-Select ────────────────────────────────────────────────── */
function LectureMultiSelect({
  lectures,
  selected,
  onChange,
}: {
  lectures: Lecture[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filtered = useMemo(
    () => lectures.filter((l) => l.title.toLowerCase().includes(search.toLowerCase()) || l.courseTitle.toLowerCase().includes(search.toLowerCase())),
    [lectures, search]
  );

  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  }

  const selectedTitles = lectures.filter((l) => selected.includes(l.id)).map((l) => l.title);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-sm text-slate-300 hover:border-slate-600 transition-colors min-w-[180px] justify-between"
      >
        <span className="truncate">
          {selected.length === 0
            ? 'All lectures'
            : selected.length === 1
            ? selectedTitles[0]
            : `${selected.length} lectures selected`}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          {selected.length > 0 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange([]); }}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-3 h-3" />
            </button>
          )}
          <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1.5 w-64 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl shadow-black/50 z-30 overflow-hidden">
          <div className="p-2 border-b border-slate-800">
            <input
              autoFocus
              type="text"
              placeholder="Search lectures..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
          </div>
          <div className="max-h-52 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <p className="px-4 py-3 text-sm text-slate-500">No lectures found</p>
            ) : (
              filtered.map((l) => {
                const checked = selected.includes(l.id);
                return (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => toggle(l.id)}
                    className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors text-sm text-left"
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                      checked ? 'bg-purple-500 border-purple-500' : 'border-slate-600 bg-slate-900'
                    }`}>
                      {checked && <CheckCircle2 className="w-3 h-3 text-white" />}
                    </div>
                    <span className={`flex-1 truncate ${checked ? 'text-white' : 'text-slate-400'}`}>{l.title}</span>
                    <span className="text-xs text-slate-600 truncate max-w-[80px]">{l.courseTitle}</span>
                  </button>
                );
              })
            )}
          </div>
          <div className="border-t border-slate-800 px-3 py-2 flex justify-between">
            <button onClick={() => onChange([])} className="text-xs text-slate-500 hover:text-slate-300">Clear all</button>
            <button onClick={() => setOpen(false)} className="text-xs text-purple-400 hover:text-purple-300 font-medium">Done</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Study Plan Section ─────────────────────────────────────────────────── */
type PlanState = 'empty' | 'generating' | 'ready';

function StudyPlanSection({
  savedPlan,
  planLoading,
  allLectures,
  onGenerate,
  onDelete,
  isGenerating,
  isDeletingPlan,
}: {
  savedPlan: any;
  planLoading: boolean;
  allLectures: Lecture[];
  onGenerate: (examDate: string, lectureIds: string[]) => void;
  onDelete: () => void;
  isGenerating: boolean;
  isDeletingPlan: boolean;
}) {
  const [examDate, setExamDate] = useState('');
  const [selectedLectureIds, setSelectedLectureIds] = useState<string[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const planState: PlanState = isGenerating ? 'generating' : (savedPlan && !planLoading ? 'ready' : 'empty');

  const tasks: StudyTask[] = useMemo(() => {
    if (!savedPlan?.dailyGoals) return [];
    return savedPlan.dailyGoals.map((goal: string, idx: number) => ({
      id: `t${idx}`,
      title: goal,
      type: idx % 4 === 0 ? 'read' : idx % 4 === 1 ? 'flashcard' : idx % 4 === 2 ? 'quiz' : 'review',
      duration: `${15 + idx * 5} min`,
      priority: idx < 2 ? 'high' : idx < 4 ? 'medium' : 'low',
      course: savedPlan.selectedLectures?.[idx % (savedPlan.selectedLectures?.length || 1)] || 'All courses',
    }));
  }, [savedPlan]);

  const [visibleTasks, setVisibleTasks] = useState<StudyTask[]>(tasks);
  useEffect(() => { setVisibleTasks(tasks); }, [tasks]);

  const removeTask = (id: string) => setVisibleTasks((prev) => prev.filter((t) => t.id !== id));

  return (
    <div className="bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/60">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-600/20 border border-purple-500/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm">Personalized Study Plan</h3>
            <p className="text-slate-500 text-xs mt-0.5">AI-generated based on your progress</p>
          </div>
        </div>

        {planState === 'ready' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setExamDate('');
                setSelectedLectureIds([]);
                onGenerate(savedPlan?.examDate || '', []);
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Regenerate
            </button>
            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { onDelete(); setConfirmDelete(false); }}
                  disabled={isDeletingPlan}
                  className="text-xs px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors"
                >
                  {isDeletingPlan ? 'Deleting...' : 'Confirm'}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="text-xs px-3 py-2 bg-slate-800 text-slate-400 rounded-xl transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-red-400 bg-slate-800/60 hover:bg-red-500/10 border border-slate-700/60 hover:border-red-500/30 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear
              </button>
            )}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="px-6 py-5">
        {/* Empty state */}
        {planState === 'empty' && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/10 to-blue-600/10 border border-purple-500/20 flex items-center justify-center mb-4">
              <Brain className="w-8 h-8 text-purple-400" />
            </div>
            <h4 className="text-white font-semibold mb-2">No study plan yet</h4>
            <p className="text-slate-500 text-sm max-w-xs mb-6 leading-relaxed">
              Let AI analyse your progress and create a personalised study schedule for today's session.
            </p>

            <div className="flex flex-col items-center gap-4 mb-6 w-full max-w-sm">
              <div className="flex items-center gap-3 w-full">
                <span className="text-xs text-slate-500 shrink-0">Exam date:</span>
                <input
                  type="date"
                  value={examDate}
                  min={todayISO()}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
                />
              </div>
              {allLectures.length > 0 && (
                <div className="flex items-center gap-3 w-full">
                  <span className="text-xs text-slate-500 shrink-0">Focus on:</span>
                  <LectureMultiSelect lectures={allLectures} selected={selectedLectureIds} onChange={setSelectedLectureIds} />
                </div>
              )}
            </div>

            <button
              onClick={() => onGenerate(examDate, selectedLectureIds)}
              disabled={!examDate}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-500 to-blue-600 text-white rounded-xl font-semibold text-sm hover:from-purple-600 hover:to-blue-700 transition-all shadow-lg shadow-purple-500/20 group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-4 h-4" />
              Generate My Study Plan
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        )}

        {/* Generating state */}
        {planState === 'generating' && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/15 to-blue-600/15 border border-purple-500/20 flex items-center justify-center mb-5 relative">
              <Sparkles className="w-7 h-7 text-purple-400 animate-pulse" />
              <div className="absolute inset-0 rounded-2xl border-2 border-purple-500/30 animate-ping" />
            </div>
            <h4 className="text-white font-semibold mb-2">Analysing your progress…</h4>
            <p className="text-slate-500 text-sm mb-6">AI is reviewing your courses, quiz history, and flashcard performance</p>
            <div className="flex gap-1.5">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 120}ms` }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Ready state */}
        {planState === 'ready' && (
          <div>
            {/* Plan overview */}
            {savedPlan?.plan && (
              <div className="mb-5 p-4 bg-slate-800/40 rounded-xl border border-slate-700/50">
                <p className="text-sm text-slate-300 leading-relaxed">{savedPlan.plan}</p>
                <p className="text-xs text-slate-500 mt-2">
                  Exam: {new Date(savedPlan.examDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  {' · '}Generated {timeAgo(savedPlan.generatedAt)}
                </p>
              </div>
            )}

            {/* Progress header */}
            {visibleTasks.length > 0 && (
              <>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-500">Daily Goals</span>
                  <span className="text-xs text-slate-500">{visibleTasks.length} tasks</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full mb-5 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-purple-500 to-blue-600 rounded-full transition-all" style={{ width: '0%' }} />
                </div>
              </>
            )}

            {/* Task list */}
            <div>
              {visibleTasks.map((task) => (
                <StudyPlanTask key={task.id} task={task} onRemove={removeTask} />
              ))}
              {visibleTasks.length === 0 && (
                <div className="text-center py-6">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                  <p className="text-white font-semibold">All clear!</p>
                  <p className="text-slate-500 text-sm mt-1">No daily goals in this plan. Try regenerating.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: analytics } = useQuery({
    queryKey: ['analytics'],
    queryFn: () => analyticsService.getAnalytics(),
  });

  const { data: dueFlashcards } = useQuery({
    queryKey: ['flashcards', 'due'],
    queryFn: () => flashcardService.getDueFlashcards(),
  });

  const { data: courses } = useQuery({
    queryKey: ['courses'],
    queryFn: () => courseService.getCourses(),
    select: (data) => {
      const normalized = data?.data?.data || data?.data || data || [];
      return normalized;
    },
  });

  const allLectures: Lecture[] = useMemo(() => {
    if (!Array.isArray(courses)) return [];
    return courses.flatMap((c: any) =>
      (c.lectures || []).map((l: any) => ({ id: l.id, title: l.title, courseTitle: c.title }))
    );
  }, [courses]);

  const { data: activityData } = useQuery({
    queryKey: ['activity'],
    queryFn: () => analyticsService.getActivity(),
    select: (res) => {
      const d = res?.data;
      return Array.isArray(d) ? d : (d?.data || []);
    },
  });

  const { data: savedPlan, isLoading: planLoading } = useQuery({
    queryKey: ['study-plan'],
    queryFn: () => studyPlanService.getStudyPlan(),
    select: (res) => res?.data ?? null,
    retry: false,
  });

  const studyPlanMutation = useMutation({
    mutationFn: ({ examDate, lectureIds }: { examDate: string; lectureIds: string[] }) =>
      studyPlanService.generateStudyPlan(examDate, lectureIds.length > 0 ? lectureIds : undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['study-plan'] });
    },
  });

  const deletePlanMutation = useMutation({
    mutationFn: () => studyPlanService.deleteStudyPlan(),
    onSuccess: () => {
      queryClient.setQueryData(['study-plan'], null);
      queryClient.invalidateQueries({ queryKey: ['study-plan'] });
    },
  });

  const stats = [
    { icon: BookOpen,     iconBg: 'bg-purple-500/10', iconColor: 'text-purple-400', value: courses?.length || 0,                    label: 'Courses',       trend: '+2',   trendDir: 'up'   },
    { icon: CheckCircle2, iconBg: 'bg-blue-500/10',   iconColor: 'text-blue-400',   value: dueFlashcards?.data?.data?.length || 0,  label: 'Due Today',     trend: 'tasks', trendDir: null  },
    { icon: CreditCard,   iconBg: 'bg-emerald-500/10',iconColor: 'text-emerald-400',value: analytics?.data?.quizzesTaken || 0,      label: 'Quizzes Taken', trend: '+23',  trendDir: 'up'   },
    { icon: TrendingUp,   iconBg: 'bg-yellow-500/10', iconColor: 'text-yellow-400', value: `${analytics?.data?.avgScore || 0}%`,    label: 'Avg Score',     trend: '+4%',  trendDir: 'up'   },
  ];

  return (
    <Layout>
      <div className="px-8 py-8 max-w-7xl">

        {/* Page heading */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-1.5">
            Welcome back, {user?.name?.split(' ')[0]}! 👋
          </h1>
          <p className="text-slate-400">Here's what's happening with your studies today</p>
        </div>

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-4 gap-5 mb-8">
          {stats.map(({ icon: Icon, iconBg, iconColor, value, label, trend, trendDir }) => (
            <div key={label} className="bg-slate-900 border border-slate-800/80 rounded-xl p-5 hover:border-slate-700/80 transition-colors group">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${iconColor}`} />
                </div>
                {trendDir && (
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-lg ${
                    trendDir === 'up' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                  }`}>
                    {trendDir === 'up' ? '↑' : '↓'} {trend}
                  </span>
                )}
              </div>
              <div className="text-3xl font-bold text-white mb-0.5">{value}</div>
              <div className="text-slate-400 text-sm">{label}</div>
            </div>
          ))}
        </div>

        {/* ── Quick action cards ── */}
        <div className="grid grid-cols-2 gap-5 mb-8">
          <div
            onClick={() => navigate('/courses')}
            className="relative overflow-hidden bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 rounded-2xl p-7 cursor-pointer hover:brightness-110 transition-all group"
          >
            <div className="absolute -top-6 -right-6 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
            <div className="absolute bottom-0 right-8 w-24 h-24 bg-purple-400/10 rounded-full blur-xl" />
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15 flex items-center justify-center mb-5">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-1.5">My Courses</h3>
              <p className="text-purple-100/80 text-sm leading-relaxed mb-5">
                View all your courses, lectures, and study materials in one place
              </p>
              <div className="flex items-center gap-2 text-white text-sm font-semibold group-hover:gap-3 transition-all">
                <span>Open Courses</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </div>

          <div
            onClick={() => navigate('/review')}
            className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-cyan-800 rounded-2xl p-7 cursor-pointer hover:brightness-110 transition-all group"
          >
            <div className="absolute -top-6 -right-6 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
            <div className="absolute bottom-0 right-8 w-24 h-24 bg-blue-400/10 rounded-full blur-xl" />
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15 flex items-center justify-center mb-5">
                <CreditCard className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-1.5">Review Flashcards</h3>
              <p className="text-blue-100/80 text-sm leading-relaxed mb-5">
                Practice with AI-generated flashcards to reinforce your learning
              </p>
              <div className="flex items-center gap-2 text-white text-sm font-semibold group-hover:gap-3 transition-all">
                <span>Start Reviewing</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>

        {/* ── Bottom two-column grid ── */}
        <div className="grid grid-cols-5 gap-5">

          {/* Recent Activity — 2 cols */}
          <div className="col-span-2 bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/60">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center">
                  <Activity className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <h3 className="text-white font-semibold text-sm">Recent Activity</h3>
              </div>
              <button onClick={() => navigate('/courses')} className="text-xs text-purple-400 hover:text-purple-300 transition-colors">View all</button>
            </div>
            <div className="px-6 py-2">
              {activityData && activityData.length > 0 ? (
                activityData.slice(0, 5).map((item: any, idx: number) => (
                  <ActivityRow key={idx} item={item} />
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-slate-500 text-sm">No activity yet. Start by adding a course!</p>
                </div>
              )}
            </div>
          </div>

          {/* Study Plan — 3 cols */}
          <div className="col-span-3">
            <StudyPlanSection
              savedPlan={savedPlan}
              planLoading={planLoading}
              allLectures={allLectures}
              onGenerate={(examDate, lectureIds) => studyPlanMutation.mutate({ examDate, lectureIds })}
              onDelete={() => deletePlanMutation.mutate()}
              isGenerating={studyPlanMutation.isPending}
              isDeletingPlan={deletePlanMutation.isPending}
            />
          </div>
        </div>

      </div>
    </Layout>
  );
}
