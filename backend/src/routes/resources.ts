import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, type AuthedRequest } from '../auth-middleware.js';
import { uid } from '../util.js';
import { aiJson, hasAi } from '../ai.js';

export const resourcesRouter = Router();
resourcesRouter.use(requireAuth);

interface ResourceSeed { title: string; type: string; subject: string; duration: string; rating: number; url?: string }

function rowToApi(r: any) {
  return {
    id: r.id, title: r.title, type: r.type, subject: r.subject,
    rating: r.rating, duration: r.duration ?? '', url: r.url,
    bookmarked: !!r.bookmarked,
  };
}

resourcesRouter.get('/', async (req: AuthedRequest, res) => {
  const rows: any[] = await db.prepare('SELECT * FROM resources WHERE user_id=? ORDER BY created_at DESC').all(req.userId!);
  res.json({ resources: rows.map(rowToApi) });
});

resourcesRouter.post('/', async (req: AuthedRequest, res) => {
  const { title, type, subject, url, duration, rating } = req.body ?? {};
  if (!title || !type || !subject || !url) return res.status(400).json({ error: 'title, type, subject, url required' });
  const id = uid();
  await db.prepare('INSERT INTO resources (id, user_id, title, type, subject, url, duration, rating) VALUES (?,?,?,?,?,?,?,?)')
    .run(id, req.userId!, title, type, subject, url, duration || null, Number(rating) || 0);
  const row = await db.prepare('SELECT * FROM resources WHERE id=?').get(id);
  res.json({ resource: rowToApi(row) });
});

resourcesRouter.post('/generate', async (req: AuthedRequest, res) => {
  const user: any = await db.prepare('SELECT name, department, year, university FROM users WHERE id=?').get(req.userId!);
  const materials: any[] = await db.prepare('SELECT title, subject FROM materials WHERE user_id=? ORDER BY upload_date DESC LIMIT 12').all(req.userId!);
  const subjects = [...new Set(materials.map(m => String(m.subject || '').trim()).filter(Boolean))];

  let resources: ResourceSeed[];
  if (hasAi()) {
    try {
      resources = await aiJson<ResourceSeed[]>(`Create 10 high-quality, diverse study resources for this Nigerian university student.
Profile: ${JSON.stringify(user)}
Uploaded materials/subjects: ${JSON.stringify(materials)}
Return STRICT JSON array only (no markdown, no extra text):
[{"title":"descriptive resource title","type":"Video|Article|PDF","subject":"exact course name","duration":"15 min","rating":4.8,"url":"REAL_URL"}]
URL rules (must be real, working URLs):
- YouTube videos: https://www.youtube.com/results?search_query=ENCODED_QUERY
- Wikipedia articles: https://en.wikipedia.org/wiki/TOPIC_NAME
- Khan Academy: https://www.khanacademy.org/search?referer=%2F&page_search_query=ENCODED_QUERY
- Google Scholar: https://scholar.google.com/scholar?q=ENCODED_QUERY
- Google search: https://www.google.com/search?q=ENCODED_QUERY
Mix 4 YouTube videos, 3 Wikipedia/Google articles, and 3 Khan Academy/Scholar resources.
Each resource must directly relate to the student's uploaded subjects or department.`);
      if (!Array.isArray(resources) || resources.length === 0) throw new Error('empty');
    } catch {
      resources = defaultResources(subjects, user?.department);
    }
  } else {
    resources = defaultResources(subjects, user?.department);
  }

  await db.prepare('DELETE FROM resources WHERE user_id=?').run(req.userId!);
  const ins = await db.prepare('INSERT INTO resources (id, user_id, title, type, subject, url, duration, rating) VALUES (?,?,?,?,?,?,?,?)');
  for (const r of resources.slice(0, 10)) {
    const subject = r.subject || subjects[0] || user?.department || 'General Studies';
    const query = encodeURIComponent(`${subject} ${r.title} university study guide`);
    await ins.run(uid(), req.userId!, r.title, r.type || 'Article', subject, r.url || `https://www.google.com/search?q=${query}`, r.duration || '15 min', Number(r.rating) || 4.5);
  }
  const rows: any[] = await db.prepare('SELECT * FROM resources WHERE user_id=? ORDER BY created_at DESC').all(req.userId!);
  res.json({ resources: rows.map(rowToApi) });
});

function defaultResources(subjects: string[], department?: string): ResourceSeed[] {
  const base = subjects.length ? subjects : [department || 'Computer Science', 'Data Structures and Algorithms', 'Cybersecurity Fundamentals'];
  return base.slice(0, 4).flatMap((subject) => ([
    { title: `${subject} – Full Lecture (YouTube)`, type: 'Video', subject, duration: '20 min', rating: 4.8, url: `https://www.youtube.com/results?search_query=${encodeURIComponent(subject + ' university lecture')}` },
    { title: `${subject} – Wikipedia Overview`, type: 'Article', subject, duration: '10 min', rating: 4.6, url: `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(subject)}` },
    { title: `${subject} – Khan Academy`, type: 'Article', subject, duration: '15 min', rating: 4.7, url: `https://www.khanacademy.org/search?referer=%2F&page_search_query=${encodeURIComponent(subject)}` },
  ]));
}

resourcesRouter.patch('/:id/bookmark', async (req: AuthedRequest, res) => {
  const r: any = await db.prepare('SELECT bookmarked FROM resources WHERE id=? AND user_id=?').get(req.params.id, req.userId!);
  if (!r) return res.status(404).json({ error: 'Not found' });
  const next = r.bookmarked ? 0 : 1;
  await db.prepare('UPDATE resources SET bookmarked=? WHERE id=?').run(next, req.params.id);
  res.json({ bookmarked: !!next });
});

resourcesRouter.delete('/:id', async (req: AuthedRequest, res) => {
  await db.prepare('DELETE FROM resources WHERE id=? AND user_id=?').run(req.params.id, req.userId!);
  res.json({ message: 'Deleted' });
});
