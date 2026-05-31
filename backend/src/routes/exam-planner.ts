import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, type AuthedRequest } from '../auth-middleware.js';
import { uid } from '../util.js';
import { aiJson, hasAi } from '../ai.js';
import path from 'node:path';
import fs from 'node:fs';

export const examPlannerRouter = Router();
examPlannerRouter.use(requireAuth);

const uploadsDir = path.join(process.cwd(), 'uploads', 'timetables');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// ─── Timetables ──────────────────────────────────────────────────────────────

examPlannerRouter.get('/timetables', async (req: AuthedRequest, res) => {
  const rows: any[] = await db.prepare('SELECT * FROM timetables WHERE user_id=? ORDER BY created_at DESC').all(req.userId!);
  res.json({ 
    timetables: rows.map(r => ({ 
      id: r.id, title: r.title, type: r.type, 
      content: r.content?.slice(0, 200) + (r.content?.length > 200 ? '...' : ''),
      created_at: r.created_at 
    })) 
  });
});

examPlannerRouter.post('/timetables', async (req: AuthedRequest, res) => {
  // Handle multipart form data manually since we don't have multer
  const chunks: Buffer[] = [];
  
  req.on('data', (chunk: Buffer) => chunks.push(chunk));
  req.on('end', async () => {
    try {
      const data = Buffer.concat(chunks);
      const boundary = req.headers['content-type']?.split('boundary=')[1];
      if (!boundary) return res.status(400).json({ error: 'No boundary found' });
      
      const parts = parseMultipart(data, boundary);
      const title = parts.find(p => p.name === 'title')?.data?.toString() || '';
      const type = (parts.find(p => p.name === 'type')?.data?.toString() || 'school') as 'school' | 'exam';
      const file = parts.find(p => p.name === 'file');
      
      if (!title || !file) return res.status(400).json({ error: 'Title and file required' });
      
      // Extract text from file content
      const content = file.data.toString('utf-8');
      
      const id = uid();
      await db.prepare('INSERT INTO timetables (id, user_id, title, type, content) VALUES (?,?,?,?,?)')
        .run(id, req.userId!, title, type, content);
      
      const row = await db.prepare('SELECT * FROM timetables WHERE id=?').get(id);
      res.json({ 
        timetable: { 
          id: row.id, title: row.title, type: row.type, 
          content: row.content?.slice(0, 200) + '...',
          created_at: row.created_at 
        } 
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Upload failed' });
    }
  });
});

examPlannerRouter.delete('/timetables/:id', async (req: AuthedRequest, res) => {
  await db.prepare('DELETE FROM timetables WHERE id=? AND user_id=?').run(req.params.id, req.userId!);
  res.json({ message: 'Deleted' });
});

// ─── Study Plans ─────────────────────────────────────────────────────────────

interface StudyTask {
  time: string;
  subject: string;
  activity: string;
  duration: string;
}

interface StudyDay {
  day: string;
  date: string;
  tasks: StudyTask[];
}

examPlannerRouter.get('/plans', async (req: AuthedRequest, res) => {
  const rows: any[] = await db.prepare('SELECT * FROM exam_plans WHERE user_id=? ORDER BY created_at DESC').all(req.userId!);
  res.json({ 
    plans: rows.map(r => ({ 
      id: r.id, exam_date: r.exam_date, 
      schedule: JSON.parse(r.schedule_json || '[]'),
      created_at: r.created_at 
    })) 
  });
});

examPlannerRouter.post('/plans', async (req: AuthedRequest, res) => {
  const { timetableIds, examDate } = req.body ?? {};
  if (!timetableIds?.length || !examDate) {
    return res.status(400).json({ error: 'timetableIds and examDate required' });
  }
  
  // Fetch timetables
  const timetables: any[] = [];
  for (const id of timetableIds) {
    const row = await db.prepare('SELECT * FROM timetables WHERE id=? AND user_id=?').get(id, req.userId!);
    if (row) timetables.push(row);
  }
  
  if (timetables.length === 0) return res.status(404).json({ error: 'No timetables found' });
  
  const schoolTT = timetables.find(t => t.type === 'school');
  const examTT = timetables.find(t => t.type === 'exam');
  
  const prompt = `You are an expert academic study planner. Create a personalized study schedule based on the following timetables.

SCHOOL TIMETABLE (regular classes):
${schoolTT?.content || 'Not provided'}

EXAM TIMETABLE (exam dates and subjects):
${examTT?.content || 'Not provided'}

Exam period starts on: ${examDate}

Create a detailed day-by-day study schedule leading up to exams. Each day should include:
- Morning session (1-2 hours)
- Afternoon session (1-2 hours) 
- Evening review session (30-60 minutes)

Consider:
1. Subjects with exams soonest should be prioritized
2. Balance heavy and light subjects across days
3. Include specific study activities (review, practice questions, memorization)
4. Respect the school timetable - don't schedule study during class times
5. Include breaks and lighter days before big exams

Return STRICT JSON in this exact format:
{
  "schedule": [
    {
      "day": "Monday",
      "date": "2025-01-15",
      "tasks": [
        {"time": "4:00 PM - 6:00 PM", "subject": "Mathematics", "activity": "Practice past questions", "duration": "2 hours"}
      ]
    }
  ]
}`;

  let schedule: StudyDay[] = [];
  
  if (hasAi()) {
    try {
      const result = await aiJson<{ schedule: StudyDay[] }>(prompt);
      if (result?.schedule?.length > 0) schedule = result.schedule;
    } catch (e: any) {
      console.error('AI generation failed:', e);
    }
  }
  
  // Fallback if AI fails or unavailable
  if (schedule.length === 0) {
    schedule = generateFallbackSchedule(examDate, examTT?.content || '', schoolTT?.content || '');
  }
  
  const id = uid();
  await db.prepare('INSERT INTO exam_plans (id, user_id, exam_date, schedule_json) VALUES (?,?,?,?)')
    .run(id, req.userId!, examDate, JSON.stringify(schedule));
  
  res.json({ 
    plan: { 
      id, exam_date: examDate, schedule, 
      created_at: new Date().toISOString() 
    } 
  });
});

examPlannerRouter.delete('/plans/:id', async (req: AuthedRequest, res) => {
  await db.prepare('DELETE FROM exam_plans WHERE id=? AND user_id=?').run(req.params.id, req.userId!);
  res.json({ message: 'Deleted' });
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseMultipart(data: Buffer, boundary: string) {
  const parts: { name: string; filename?: string; data: Buffer }[] = [];
  const boundaryBuffer = Buffer.from('--' + boundary);
  let start = 0;
  
  while (true) {
    const idx = data.indexOf(boundaryBuffer, start);
    if (idx === -1) break;
    
    const nextIdx = data.indexOf(boundaryBuffer, idx + boundaryBuffer.length);
    if (nextIdx === -1) break;
    
    const part = data.slice(idx + boundaryBuffer.length, nextIdx);
    const headerEnd = part.indexOf('\r\n\r\n');
    if (headerEnd === -1) continue;
    
    const headers = part.slice(0, headerEnd).toString();
    const content = part.slice(headerEnd + 4, part.length - 2); // -2 for trailing \r\n
    
    const nameMatch = headers.match(/name="([^"]+)"/);
    const filenameMatch = headers.match(/filename="([^"]*)"/);
    
    if (nameMatch) {
      parts.push({
        name: nameMatch[1],
        filename: filenameMatch?.[1],
        data: content
      });
    }
    
    start = nextIdx;
  }
  
  return parts;
}

function generateFallbackSchedule(examDate: string, examContent: string, schoolContent: string): StudyDay[] {
  const start = new Date(examDate);
  const days: StudyDay[] = [];
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  // Parse subjects from exam content (simple extraction)
  const subjects = ['Mathematics', 'English', 'Physics', 'Chemistry', 'Biology', 'Literature']
    .filter(s => examContent.toLowerCase().includes(s.toLowerCase()));
  if (subjects.length === 0) subjects.push('General Studies');
  
  for (let i = -7; i <= 0; i++) {
    const date = new Date(start);
    date.setDate(date.getDate() + i);
    
    days.push({
      day: dayNames[date.getDay()],
      date: date.toISOString().split('T')[0],
      tasks: [
        { time: '6:00 AM - 8:00 AM', subject: subjects[i % subjects.length], activity: 'Morning review', duration: '2 hours' },
        { time: '4:00 PM - 6:00 PM', subject: subjects[(i + 1) % subjects.length], activity: 'Practice questions', duration: '2 hours' },
        { time: '8:00 PM - 9:00 PM', subject: subjects[(i + 2) % subjects.length], activity: 'Light revision', duration: '1 hour' }
      ]
    });
  }
  
  return days;
}
