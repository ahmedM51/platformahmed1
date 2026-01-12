
import { User, Subject, Lecture, Task, Note, StudyStats } from '../types';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pxmhwwovxrnefiryywva.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4bWh3d292eHJuZWZpcnl5d3ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0MzgzNjQsImV4cCI6MjA3MjAxNDM2NH0.FqzkWel93icaJ781ZCPhvzfVJu4iwqCa3hxV3AKuRlA';
const supabase = createClient(supabaseUrl, supabaseKey);

// معرّف ثابت للمستخدم (UUID)
const TEMP_USER_ID = '00000000-0000-0000-0000-000000000001';

export const db = {
  // User Management
  saveUser: async (user: User) => {
    const { data, error } = await supabase
      .from('profiles')
      .upsert({ 
        id: TEMP_USER_ID, 
        email: user.email, 
        full_name: user.full_name, 
        xp: user.xp || 120
      }, { onConflict: 'id' })
      .select()
      .single();
    
    if (error) {
      console.error("Supabase Error Details:", error.message, error.details, error.hint);
      throw new Error(`خطأ في قاعدة البيانات: ${error.message}`);
    }
    return data;
  },
  
  getUser: async (): Promise<User | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', TEMP_USER_ID)
        .maybeSingle(); // استخدام maybeSingle بدلاً من single لتجنب الأخطاء إذا كان المستخدم غير موجود
      
      if (error) {
        console.warn("Supabase Fetch User Warning:", error.message);
        return null;
      }
      return data;
    } catch (e) {
      return null;
    }
  },

  calculateTotalXP: (subjects: Subject[], tasks: Task[], notes: Note[], stats: StudyStats): number => {
    let total = 120;
    if (subjects) {
      subjects.forEach(s => {
        total += (s.lectures?.filter(l => l.isCompleted).length || 0) * 20;
      });
    }
    if (tasks) {
      total += tasks.filter(t => t.status === 'completed').length * 10;
    }
    if (notes) {
      total += notes.length * 15;
    }
    return total;
  },

  // Subjects Management
  getSubjects: async (): Promise<Subject[]> => {
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .eq('user_id', TEMP_USER_ID);
    if (error) {
      console.error("Fetch Subjects Error:", error.message);
      return [];
    }
    return data || [];
  },
  
  saveSubject: async (sub: Partial<Subject>) => {
    const { error } = await supabase
      .from('subjects')
      .insert({
        user_id: TEMP_USER_ID,
        name: sub.name,
        color: sub.color,
        progress: 0,
        lectures: []
      });
    if (error) console.error("Save Subject Error:", error.message);
    return await db.getSubjects();
  },

  deleteSubject: async (id: number) => {
    const { error } = await supabase.from('subjects').delete().eq('id', id);
    if (error) console.error("Delete Subject Error:", error.message);
    return await db.getSubjects();
  },

  addLecture: async (subjectId: number, lecture: any) => {
    const { data: subject, error: fetchErr } = await supabase.from('subjects').select('lectures').eq('id', subjectId).single();
    if (subject) {
      const updatedLectures = [...(subject.lectures || []), { 
        ...lecture, 
        id: Date.now(), 
        isCompleted: false, 
        date: new Date().toLocaleDateString('ar-EG') 
      }];
      const { error: updateErr } = await supabase.from('subjects').update({ lectures: updatedLectures }).eq('id', subjectId);
      if (updateErr) console.error("Update Lecture Error:", updateErr.message);
    }
    return await db.getSubjects();
  },

  editLecture: async (subjectId: number, lectureId: number, updatedLecture: any) => {
    const { data: subject } = await supabase.from('subjects').select('lectures').eq('id', subjectId).single();
    if (subject) {
      const updated = subject.lectures.map((l: any) => l.id === lectureId ? { ...l, ...updatedLecture } : l);
      await supabase.from('subjects').update({ lectures: updated }).eq('id', subjectId);
    }
    return await db.getSubjects();
  },

  deleteLecture: async (subjectId: number, lectureId: number) => {
    const { data: subject } = await supabase.from('subjects').select('lectures').eq('id', subjectId).single();
    if (subject) {
      const updated = subject.lectures.filter((l: any) => l.id !== lectureId);
      const completed = updated.filter((l: any) => l.isCompleted).length;
      const progress = updated.length > 0 ? Math.round((completed / updated.length) * 100) : 0;
      await supabase.from('subjects').update({ lectures: updated, progress }).eq('id', subjectId);
    }
    return await db.getSubjects();
  },

  toggleLectureStatus: async (subjectId: number, lectureId: number) => {
    const { data: subject } = await supabase.from('subjects').select('lectures').eq('id', subjectId).single();
    if (subject) {
      const updated = subject.lectures.map((l: any) => l.id === lectureId ? { ...l, isCompleted: !l.isCompleted } : l);
      const completed = updated.filter((l: any) => l.isCompleted).length;
      const progress = Math.round((completed / updated.length) * 100);
      await supabase.from('subjects').update({ lectures: updated, progress }).eq('id', subjectId);
    }
    return await db.getSubjects();
  },

  // Tasks Management
  getTasks: async (): Promise<Task[]> => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', TEMP_USER_ID)
      .order('id', { ascending: false });
    if (error) return [];
    return data || [];
  },

  saveTask: async (task: any) => {
    await supabase.from('tasks').insert({
      user_id: TEMP_USER_ID,
      title: task.title,
      time: task.time,
      duration: task.duration,
      day_index: task.dayIndex,
      status: 'upcoming',
      subject_color: task.subjectColor || 'bg-indigo-500'
    });
    return await db.getTasks();
  },

  saveBatchTasks: async (newTasks: any[]) => {
    const formatted = newTasks.map(t => ({
      user_id: TEMP_USER_ID,
      title: t.title,
      time: t.time,
      duration: t.duration,
      day_index: t.dayIndex,
      status: 'upcoming',
      subject_color: t.subjectColor || 'bg-indigo-500'
    }));
    await supabase.from('tasks').insert(formatted);
    return await db.getTasks();
  },

  toggleTask: async (id: number) => {
    const { data: task } = await supabase.from('tasks').select('status').eq('id', id).single();
    if (task) {
      const newStatus = task.status === 'completed' ? 'upcoming' : 'completed';
      await supabase.from('tasks').update({ status: newStatus }).eq('id', id);
    }
    return await db.getTasks();
  },

  deleteTask: async (id: number) => {
    await supabase.from('tasks').delete().eq('id', id);
    return await db.getTasks();
  },

  // Notes Management
  getNotes: async (): Promise<Note[]> => {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', TEMP_USER_ID)
      .order('id', { ascending: false });
    if (error) return [];
    return data || [];
  },

  saveNote: async (note: any) => {
    await supabase.from('notes').insert({
      user_id: TEMP_USER_ID,
      title: note.title,
      text: note.text,
      translation: note.translation || '',
      category: note.category,
      date: new Date().toLocaleDateString('ar-EG')
    });
    return await db.getNotes();
  },

  deleteNote: async (id: number) => {
    await supabase.from('notes').delete().eq('id', id);
    return await db.getNotes();
  },

  getStudyStats: async (): Promise<StudyStats> => {
    return { sessionsCompleted: 0, totalMinutes: 0, topSubject: 'غير محدد', focusRate: 0 };
  },

  saveStudySession: async (minutes: number, subjectName: string) => {
    return { sessionsCompleted: 1, totalMinutes: minutes, topSubject: subjectName, focusRate: 85 };
  }
};
