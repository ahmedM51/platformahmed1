// db.ts - Complete Vite + Supabase + GitHub Pages Database Layer
import { User, Subject, Lecture, Task, Note, StudyStats } from '../types';
import { createClient } from '@supabase/supabase-js';

// Global vars from Vite config
declare global {
  const __IS_GITHUB_PAGES__: boolean;
  const __BASE_PATH__: string;
}

const MOCK_USER_ID = '00000000-0000-0000-0000-000000000001' as const;

const KEYS = {
  USER: 'smart_student_user',
  SUBJECTS: 'smart_student_subjects',
  TASKS: 'smart_student_tasks',
  NOTES: 'smart_student_notes',
  STATS: 'smart_student_stats'
} as const;

const local = {
  get: <T>(key: string): T | null => {
    if (typeof localStorage === 'undefined') return null;
    try {
      const val = localStorage.getItem(key);
      return val ? JSON.parse(val) as T : null;
    } catch {
      return null;
    }
  },
  set: (key: string, val: any) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(val));
    }
  }
};

// 🚨 GitHub Pages Detection & Supabase Setup
const isGitHubPages = typeof __IS_GITHUB_PAGES__ !== 'undefined' ? __IS_GITHUB_PAGES__ : false;
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase = null as any;

if (!isGitHubPages && supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✅ Supabase connected');
  } catch (error) {
    console.error('❌ Supabase connection failed:', error);
    supabase = null;
  }
} else if (isGitHubPages) {
  console.warn('🎉 GitHub Pages mode - localStorage only (demo mode)');
}

const useSupabase = () => supabase !== null && !isGitHubPages;

// LocalStorage-only mock functions for GitHub Pages
const mockSubjects = (): Subject[] => [];
const mockTasks = (): Task[] => [];
const mockNotes = (): Note[] => [];
const mockUser = (): User | null => null;

export const db = {
  // ===== USER =====
  saveUser: async (user: User): Promise<User> => {
    local.set(KEYS.USER, user);
    if (useSupabase()) {
      const { error } = await supabase.from('profiles').upsert({
        id: MOCK_USER_ID,
        email: user.email,
        full_name: user.full_name,
        xp: user.xp || 120
      });
      if (error) console.error('User save error:', error);
    }
    return user;
  },

  getUser: async (): Promise<User | null> => {
    const localUser = local.get<User>(KEYS.USER);
    if (localUser) return localUser;

    if (useSupabase()) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', MOCK_USER_ID)
        .maybeSingle();
      if (error) console.error('User fetch error:', error);
      if (data) {
        local.set(KEYS.USER, data);
        return data as User;
      }
    }
    return localUser || mockUser();
  },

  // ===== SUBJECTS =====
  getSubjects: async (): Promise<Subject[]> => {
    let subjects = local.get<Subject[]>(KEYS.SUBJECTS) || [];
    
    if (useSupabase() && (!subjects.length || isGitHubPages === false)) {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('user_id', MOCK_USER_ID);
      if (!error && data?.length) {
        subjects = data as Subject[];
        local.set(KEYS.SUBJECTS, subjects);
      }
    }
    
    return subjects.length ? subjects : mockSubjects();
  },

  saveSubject: async (sub: Partial<Subject>): Promise<Subject[]> => {
    const subjects = await db.getSubjects();
    const newSub: Subject = {
      id: Date.now(),
      user_id: MOCK_USER_ID,
      name: sub.name!,
      color: sub.color || '#3B82F6',
      progress: 0,
      lectures: []
    };
    
    local.set(KEYS.SUBJECTS, [...subjects, newSub]);

    if (useSupabase()) {
      const { error } = await supabase.from('subjects').insert(newSub);
      if (error) console.error('Subject save error:', error);
    }
    
    return [...subjects, newSub];
  },

  deleteSubject: async (id: number): Promise<Subject[]> => {
    let subjects = await db.getSubjects();
    subjects = subjects.filter(s => s.id !== id);
    local.set(KEYS.SUBJECTS, subjects);

    if (useSupabase()) {
      await supabase.from('subjects').delete().eq('id', id);
    }
    return subjects;
  },

  // ===== LECTURES =====
  addLecture: async (subjectId: number, lecture: Omit<Lecture, 'id' | 'date' | 'isCompleted'>): Promise<Subject[]> => {
    let subjects = await db.getSubjects();
    const subjectIndex = subjects.findIndex(s => s.id === subjectId);
    
    if (subjectIndex === -1) throw new Error('Subject not found');

    const newLecture: Lecture = {
      ...lecture,
      id: Date.now(),
      date: new Date().toLocaleDateString('ar-EG'),
      isCompleted: false
    };

    const updatedLectures = [...(subjects[subjectIndex].lectures || []), newLecture];
    const progress = Math.round((updatedLectures.filter(l => l.isCompleted).length / updatedLectures.length) * 100);

    subjects[subjectIndex] = {
      ...subjects[subjectIndex],
      lectures: updatedLectures,
      progress
    };

    local.set(KEYS.SUBJECTS, subjects);

    if (useSupabase()) {
      await supabase.from('subjects').update({ lectures: updatedLectures, progress }).eq('id', subjectId);
    }

    return subjects;
  },

  toggleLectureStatus: async (subjectId: number, lectureId: number): Promise<Subject[]> => {
    let subjects = await db.getSubjects();
    const subjectIndex = subjects.findIndex(s => s.id === subjectId);
    
    if (subjectIndex === -1) return subjects;

    subjects[subjectIndex].lectures = subjects[subjectIndex].lectures?.map(l =>
      l.id === lectureId ? { ...l, isCompleted: !l.isCompleted } : l
    ) || [];

    const progress = Math.round(
      (subjects[subjectIndex].lectures.filter((l: Lecture) => l.isCompleted).length / 
       subjects[subjectIndex].lectures.length) * 100
    );

    subjects[subjectIndex].progress = progress;
    local.set(KEYS.SUBJECTS, subjects);

    if (useSupabase()) {
      await supabase.from('subjects').update({ 
        lectures: subjects[subjectIndex].lectures, 
        progress 
      }).eq('id', subjectId);
    }

    return subjects;
  },

  // ===== TASKS =====
  getTasks: async (): Promise<Task[]> => {
    let tasks = local.get<Task[]>(KEYS.TASKS) || [];
    
    if (useSupabase() && (!tasks.length || isGitHubPages === false)) {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', MOCK_USER_ID)
        .order('created_at', { ascending: false });
      if (!error && data?.length) {
        tasks = data as Task[];
        local.set(KEYS.TASKS, tasks);
      }
    }
    
    return tasks.length ? tasks : mockTasks();
  },

  saveTask: async (task: Omit<Task, 'id' | 'status' | 'created_at'>): Promise<Task[]> => {
    const tasks = await db.getTasks();
    const newTask: Task = {
      ...task,
      id: Date.now(),
      status: 'upcoming',
      created_at: new Date().toISOString()
    };
    
    local.set(KEYS.TASKS, [newTask, ...tasks]);

    if (useSupabase()) {
      await supabase.from('tasks').insert({
        user_id: MOCK_USER_ID,
        ...newTask
      });
    }
    
    return [newTask, ...tasks];
  },

  toggleTask: async (id: number): Promise<Task[]> => {
    let tasks = await db.getTasks();
    tasks = tasks.map(t => 
      t.id === id 
        ? { ...t, status: t.status === 'completed' ? 'upcoming' : 'completed' }
        : t
    );
    local.set(KEYS.TASKS, tasks);

    if (useSupabase()) {
      const task = tasks.find(t => t.id === id);
      if (task) {
        await supabase.from('tasks').update({ status: task.status }).eq('id', id);
      }
    }
    
    return tasks;
  },

  deleteTask: async (id: number): Promise<Task[]> => {
    let tasks = await db.getTasks();
    tasks = tasks.filter(t => t.id !== id);
    local.set(KEYS.TASKS, tasks);

    if (useSupabase()) {
      await supabase.from('tasks').delete().eq('id', id);
    }
    return tasks;
  },

  // ===== NOTES =====
  getNotes: async (): Promise<Note[]> => {
    let notes = local.get<Note[]>(KEYS.NOTES) || [];
    
    if (useSupabase() && (!notes.length || isGitHubPages === false)) {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', MOCK_USER_ID)
        .order('created_at', { ascending: false });
      if (!error && data?.length) {
        notes = data as Note[];
        local.set(KEYS.NOTES, notes);
      }
    }
    
    return notes.length ? notes : mockNotes();
  },

  saveNote: async (note: Omit<Note, 'id' | 'date'>): Promise<Note[]> => {
    const notes = await db.getNotes();
    const newNote: Note = {
      ...note,
      id: Date.now(),
      date: new Date().toLocaleDateString('ar-EG')
    };
    
    local.set(KEYS.NOTES, [newNote, ...notes]);

    if (useSupabase()) {
      await supabase.from('notes').insert({
        user_id: MOCK_USER_ID,
        ...newNote
      });
    }
    
    return [newNote, ...notes];
  },

  deleteNote: async (id: number): Promise<Note[]> => {
    let notes = await db.getNotes();
    notes = notes.filter(n => n.id !== id);
    local.set(KEYS.NOTES, notes);

    if (useSupabase()) {
      await supabase.from('notes').delete().eq('id', id);
    }
    return notes;
  },

  // ===== STATS =====
  getStudyStats: async (): Promise<StudyStats> => {
    return local.get(KEYS.STATS) || { 
      sessionsCompleted: 0, 
      totalMinutes: 0, 
      topSubject: 'غير محدد', 
      focusRate: 0 
    };
  },

  saveStudySession: async (minutes: number, subjectName: string): Promise<StudyStats> => {
    const stats = await db.getStudyStats();
    const newStats: StudyStats = { 
      ...stats, 
      sessionsCompleted: stats.sessionsCompleted + 1, 
      totalMinutes: stats.totalMinutes + minutes, 
      topSubject: subjectName, 
      focusRate: 85 
    };
    
    local.set(KEYS.STATS, newStats);

    if (useSupabase()) {
      await supabase.from('profiles').update({ 
        xp: Math.round(newStats.totalMinutes / 10) 
      }).eq('id', MOCK_USER_ID);
    }
    
    return newStats;
  },

  // ===== UTILITIES =====
  calculateTotalXP: (subjects: Subject[], tasks: Task[], notes: Note[], stats: StudyStats): number => {
    let total = 120;
    subjects.forEach(s => { 
      if (s.lectures) total += s.lectures.filter(l => l.isCompleted).length * 20; 
    });
    total += tasks.filter(t => t.status === 'completed').length * 10;
    total += notes.length * 15;
    return total;
  },

  clearCache: async () => {
    Object.values(KEYS).forEach(key => local.set(key, null));
    console.log('🗑️ Local cache cleared');
  },

  isOnline: (): boolean => useSupabase()
};

export default db;
