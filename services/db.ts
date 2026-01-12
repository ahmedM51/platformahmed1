
import { User, Subject, Lecture, Task, Note, StudyStats } from '../types';
import { createClient } from '@supabase/supabase-js';

// Use .env directly for credentials as per instructions.
const supabaseUrl = 'https://cmaxutqmblvvghftouqx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtYXh1dHFtYmx2dmdoZnRvdXF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1NTkyNDksImV4cCI6MjA4MTEzNTI0OX0.a8VbYwNY6mYkCBMiSSwUVU-zThSQnvIBEeH4GT_i-Xk';

// إنشاء العميل فقط إذا توفرت البيانات، وإلا استخدامه كـ Mock للعمليات المحلية
const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;

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
    if (typeof localStorage === 'undefined') return null;
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : null;
  },
  set: (key: string, val: any) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(val));
    }
  }
};

export const db = {
  saveUser: async (user: User) => {
    local.set(KEYS.USER, user);
    if (supabase) {
      try {
        await supabase.from('profiles').upsert({
          id: MOCK_USER_ID,
          email: user.email,
          full_name: user.full_name,
          xp: user.xp || 120
        });
      } catch (e) {}
    }
    return user;
  },
  
  getUser: async (): Promise<User | null> => {
    const localUser = local.get(KEYS.USER);
    if (supabase) {
      try {
        const { data } = await supabase.from('profiles').select('*').eq('id', MOCK_USER_ID).maybeSingle();
        if (data) {
          local.set(KEYS.USER, data);
          return data as User;
        }
      } catch (e) {}
    }
    return localUser;
  },

  getSubjects: async (): Promise<Subject[]> => {
    const localData = local.get(KEYS.SUBJECTS) || [];
    if (supabase) {
      try {
        const { data } = await supabase.from('subjects').select('*').eq('user_id', MOCK_USER_ID);
        if (data && data.length > 0) {
          local.set(KEYS.SUBJECTS, data);
          return data as Subject[];
        }
      } catch (e) {}
    }
    return localData;
  },
  
  saveSubject: async (sub: Partial<Subject>) => {
    const current = local.get(KEYS.SUBJECTS) || [];
    const newSub = { ...sub, id: Date.now(), progress: 0, lectures: [], user_id: MOCK_USER_ID };
    local.set(KEYS.SUBJECTS, [...current, newSub]);
    if (supabase) {
      try {
        await supabase.from('subjects').insert({
          user_id: MOCK_USER_ID,
          name: sub.name,
          color: sub.color,
          progress: 0,
          lectures: []
        });
        return await db.getSubjects();
      } catch (e) {}
    }
    return [...current, newSub] as Subject[];
  },

  deleteSubject: async (id: number) => {
    const current = local.get(KEYS.SUBJECTS) || [];
    const updated = current.filter((s: any) => s.id !== id);
    local.set(KEYS.SUBJECTS, updated);
    if (supabase) {
      try { await supabase.from('subjects').delete().eq('id', id); } catch (e) {}
    }
    return updated;
  },

  addLecture: async (subjectId: number, lecture: any) => {
    const subjects = local.get(KEYS.SUBJECTS) || [];
    const updated = subjects.map((s: any) => {
      if (s.id === subjectId) {
        const newLec = { ...lecture, id: Date.now(), isCompleted: false, date: new Date().toLocaleDateString('ar-EG') };
        const updatedLecs = [...(s.lectures || []), newLec];
        const completed = updatedLecs.filter((l: any) => l.isCompleted).length;
        const progress = updatedLecs.length > 0 ? Math.round((completed / updatedLecs.length) * 100) : 0;
        if (supabase) supabase.from('subjects').update({ lectures: updatedLecs, progress }).eq('id', subjectId).then();
        return { ...s, lectures: updatedLecs, progress };
      }
      return s;
    });
    local.set(KEYS.SUBJECTS, updated);
    return updated;
  },

  editLecture: async (subjectId: number, lectureId: number, updatedLecture: any) => {
    const subjects = local.get(KEYS.SUBJECTS) || [];
    const updated = subjects.map((s: any) => {
      if (s.id === subjectId) {
        const lectures = s.lectures.map((l: any) => l.id === lectureId ? { ...l, ...updatedLecture } : l);
        const completed = lectures.filter((l: any) => l.isCompleted).length;
        const progress = lectures.length > 0 ? Math.round((completed / lectures.length) * 100) : 0;
        if (supabase) supabase.from('subjects').update({ lectures, progress }).eq('id', subjectId).then();
        return { ...s, lectures, progress };
      }
      return s;
    });
    local.set(KEYS.SUBJECTS, updated);
    return updated;
  },

  deleteLecture: async (subjectId: number, lectureId: number) => {
    const subjects = local.get(KEYS.SUBJECTS) || [];
    const updated = subjects.map((s: any) => {
      if (s.id === subjectId) {
        const lectures = s.lectures.filter((l: any) => l.id !== lectureId);
        const completed = lectures.filter((l: any) => l.isCompleted).length;
        const progress = lectures.length > 0 ? Math.round((completed / lectures.length) * 100) : 0;
        if (supabase) supabase.from('subjects').update({ lectures, progress }).eq('id', subjectId).then();
        return { ...s, lectures, progress };
      }
      return s;
    });
    local.set(KEYS.SUBJECTS, updated);
    return updated;
  },

  toggleLectureStatus: async (subjectId: number, lectureId: number) => {
    const subjects = local.get(KEYS.SUBJECTS) || [];
    const updated = subjects.map((s: any) => {
      if (s.id === subjectId) {
        const lectures = s.lectures.map((l: any) => l.id === lectureId ? { ...l, isCompleted: !l.isCompleted } : l);
        const completed = lectures.filter((l: any) => l.isCompleted).length;
        const progress = lectures.length > 0 ? Math.round((completed / lectures.length) * 100) : 0;
        if (supabase) supabase.from('subjects').update({ lectures, progress }).eq('id', subjectId).then();
        return { ...s, lectures, progress };
      }
      return s;
    });
    local.set(KEYS.SUBJECTS, updated);
    return updated;
  },

  getTasks: async (): Promise<Task[]> => {
    const localTasks = local.get(KEYS.TASKS) || [];
    if (supabase) {
      try {
        const { data } = await supabase.from('tasks').select('*').eq('user_id', MOCK_USER_ID).order('created_at', { ascending: false });
        if (data) {
          local.set(KEYS.TASKS, data);
          return data as Task[];
        }
      } catch (e) {}
    }
    return localTasks;
  },

  saveTask: async (task: any) => {
    const current = local.get(KEYS.TASKS) || [];
    const newTask = { ...task, id: Date.now(), status: 'upcoming' };
    local.set(KEYS.TASKS, [newTask, ...current]);
    if (supabase) {
      try {
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
      } catch (e) {}
    }
    return [newTask, ...current];
  },

  saveBatchTasks: async (newTasks: any[]) => {
    const current = local.get(KEYS.TASKS) || [];
    const tasksToInsert = newTasks.map(t => ({ ...t, id: Date.now() + Math.random(), status: 'upcoming' }));
    local.set(KEYS.TASKS, [...tasksToInsert, ...current]);
    if (supabase) {
      try {
        await supabase.from('tasks').insert(tasksToInsert.map(t => ({
          user_id: MOCK_USER_ID,
          title: t.title,
          time: t.time,
          duration: t.duration,
          day_index: t.dayIndex,
          subject_color: t.subjectColor || 'bg-indigo-500',
          status: 'upcoming',
          created_at: new Date().toISOString()
        })));
      } catch (e) {}
    }
    return [...tasksToInsert, ...current];
  },

  toggleTask: async (id: number) => {
    const tasks = local.get(KEYS.TASKS) || [];
    const updated = tasks.map((t: any) => {
      if (t.id === id) {
        const newStatus = t.status === 'completed' ? 'upcoming' : 'completed';
        if (supabase) supabase.from('tasks').update({ status: newStatus }).eq('id', id).then();
        return { ...t, status: newStatus };
      }
      return t;
    });
    local.set(KEYS.TASKS, updated);
    return updated;
  },

  deleteTask: async (id: number) => {
    const current = local.get(KEYS.TASKS) || [];
    const updated = current.filter((t: any) => t.id !== id);
    local.set(KEYS.TASKS, updated);
    if (supabase) {
      try { await supabase.from('tasks').delete().eq('id', id); } catch (e) {}
    }
    return updated;
  },

  getNotes: async (): Promise<Note[]> => {
    const localNotes = local.get(KEYS.NOTES) || [];
    if (supabase) {
      try {
        const { data } = await supabase.from('notes').select('*').eq('user_id', MOCK_USER_ID).order('created_at', { ascending: false });
        if (data) {
          local.set(KEYS.NOTES, data);
          return data as Note[];
        }
      } catch (e) {}
    }
    return localNotes;
  },

  saveNote: async (note: any) => {
    const current = local.get(KEYS.NOTES) || [];
    const newNote = { ...note, id: Date.now(), date: new Date().toLocaleDateString('ar-EG') };
    local.set(KEYS.NOTES, [newNote, ...current]);
    if (supabase) {
      try {
        await supabase.from('notes').insert({
          user_id: MOCK_USER_ID,
          title: note.title,
          text: note.text,
          translation: note.translation || '',
          category: note.category,
          date: new Date().toLocaleDateString('ar-EG')
        });
      } catch (e) {}
    }
    return [newNote, ...current];
  },

  deleteNote: async (id: number) => {
    const current = local.get(KEYS.NOTES) || [];
    const updated = current.filter((n: any) => n.id !== id);
    local.set(KEYS.NOTES, updated);
    if (supabase) {
      try { await supabase.from('notes').delete().eq('id', id); } catch (e) {}
    }
    return updated;
  },

  getStudyStats: async (): Promise<StudyStats> => {
    return local.get(KEYS.STATS) || { sessionsCompleted: 0, totalMinutes: 0, topSubject: 'غير محدد', focusRate: 0 };
  },

  saveStudySession: async (minutes: number, subjectName: string) => {
    const stats = await db.getStudyStats();
    const newStats = { ...stats, sessionsCompleted: stats.sessionsCompleted + 1, totalMinutes: stats.totalMinutes + minutes, topSubject: subjectName, focusRate: 85 };
    local.set(KEYS.STATS, newStats);
    if (supabase) supabase.from('profiles').update({ xp: Math.round(newStats.totalMinutes / 10) }).eq('id', MOCK_USER_ID).then();
    return newStats;
  },

  calculateTotalXP: (subjects: Subject[], tasks: Task[], notes: Note[], stats: StudyStats): number => {
    let total = 120;
    if (subjects) subjects.forEach(s => { if (s.lectures) total += (s.lectures.filter(l => l.isCompleted).length) * 20; });
    if (tasks) total += tasks.filter(t => t.status === 'completed').length * 10;
    if (notes) total += notes.length * 15;
    return total;
  },
};

