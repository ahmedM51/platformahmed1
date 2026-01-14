
import { User, Subject, Lecture, Task, Note, StudyStats } from '../types';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// جلب الإعدادات من إعدادات البيئة المحقونة بواسطة Vite
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

// تهيئة العميل فقط إذا كانت البيانات متوفرة لمنع الخطأ القاتل Uncaught Error: supabaseUrl is required
export const supabase: SupabaseClient | null = (supabaseUrl && supabaseKey && supabaseUrl.startsWith('http')) 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;

if (!supabase) {
  console.warn("Supabase configuration is missing or invalid. Local storage will be used as fallback.");
}

const MOCK_USER_ID = '00000000-0000-0000-0000-000000000001';

const KEYS = {
  USER: 'smart_student_user',
  SUBJECTS: 'smart_student_subjects',
  TASKS: 'smart_student_tasks',
  NOTES: 'smart_student_notes',
  STATS: 'smart_student_stats'
};

const local = {
  get: (key: string) => {
    if (typeof window === 'undefined') return null;
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : null;
  },
  set: (key: string, val: any) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(val));
    }
  }
};

export const db = {
  saveUser: async (user: User) => {
    local.set(KEYS.USER, user);
    try {
      if (supabase) {
        await supabase.from('profiles').upsert({
          id: MOCK_USER_ID,
          email: user.email,
          full_name: user.full_name,
          xp: user.xp || 120
        });
      }
    } catch (e) { console.error("Database Save Error:", e); }
    return user;
  },
  
  getUser: async (): Promise<User | null> => {
    const localUser = local.get(KEYS.USER);
    try {
      if (supabase) {
        const { data } = await supabase.from('profiles').select('*').eq('id', MOCK_USER_ID).maybeSingle();
        if (data) {
          local.set(KEYS.USER, data);
          return data as User;
        }
      }
    } catch (e) {}
    return localUser;
  },

  getSubjects: async (): Promise<Subject[]> => {
    const localData = local.get(KEYS.SUBJECTS) || [];
    try {
      if (supabase) {
        const { data } = await supabase.from('subjects').select('*').eq('user_id', MOCK_USER_ID);
        if (data && data.length > 0) {
          local.set(KEYS.SUBJECTS, data);
          return data as Subject[];
        }
      }
    } catch (e) {}
    return localData;
  },
  
  saveSubject: async (sub: Partial<Subject>) => {
    const current = await db.getSubjects();
    const newSub = { ...sub, id: Date.now(), progress: 0, lectures: [], user_id: MOCK_USER_ID };
    local.set(KEYS.SUBJECTS, [...current, newSub]);
    try {
      if (supabase) {
        await supabase.from('subjects').insert({
          user_id: MOCK_USER_ID,
          name: sub.name,
          color: sub.color,
          progress: 0,
          lectures: []
        });
      }
      return await db.getSubjects();
    } catch (e) {}
    return [...current, newSub] as Subject[];
  },

  deleteSubject: async (id: number) => {
    const current = local.get(KEYS.SUBJECTS) || [];
    const updated = current.filter((s: any) => s.id !== id);
    local.set(KEYS.SUBJECTS, updated);
    try { 
      if (supabase) await supabase.from('subjects').delete().eq('id', id); 
    } catch (e) {}
    return updated;
  },

  addLecture: async (subjectId: number, lecture: any) => {
    const subjects = await db.getSubjects();
    const updated = subjects.map((s: any) => {
      if (s.id === subjectId) {
        const newLec = { ...lecture, id: Date.now(), isCompleted: false, date: new Date().toLocaleDateString('ar-EG') };
        const updatedLecs = [...(s.lectures || []), newLec];
        const completed = updatedLecs.filter((l: any) => l.isCompleted).length;
        const progress = updatedLecs.length > 0 ? Math.round((completed / updatedLecs.length) * 100) : 0;
        if (supabase) {
          supabase.from('subjects').update({ lectures: updatedLecs, progress }).eq('id', subjectId).then();
        }
        return { ...s, lectures: updatedLecs, progress };
      }
      return s;
    });
    local.set(KEYS.SUBJECTS, updated);
    return updated;
  },

  editLecture: async (subjectId: number, lectureId: number, updatedFields: any) => {
    const subjects = await db.getSubjects();
    const updated = subjects.map((s: any) => {
      if (s.id === subjectId) {
        const updatedLecs = (s.lectures || []).map((l: any) => 
          l.id === lectureId ? { ...l, ...updatedFields } : l
        );
        const completed = updatedLecs.filter((l: any) => l.isCompleted).length;
        const progress = updatedLecs.length > 0 ? Math.round((completed / updatedLecs.length) * 100) : 0;
        if (supabase) {
          supabase.from('subjects').update({ lectures: updatedLecs, progress }).eq('id', subjectId).then();
        }
        return { ...s, lectures: updatedLecs, progress };
      }
      return s;
    });
    local.set(KEYS.SUBJECTS, updated);
    return updated;
  },

  deleteLecture: async (subjectId: number, lectureId: number) => {
    const subjects = await db.getSubjects();
    const updated = subjects.map((s: any) => {
      if (s.id === subjectId) {
        const updatedLecs = (s.lectures || []).filter((l: any) => l.id !== lectureId);
        const completed = updatedLecs.filter((l: any) => l.isCompleted).length;
        const progress = updatedLecs.length > 0 ? Math.round((completed / updatedLecs.length) * 100) : 0;
        if (supabase) {
          supabase.from('subjects').update({ lectures: updatedLecs, progress }).eq('id', subjectId).then();
        }
        return { ...s, lectures: updatedLecs, progress };
      }
      return s;
    });
    local.set(KEYS.SUBJECTS, updated);
    return updated;
  },

  toggleLectureStatus: async (subjectId: number, lectureId: number) => {
    const subjects = await db.getSubjects();
    const updated = subjects.map((s: any) => {
      if (s.id === subjectId) {
        const updatedLecs = (s.lectures || []).map((l: any) => 
          l.id === lectureId ? { ...l, isCompleted: !l.isCompleted } : l
        );
        const completed = updatedLecs.filter((l: any) => l.isCompleted).length;
        const progress = updatedLecs.length > 0 ? Math.round((completed / updatedLecs.length) * 100) : 0;
        if (supabase) {
          supabase.from('subjects').update({ lectures: updatedLecs, progress }).eq('id', subjectId).then();
        }
        return { ...s, lectures: updatedLecs, progress };
      }
      return s;
    });
    local.set(KEYS.SUBJECTS, updated);
    return updated;
  },

  getTasks: async (): Promise<Task[]> => {
    const localTasks = local.get(KEYS.TASKS) || [];
    try {
      if (supabase) {
        const { data } = await supabase.from('tasks').select('*').eq('user_id', MOCK_USER_ID).order('created_at', { ascending: false });
        if (data) {
          local.set(KEYS.TASKS, data);
          return data as Task[];
        }
      }
    } catch (e) {}
    return localTasks;
  },

  saveTask: async (task: any) => {
    const current = await db.getTasks();
    const newTask = { ...task, id: Date.now(), status: 'upcoming' };
    local.set(KEYS.TASKS, [newTask, ...current]);
    try {
      if (supabase) {
        await supabase.from('tasks').insert({
          user_id: MOCK_USER_ID,
          title: task.title,
          time: task.time,
          duration: task.duration,
          day_index: task.dayIndex,
          subject_color: task.subjectColor || 'bg-indigo-500',
          status: 'upcoming',
          created_at: new Date().toISOString()
        });
      }
    } catch (e) {}
    return [newTask, ...current];
  },

  toggleTask: async (id: number) => {
    const current = await db.getTasks();
    const updated = current.map((t: any) => 
      t.id === id ? { ...t, status: t.status === 'completed' ? 'upcoming' : 'completed' } : t
    );
    local.set(KEYS.TASKS, updated);
    try {
      if (supabase) {
        const task = updated.find(t => t.id === id);
        if (task) {
          await supabase.from('tasks').update({ status: task.status }).eq('id', id);
        }
      }
    } catch (e) {}
    return updated;
  },

  deleteTask: async (id: number) => {
    const current = await db.getTasks();
    const updated = current.filter((t: any) => t.id !== id);
    local.set(KEYS.TASKS, updated);
    try {
      if (supabase) await supabase.from('tasks').delete().eq('id', id);
    } catch (e) {}
    return updated;
  },

  saveBatchTasks: async (tasks: any[]) => {
    const current = await db.getTasks();
    const newTasks = tasks.map(t => ({ ...t, id: Date.now() + Math.random(), status: 'upcoming' }));
    const updated = [...newTasks, ...current];
    local.set(KEYS.TASKS, updated);
    try {
      if (supabase) {
        const payload = newTasks.map(t => ({
          user_id: MOCK_USER_ID,
          title: t.title,
          time: t.time,
          duration: t.duration,
          day_index: t.dayIndex,
          subject_color: t.subjectColor || 'bg-indigo-500',
          status: 'upcoming',
          created_at: new Date().toISOString()
        }));
        await supabase.from('tasks').insert(payload);
      }
    } catch (e) {}
    return updated;
  },

  getNotes: async (): Promise<Note[]> => {
    const localNotes = local.get(KEYS.NOTES) || [];
    try {
      if (supabase) {
        const { data } = await supabase.from('notes').select('*').eq('user_id', MOCK_USER_ID).order('created_at', { ascending: false });
        if (data) {
          local.set(KEYS.NOTES, data);
          return data as Note[];
        }
      }
    } catch (e) {}
    return localNotes;
  },

  saveNote: async (note: any) => {
    const current = await db.getNotes();
    const newNote = { ...note, id: Date.now(), date: new Date().toLocaleDateString('ar-EG') };
    local.set(KEYS.NOTES, [newNote, ...current]);
    try {
      if (supabase) {
        await supabase.from('notes').insert({
          user_id: MOCK_USER_ID,
          title: note.title,
          text: note.text,
          translation: note.translation || '',
          category: note.category,
          date: new Date().toLocaleDateString('ar-EG')
        });
      }
    } catch (e) {}
    return [newNote, ...current];
  },

  deleteNote: async (id: number) => {
    const current = await db.getNotes();
    const updated = current.filter((n: any) => n.id !== id);
    local.set(KEYS.NOTES, updated);
    try {
      if (supabase) await supabase.from('notes').delete().eq('id', id);
    } catch (e) {}
    return updated;
  },

  getStudyStats: async (): Promise<StudyStats> => {
    return local.get(KEYS.STATS) || { sessionsCompleted: 0, totalMinutes: 0, topSubject: 'غير محدد', focusRate: 0 };
  },

  saveStudySession: async (minutes: number, subjectName: string) => {
    const stats = await db.getStudyStats();
    const updated = {
      ...stats,
      sessionsCompleted: stats.sessionsCompleted + 1,
      totalMinutes: stats.totalMinutes + minutes,
      topSubject: subjectName
    };
    local.set(KEYS.STATS, updated);
    return updated;
  },

  calculateTotalXP: (subjects: Subject[], tasks: Task[], notes: Note[], stats: StudyStats): number => {
    let total = 120;
    if (subjects) subjects.forEach(s => { if (s.lectures) total += (s.lectures.filter(l => l.isCompleted).length) * 20; });
    if (tasks) total += tasks.filter(t => t.status === 'completed').length * 10;
    if (notes) total += notes.length * 15;
    return total;
  },
};
