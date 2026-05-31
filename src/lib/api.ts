const configuredBaseUrl = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL) as string | undefined;
const BASE_URL = configuredBaseUrl?.replace(/\/$/, '') || '/api';

function getToken(): string | null {
  return localStorage.getItem('studymate_token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const isFormData = options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> || {}),
  };

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  const data = await res.json();
  if ((res.status === 401 || res.status === 403) && token) {
    localStorage.removeItem('studymate_token');
    localStorage.removeItem('studymate_user');
    window.location.href = '/login';
    throw new Error('Session expired');
  }
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data as T;
}

const get = <T>(path: string) => request<T>(path, { method: 'GET' });
const post = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined });
const put = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined });
const patch = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined });
const del = <T>(path: string) => request<T>(path, { method: 'DELETE' });

// ─── Types ──────────────────────────────────────────────────────────────────
export interface ApiUser {
  id: string;
  name: string;
  email: string;
  department: string;
  year: string;
  university: string;
  avatar?: string;
  study_streak: number;
  level: number;
  points: number;
}

export interface ApiMaterial {
  id: string;
  title: string;
  subject: string;
  file_type: string;
  file_name: string;
  file_size: string;
  status: 'processing' | 'ready' | 'error';
  upload_date: string;
}

export interface ProgressStatsResponse {
  stats: { studyHours: string; materialCount: number; quizCount: number; avgScore: number; studyStreak: number; level: number; points: number; completionRate: number; studyConsistency: number; improvement: number; hasAnyData: boolean };
  studyBySubject: { subject: string; hours: number }[];
  weeklyPerformance: { week: string; score: number }[];
  subjectBreakdown: { subject: string; hours: number; avg_score: number; quiz_count: number }[];
  radarData: { subject: string; score: number }[];
  recentActivity: { type: string; text: string; time: string }[];
  upcomingReminders: { title: string; time: string; recurrence: string }[];
  latestMaterials: { title: string; subject: string; file_type: string; upload_date: string }[];
  placeholders: { primarySubject: string; emptyChartsMessage: string };
}

export interface ApiChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  references: string[];
  timestamp: string;
}

export interface ApiQuiz {
  id: string;
  title: string;
  subject: string;
  question_count: number;
  duration: number;
  best_score?: number;
  attempt_count: number;
  status: 'available' | 'completed';
}

export interface ApiQuestion {
  id: string;
  question: string;
  type: 'multiple-choice' | 'true-false' | 'short-answer';
  options?: string[];
  correctAnswer: string;
  explanation: string;
  isCorrect?: boolean;
}

export interface ApiReminder {
  id: string;
  title: string;
  time: string;
  recurrence: string;
  enabled: boolean;
  condition?: string;
}

export interface ApiResource {
  id: string;
  title: string;
  type: string;
  subject: string;
  rating: number;
  duration: string;
  url: string;
  bookmarked: boolean;
}

export interface ApiRecommendation {
  id: string;
  topic: string;
  subject: string;
  estimated_time: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  reason: string;
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
}

// ─── Auth API ────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data: { name: string; email: string; password: string; department: string; year: string; university: string }) =>
    post<{ token: string; user: ApiUser }>('/auth/register', data),

  login: (email: string, password: string) =>
    post<{ token: string; user: ApiUser }>('/auth/login', { email, password }),

  me: () => get<{ user: ApiUser }>('/auth/me'),

  updateProfile: (data: { name: string; department: string; year: string }) =>
    put<{ user: ApiUser }>('/auth/profile', data),

  changePassword: (currentPassword: string, newPassword: string) =>
    put<{ message: string }>('/auth/change-password', { currentPassword, newPassword }),

  forgotPassword: (email: string, newPassword: string) =>
    post<{ message: string }>('/auth/forgot-password', { email, newPassword }),

  deleteAccount: () => del<{ message: string }>('/auth/account'),
};

// ─── Materials API ───────────────────────────────────────────────────────────
export const materialsApi = {
  list: () => get<{ materials: ApiMaterial[] }>('/materials'),

  fileUrl: (id: string) => `${BASE_URL}/materials/${id}/file`,

  fileBlob: async (id: string) => {
    const token = getToken();
    const res = await fetch(`${BASE_URL}/materials/${id}/file`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error('Failed to open material file');
    return res.blob();
  },

  upload: (file: File, title: string, subject: string) => {
    const form = new FormData();
    form.append('file', file);
    form.append('title', title);
    form.append('subject', subject);
    return request<{ material: ApiMaterial }>('/materials/upload', { method: 'POST', body: form });
  },

  get: (id: string) => get<{ material: ApiMaterial & { text_content: string } }>(`/materials/${id}`),

  delete: (id: string) => del<{ message: string }>(`/materials/${id}`),
};

// ─── Chat API ────────────────────────────────────────────────────────────────
export const chatApi = {
  getSessions: () => get<{ sessions: { id: string; title: string; last_message?: string; updated_at: string }[] }>('/chat/sessions'),

  createSession: (materialIds: string[] = []) =>
    post<{ session: { id: string; title: string } }>('/chat/sessions', { materialIds }),

  getMessages: (sessionId: string) =>
    get<{ session: { id: string; title: string; material_ids: string }; messages: ApiChatMessage[] }>(`/chat/sessions/${sessionId}/messages`),

  sendMessage: (sessionId: string, content: string) =>
    post<{ userMessage: ApiChatMessage; aiMessage: ApiChatMessage }>(`/chat/sessions/${sessionId}/messages`, { content }),

  quickChat: (content: string, materialIds: string[] = []) =>
    post<{ content: string; references: string[]; timestamp: string }>('/chat/quick', { content, materialIds }),

  deleteSession: (sessionId: string) => del<{ message: string }>(`/chat/sessions/${sessionId}`),
};

// ─── Quizzes API ─────────────────────────────────────────────────────────────
export const quizzesApi = {
  list: () => get<{ quizzes: ApiQuiz[] }>('/quizzes'),

  generate: (materialId: string, questionCount = 10, duration = 15, types?: string[]) =>
    post<{ quiz: ApiQuiz & { questions: ApiQuestion[] } }>('/quizzes/generate', { materialId, questionCount, duration, types }),

  get: (id: string) => get<{ quiz: ApiQuiz & { questions: ApiQuestion[] } }>(`/quizzes/${id}`),

  submit: (id: string, answers: Record<string, string>) =>
    post<{ attempt: { id: string; score: number; total: number; percentage: number; pointsEarned: number }; questions: ApiQuestion[] }>(
      `/quizzes/${id}/submit`, { answers }
    ),

  getAttempts: (id: string) => get<{ attempts: { id: string; score: number; total: number; percentage: number; completed_at: string }[] }>(`/quizzes/${id}/attempts`),
};

// ─── Progress API ────────────────────────────────────────────────────────────
export const progressApi = {
  getStats: () => get<ProgressStatsResponse>('/progress/stats'),

  logSession: (subject: string, durationMinutes: number, activityType?: string) =>
    post<{ message: string }>('/progress/session', { subject, durationMinutes, activityType }),
};

// ─── Reminders API ───────────────────────────────────────────────────────────
export const remindersApi = {
  list: () => get<{ reminders: ApiReminder[] }>('/reminders'),

  create: (data: { title: string; time: string; recurrence: string; condition?: string }) =>
    post<{ reminder: ApiReminder }>('/reminders', data),

  update: (id: string, data: Partial<ApiReminder>) =>
    put<{ reminder: ApiReminder }>(`/reminders/${id}`, data),

  delete: (id: string) => del<{ message: string }>(`/reminders/${id}`),
};

// ─── Resources API ───────────────────────────────────────────────────────────
export const resourcesApi = {
  list: () => get<{ resources: ApiResource[] }>('/resources'),

  generate: () => post<{ resources: ApiResource[] }>('/resources/generate'),

  create: (data: { title: string; type: string; subject: string; url: string; duration?: string; rating?: number }) =>
    post<{ resource: ApiResource }>('/resources', data),

  toggleBookmark: (id: string) => patch<{ bookmarked: boolean }>(`/resources/${id}/bookmark`),

  delete: (id: string) => del<{ message: string }>(`/resources/${id}`),
};

// ─── Leaderboard API ─────────────────────────────────────────────────────────
export const leaderboardApi = {
  get: () =>
    get<{
      leaderboard: { id: string; name: string; department: string; points: number; streak: number; level: number; quizzes: number; avatar: string; rank: number }[];
      myRank: { rank: number; points: number } | null;
    }>('/leaderboard'),
};

// ─── Study Plan API ──────────────────────────────────────────────────────────
export const studyPlanApi = {
  list: () => get<{ plans: { id: string; exam_date: string; subject: string; created_at: string }[] }>('/study-plan'),

  get: (id: string) =>
    get<{ plan: { id: string; exam_date: string; subject: string; plan: { day: number; date: string; subject: string; focus: string; topics: string[]; hours: number; type: string }[] } }>(`/study-plan/${id}`),

  generate: (examDate: string, subject: string) =>
    post<{ plan: { id: string; examDate: string; subject: string; plan: { day: number; date: string; subject: string; focus: string; topics: string[]; hours: number; type: string }[] } }>(
      '/study-plan/generate', { examDate, subject }
    ),
};

// ─── Summarizer API ──────────────────────────────────────────────────────────
export const summarizerApi = {
  summarizeText: (text: string) => post<{ summary: string }>('/summarizer/text', { text }),

  summarizeMaterial: (materialId: string) =>
    post<{ summary: string; materialTitle: string }>(`/summarizer/material/${materialId}`),

  analyzeMaterial: (materialId: string) =>
    post<{ summary: string; questions: string[]; insights: string[] }>(`/summarizer/material/${materialId}/full`),
};

// ─── Recommendations API ─────────────────────────────────────────────────────
export const recommendationsApi = {
  get: () => get<{ recommendations: ApiRecommendation[] }>('/recommendations'),

  generate: () => post<{ recommendations: ApiRecommendation[] }>('/recommendations/generate'),

  markComplete: (id: string) => patch<{ message: string }>(`/recommendations/${id}/complete`),
};

// ─── Exam Planner Types & API ─────────────────────────────────────────────────
export interface ApiTimetable {
  id: string;
  title: string;
  type: 'school' | 'exam';
  content: string;
  created_at: string;
}

export interface ApiExamPlan {
  id: string;
  exam_date: string;
  schedule: {
    day: string;
    date: string;
    tasks: {
      time: string;
      subject: string;
      activity: string;
      duration: string;
    }[];
  }[];
  created_at: string;
}

export const examPlannerApi = {
  listTimetables: () => get<{ timetables: ApiTimetable[] }>('/exam-planner/timetables'),
  
  uploadTimetable: (file: File, title: string, type: 'school' | 'exam') => {
    const form = new FormData();
    form.append('file', file);
    form.append('title', title);
    form.append('type', type);
    return request<{ timetable: ApiTimetable }>('/exam-planner/timetables', { method: 'POST', body: form });
  },
  
  deleteTimetable: (id: string) => del<{ message: string }>(`/exam-planner/timetables/${id}`),
  
  listPlans: () => get<{ plans: ApiExamPlan[] }>('/exam-planner/plans'),
  
  generatePlan: (timetableIds: string[], examDate: string) =>
    post<{ plan: ApiExamPlan }>('/exam-planner/plans', { timetableIds, examDate }),
  
  deletePlan: (id: string) => del<{ message: string }>(`/exam-planner/plans/${id}`),
};
