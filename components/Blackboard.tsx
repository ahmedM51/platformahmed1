
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
    Pen, Eraser, Type, Square, 
    Highlighter, Move, Wand2, Image as ImageIcon,
    Undo2, Redo2, Download, Trash2, 
    ChevronRight, ChevronLeft, FilePlus,
    Users, Link as LinkIcon, Settings, LogOut, Loader2,
    Check, X as CloseIcon, Star, ArrowUpRight, MousePointer2
} from 'lucide-react';

// --- Helpers ---
const generateId = () => Math.random().toString(36).substr(2, 9);

const drawBackground = (ctx: CanvasRenderingContext2D, width: number, height: number, type: string) => {
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#e2e8f0'; 
    ctx.lineWidth = 1;

    if (type === 'lines') {
        const spacing = 40;
        ctx.beginPath();
        for (let y = spacing; y < height; y += spacing) {
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
        }
        ctx.stroke();
    } else if (type === 'grid') {
        const spacing = 40;
        ctx.beginPath();
        for (let x = spacing; x < width; x += spacing) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
        }
        for (let y = spacing; y < height; y += spacing) {
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
        }
        ctx.stroke();
    } else if (type === 'dots') {
        const spacing = 40;
        ctx.fillStyle = '#cbd5e1'; 
        for (let x = spacing; x < width; x += spacing) {
            for (let y = spacing; y < height; y += spacing) {
                ctx.beginPath();
                ctx.arc(x, y, 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
    ctx.restore();
};

const drawShape = (ctx: CanvasRenderingContext2D, start: any, end: any, type: string, fill: boolean) => {
    const width = end.x - start.x;
    const height = end.y - start.y;
    const centerX = start.x + width / 2;
    const centerY = start.y + height / 2;
    
    ctx.beginPath();
    if (type === 'rectangle') {
        ctx.rect(start.x, start.y, width, height);
    } else if (type === 'circle') {
        ctx.ellipse(centerX, centerY, Math.abs(width) / 2, Math.abs(height) / 2, 0, 0, 2 * Math.PI);
    } else if (type === 'arrow') {
        const angle = Math.atan2(end.y - start.y, end.x - start.x);
        const headLen = 15;
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.moveTo(end.x, end.y);
        ctx.lineTo(end.x - headLen * Math.cos(angle - Math.PI / 6), end.y - headLen * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(end.x, end.y);
        ctx.lineTo(end.x - headLen * Math.cos(angle + Math.PI / 6), end.y - headLen * Math.sin(angle + Math.PI / 6));
    } else if (type === 'star') {
        const spikes = 5;
        const outerRadius = Math.min(Math.abs(width), Math.abs(height)) / 2;
        const innerRadius = outerRadius / 2;
        let rot = Math.PI / 2 * 3;
        const step = Math.PI / spikes;
        ctx.moveTo(centerX, centerY - outerRadius);
        for (let i = 0; i < spikes; i++) {
            ctx.lineTo(centerX + Math.cos(rot) * outerRadius, centerY + Math.sin(rot) * outerRadius);
            rot += step;
            ctx.lineTo(centerX + Math.cos(rot) * innerRadius, centerY + Math.sin(rot) * innerRadius);
            rot += step;
        }
        ctx.closePath();
    } else if (type === 'check') {
        const size = Math.min(Math.abs(width), Math.abs(height));
        const pad = size * 0.2;
        ctx.moveTo(start.x + pad, centerY);
        ctx.lineTo(centerX, end.y - pad);
        ctx.lineTo(end.x - pad, start.y + pad);
    } else if (type === 'cross') {
        const pad = Math.min(Math.abs(width), Math.abs(height)) * 0.2;
        ctx.moveTo(start.x + pad, start.y + pad);
        ctx.lineTo(end.x - pad, end.y - pad);
        ctx.moveTo(end.x - pad, start.y + pad);
        ctx.lineTo(start.x + pad, end.y - pad);
    }

    if (fill && !['arrow', 'check', 'cross'].includes(type)) {
        ctx.fill();
    }
    ctx.stroke();
};

// --- Sub-components ---

const SessionModal = ({ isOpen, onClose, onConnect, isConnecting, initialRoomId }: any) => {
    const [roomId, setRoomId] = useState(initialRoomId || '');
    const [copied, setCopied] = useState(false);

    useEffect(() => { if (!roomId && isOpen) setRoomId(generateId()); }, [isOpen]);

    if (!isOpen) return null;

    const handleCopyLink = async () => {
        const url = new URL(window.location.href);
        url.searchParams.set('room', roomId);
        await navigator.clipboard.writeText(url.toString());
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-md p-8 border border-white/20 animate-in zoom-in" dir="rtl">
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-black dark:text-white">المشاركة الحية</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                        <CloseIcon size={24} className="text-slate-400" />
                    </button>
                </div>
                <div className="space-y-6">
                    <div className="bg-indigo-50 dark:bg-indigo-900/30 p-5 rounded-2xl text-xs font-bold text-indigo-700 dark:text-indigo-300 leading-relaxed">
                        شارك كود الجلسة مع طلابك ليتمكنوا من الانضمام والرؤية المباشرة لشرحك.
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 px-2">معرف الغرفة</label>
                        <input type="text" value={roomId} onChange={e => setRoomId(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 text-center font-mono text-xl tracking-widest dark:text-white focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div className="flex flex-col gap-3">
                        <button onClick={() => onConnect(roomId)} disabled={isConnecting} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl shadow-xl transition-all active:scale-95 flex justify-center items-center gap-3">
                            {isConnecting ? <Loader2 className="animate-spin" /> : <Users size={20} />}
                            بدء / انضمام للجلسة
                        </button>
                        <button onClick={handleCopyLink} className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-3">
                            <LinkIcon size={18} />
                            {copied ? 'تم نسخ الرابط' : 'نسخ رابط الجلسة'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const Blackboard: React.FC = () => {
    // Tools State
    const [currentTool, setCurrentTool] = useState('pen');
    const [settings, setSettings] = useState({ color: '#4f46e5', thickness: 5, isFilled: false });
    const [shapeType, setShapeType] = useState('rectangle');
    const [backgroundType, setBackgroundType] = useState('plain');
    
    // Canvas State
    const [pages, setPages] = useState<string[]>(['']);
    const [currentPageIndex, setCurrentPageIndex] = useState(0);
    const [history, setHistory] = useState<string[]>([]);
    const [historyStep, setHistoryStep] = useState(-1);
    const [backgroundImage, setBackgroundImage] = useState<HTMLImageElement | null>(null);
    
    // Session State
    const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [roomId, setRoomId] = useState<string | null>(null);
    const [isTeacher, setIsTeacher] = useState(true); // Default to teacher
    const [studentsCanWrite, setStudentsCanWrite] = useState(true);

    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const tempCanvasRef = useRef<HTMLCanvasElement>(null);
    const channelRef = useRef<any>(null);
    const laserPoints = useRef<any[]>([]);
    const [isDrawing, setIsDrawing] = useState(false);
    const [startPoint, setStartPoint] = useState<any>(null);
    const [lastPoint, setLastPoint] = useState<any>(null);
    const [textInput, setTextInput] = useState<any>(null);
    const textAreaRef = useRef<HTMLTextAreaElement>(null);
    const [remoteCursors, setRemoteCursors] = useState<any>({});

    const COLORS = ['#000000', '#ef4444', '#22c55e', '#3b82f6', '#eab308', '#a855f7', '#4f46e5'];

    // --- Core Functions ---
    const redrawMainCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawBackground(ctx, canvas.width, canvas.height, backgroundType);

        if (backgroundImage) {
            const ratio = Math.min(canvas.width / backgroundImage.width, canvas.height / backgroundImage.height);
            const cx = (canvas.width - backgroundImage.width * ratio) / 2;
            const cy = (canvas.height - backgroundImage.height * ratio) / 2;
            ctx.drawImage(backgroundImage, 0, 0, backgroundImage.width, backgroundImage.height, cx, cy, backgroundImage.width * ratio, backgroundImage.height * ratio);
        }

        const snapshot = history[historyStep];
        if (snapshot) {
            const img = new Image();
            img.src = snapshot;
            img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        }
    }, [backgroundType, backgroundImage, history, historyStep]);

    const initCanvas = useCallback(() => {
        if (!containerRef.current || !canvasRef.current || !tempCanvasRef.current) return;
        const { clientWidth, clientHeight } = containerRef.current;
        canvasRef.current.width = tempCanvasRef.current.width = clientWidth;
        canvasRef.current.height = tempCanvasRef.current.height = clientHeight;
        redrawMainCanvas();
    }, [redrawMainCanvas]);

    useEffect(() => {
        window.addEventListener('resize', initCanvas);
        initCanvas();
        return () => window.removeEventListener('resize', initCanvas);
    }, [initCanvas]);

    const broadcast = (data: any) => {
        if (isConnected && channelRef.current) {
            channelRef.current.send({ type: 'broadcast', event: 'wb', payload: data });
        }
    };

    const getCoords = (e: any) => {
        if (!containerRef.current) return { x: 0, y: 0, nx: 0, ny: 0 };
        const rect = containerRef.current.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return { 
            x: clientX - rect.left, 
            y: clientY - rect.top, 
            nx: (clientX - rect.left) / rect.width, 
            ny: (clientY - rect.top) / rect.height 
        };
    };

    const saveToHistory = (dataURL: string) => {
        const newHistory = history.slice(0, historyStep + 1);
        newHistory.push(dataURL);
        if (newHistory.length > 30) newHistory.shift();
        setHistory(newHistory);
        setHistoryStep(newHistory.length - 1);
        const newPages = [...pages];
        newPages[currentPageIndex] = dataURL;
        setPages(newPages);
    };

    // --- Drawing Handlers ---
    const startDrawing = (e: any) => {
        if (!isTeacher && !studentsCanWrite) return;
        const coords = getCoords(e);
        if (currentTool === 'text') {
            if (textInput?.visible) finishText();
            else setTextInput({ ...coords, visible: true, value: '' });
            return;
        }
        setIsDrawing(true);
        setStartPoint(coords);
        setLastPoint(coords);
    };

    const draw = (e: any) => {
        const coords = getCoords(e);
        if (isConnected) broadcast({ type: 'cursor', x: coords.nx, y: coords.ny, user: 'User' });
        if (currentTool === 'laser') {
            laserPoints.current.push({ ...coords, time: Date.now() });
            broadcast({ type: 'laser', x: coords.nx, y: coords.ny });
            return;
        }
        if (!isDrawing || !lastPoint) return;

        const ctx = canvasRef.current?.getContext('2d');
        if (['pen', 'eraser', 'highlighter'].includes(currentTool) && ctx) {
            ctx.beginPath();
            ctx.strokeStyle = currentTool === 'eraser' ? '#ffffff' : settings.color;
            ctx.lineWidth = currentTool === 'highlighter' ? settings.thickness * 3 : settings.thickness;
            ctx.globalAlpha = currentTool === 'highlighter' ? 0.3 : 1.0;
            ctx.lineCap = 'round';
            ctx.moveTo(lastPoint.x, lastPoint.y);
            ctx.lineTo(coords.x, coords.y);
            ctx.stroke();
            broadcast({ type: 'draw', x0: lastPoint.nx, y0: lastPoint.ny, x1: coords.nx, y1: coords.ny, color: ctx.strokeStyle, thickness: ctx.lineWidth, opacity: ctx.globalAlpha });
            setLastPoint(coords);
            ctx.globalAlpha = 1.0;
        } else if (currentTool === 'shape') {
            const tempCtx = tempCanvasRef.current?.getContext('2d');
            if (tempCtx) {
                tempCtx.clearRect(0, 0, tempCanvasRef.current!.width, tempCanvasRef.current!.height);
                tempCtx.strokeStyle = settings.color;
                tempCtx.lineWidth = settings.thickness;
                tempCtx.fillStyle = settings.color;
                drawShape(tempCtx, startPoint, coords, shapeType, settings.isFilled);
            }
        }
    };

    const stopDrawing = (e: any) => {
        if (!isDrawing) return;
        setIsDrawing(false);
        if (currentTool === 'shape') {
            const coords = getCoords(e);
            const ctx = canvasRef.current?.getContext('2d');
            if (ctx && tempCanvasRef.current) {
                ctx.drawImage(tempCanvasRef.current, 0, 0);
                tempCanvasRef.current.getContext('2d')?.clearRect(0, 0, tempCanvasRef.current.width, tempCanvasRef.current.height);
                broadcast({ type: 'shape', shapeType, x0: startPoint.nx, y0: startPoint.ny, x1: coords.nx, y1: coords.ny, color: settings.color, thickness: settings.thickness, fill: settings.isFilled });
            }
        }
        if (canvasRef.current) saveToHistory(canvasRef.current.toDataURL());
    };

    const finishText = () => {
        if (!textInput?.value) return setTextInput(null);
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) {
            ctx.font = `${settings.thickness * 4}px 'Cairo'`;
            ctx.fillStyle = settings.color;
            ctx.fillText(textInput.value, textInput.x, textInput.y);
            broadcast({ type: 'text', text: textInput.value, x: textInput.nx, y: textInput.ny, color: settings.color, fontSize: settings.thickness * 4 });
            saveToHistory(canvasRef.current!.toDataURL());
        }
        setTextInput(null);
    };

    // --- Animation Loop for Laser & Cursors ---
    useEffect(() => {
        let frame: number;
        const animate = () => {
            const tempCtx = tempCanvasRef.current?.getContext('2d');
            if (!tempCtx) return;
            if (!isDrawing || currentTool !== 'shape') tempCtx.clearRect(0, 0, tempCanvasRef.current!.width, tempCanvasRef.current!.height);
            
            // Draw Remote Cursors
            Object.entries(remoteCursors).forEach(([id, c]: any) => {
                const x = c.x * tempCanvasRef.current!.width;
                const y = c.y * tempCanvasRef.current!.height;
                tempCtx.fillStyle = 'rgba(79, 70, 229, 0.4)';
                tempCtx.beginPath(); tempCtx.arc(x, y, 6, 0, Math.PI*2); tempCtx.fill();
            });

            // Draw Laser Trail
            const now = Date.now();
            laserPoints.current = laserPoints.current.filter(p => now - p.time < 800);
            if (laserPoints.current.length > 1) {
                tempCtx.beginPath();
                tempCtx.strokeStyle = '#ef4444';
                tempCtx.lineWidth = 4;
                tempCtx.lineCap = 'round';
                laserPoints.current.forEach((p, i) => {
                    if (i === 0) tempCtx.moveTo(p.x, p.y);
                    else tempCtx.lineTo(p.x, p.y);
                });
                tempCtx.stroke();
            }
            frame = requestAnimationFrame(animate);
        };
        animate();
        return () => cancelAnimationFrame(frame);
    }, [isDrawing, currentTool, remoteCursors]);

    // --- Real-time Session Logic ---
    const handleConnectSession = (room: string) => {
        // Logic would normally use Supabase Realtime here
        // Simulating connection for now
        setRoomId(room);
        setIsConnected(true);
        setIsSessionModalOpen(false);
        // Note: Real implementation would subscribe to supabase channel
    };

    const handleClear = () => {
        if (confirm('هل تريد مسح السبورة بالكامل؟')) {
            const ctx = canvasRef.current?.getContext('2d');
            if (ctx) ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
            setHistory(['']);
            setHistoryStep(0);
            broadcast({ type: 'clear' });
        }
    };

    const handleExport = () => {
        const link = document.createElement('a');
        link.download = `smart-board-${Date.now()}.png`;
        link.href = canvasRef.current!.toDataURL();
        link.click();
    };

    return (
        <div className="flex flex-col h-[calc(100vh-10rem)] bg-slate-50 dark:bg-slate-950 rounded-[3rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden relative font-cairo">
            
            {/* Top Properties Bar */}
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl px-8 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-6 z-20 shadow-sm">
                <div className="flex items-center gap-6">
                    {/* Color Picker */}
                    <div className="flex items-center gap-1.5 p-1.5 bg-slate-50 dark:bg-slate-800 rounded-2xl border dark:border-slate-700">
                        {COLORS.map(c => (
                            <button key={c} onClick={() => setSettings(s => ({ ...s, color: c }))} className={`w-8 h-8 rounded-xl border-2 transition-all ${settings.color === c ? 'border-indigo-500 scale-110 shadow-lg' : 'border-transparent'}`} style={{ backgroundColor: c }} />
                        ))}
                    </div>

                    {/* Stroke Thickness */}
                    <div className="flex items-center gap-4 border-r dark:border-slate-700 pr-6 mr-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">السمك</span>
                        <input type="range" min="1" max="50" value={settings.thickness} onChange={e => setSettings(s => ({ ...s, thickness: parseInt(e.target.value) }))} className="w-32 accent-indigo-600" />
                    </div>

                    {/* Shapes Selector */}
                    {currentTool === 'shape' && (
                        <select value={shapeType} onChange={e => setShapeType(e.target.value)} className="bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-2.5 text-xs font-bold dark:text-white focus:ring-2 focus:ring-indigo-500">
                            <option value="rectangle">مستطيل</option>
                            <option value="circle">دائرة</option>
                            <option value="arrow">سهم</option>
                            <option value="star">نجمة</option>
                            <option value="check">علامة صح</option>
                        </select>
                    )}

                    {/* Background Selector */}
                    <select value={backgroundType} onChange={e => setBackgroundType(e.target.value)} className="bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-2.5 text-xs font-bold dark:text-white focus:ring-2 focus:ring-indigo-500">
                        <option value="plain">خلفية بيضاء</option>
                        <option value="grid">شبكة مربعات</option>
                        <option value="lines">تسطير</option>
                        <option value="dots">نقاط</option>
                    </select>
                </div>

                {/* Page Control */}
                <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800 p-1.5 rounded-2xl border dark:border-slate-700 shadow-inner">
                    <button disabled={currentPageIndex === 0} className="w-10 h-10 rounded-xl hover:bg-white dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 disabled:opacity-30"><ChevronRight size={20} /></button>
                    <span className="text-xs font-black dark:text-white px-2">صفحة {currentPageIndex + 1} / {pages.length}</span>
                    <button disabled={currentPageIndex === pages.length - 1} className="w-10 h-10 rounded-xl hover:bg-white dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 disabled:opacity-30"><ChevronLeft size={20} /></button>
                    <div className="w-px h-6 bg-slate-200 dark:bg-slate-700"></div>
                    <button onClick={() => setPages(p => [...p, ''])} className="w-10 h-10 rounded-xl hover:bg-white dark:hover:bg-slate-700 flex items-center justify-center text-indigo-600"><FilePlus size={20} /></button>
                </div>

                {/* Global Actions */}
                <div className="flex items-center gap-3">
                    <button onClick={() => setIsSessionModalOpen(true)} className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl text-xs font-black transition-all ${isConnected ? 'bg-emerald-500 text-white shadow-emerald-200' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'} shadow-lg`}>
                        <Users size={16} /> {isConnected ? 'متصل الآن' : 'بدء جلسة'}
                    </button>
                    <button onClick={handleUndo} disabled={historyStep <= 0} className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-indigo-600 disabled:opacity-30"><Undo2 size={20} /></button>
                    <button onClick={handleClear} className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center text-rose-500 hover:bg-rose-500 hover:text-white transition-all"><Trash2 size={20} /></button>
                    <button onClick={handleExport} className="px-6 py-2.5 bg-indigo-600 text-white rounded-2xl text-xs font-black shadow-xl hover:bg-indigo-700 active:scale-95 transition-all"><Download size={18} /> تصدير</button>
                </div>
            </div>

            {/* Main Workspace */}
            <div className="flex-1 flex overflow-hidden relative">
                
                {/* Desktop Sidebar Toolbar */}
                <aside className="w-20 bg-white dark:bg-slate-900 border-l border-slate-100 dark:border-slate-800 flex flex-col items-center py-8 gap-4 shadow-xl z-20 overflow-y-auto custom-scrollbar">
                    {[
                        { id: 'pen', icon: Pen, label: 'قلم' },
                        { id: 'highlighter', icon: Highlighter, label: 'تظليل' },
                        { id: 'eraser', icon: Eraser, label: 'ممحاة' },
                        { id: 'text', icon: Type, label: 'نص' },
                        { id: 'shape', icon: Square, label: 'أشكال' },
                        { id: 'laser', icon: Wand2, label: 'ليزر' },
                        { id: 'hand', icon: Move, label: 'تحريك' },
                    ].map(tool => (
                        <button key={tool.id} onClick={() => setCurrentTool(tool.id)} title={tool.label} className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${currentTool === tool.id ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 dark:shadow-none scale-110' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-indigo-600'}`}>
                            <tool.icon size={22} />
                        </button>
                    ))}
                    <div className="w-10 h-px bg-slate-100 dark:bg-slate-800 my-2"></div>
                    <label className="w-12 h-12 rounded-2xl flex items-center justify-center text-slate-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 cursor-pointer transition-all">
                        <ImageIcon size={22} />
                        <input type="file" className="hidden" accept="image/*" />
                    </label>
                </aside>

                {/* Canvas Area */}
                <main className="flex-1 relative bg-white overflow-hidden touch-none" ref={containerRef}>
                    {isConnected && (
                        <div className="absolute top-6 left-6 z-30 flex items-center gap-3 bg-white/90 dark:bg-slate-800/90 backdrop-blur px-4 py-2 rounded-full border dark:border-slate-700 shadow-sm pointer-events-none">
                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
                            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">بث مباشر: {roomId}</span>
                        </div>
                    )}
                    
                    <canvas 
                        ref={canvasRef} 
                        className="absolute inset-0 z-0" 
                        onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing}
                    />
                    <canvas ref={tempCanvasRef} className="absolute inset-0 z-10 pointer-events-none" />

                    {textInput?.visible && (
                        <textarea 
                            ref={textAreaRef} autoFocus value={textInput.value} 
                            onChange={e => setTextInput({ ...textInput, value: e.target.value })}
                            onBlur={finishText}
                            placeholder="اكتب شيئاً..."
                            className="absolute z-50 bg-white/90 dark:bg-slate-800/90 border-2 border-indigo-500 rounded-2xl p-4 shadow-2xl outline-none resize-none min-w-[200px] font-bold text-lg"
                            style={{ left: textInput.x, top: textInput.y }}
                        />
                    )}
                </main>
            </div>

            {/* Mobile Bottom Toolbar */}
            <div className="lg:hidden flex justify-around p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 z-50">
                {['pen', 'eraser', 'shape', 'text', 'laser'].map(t => (
                    <button key={t} onClick={() => setCurrentTool(t)} className={`p-4 rounded-2xl transition-all ${currentTool === t ? 'bg-indigo-100 text-indigo-600' : 'text-slate-400'}`}>
                        {t === 'pen' && <Pen size={24} />}
                        {t === 'eraser' && <Eraser size={24} />}
                        {t === 'shape' && <Square size={24} />}
                        {t === 'text' && <Type size={24} />}
                        {t === 'laser' && <Wand2 size={24} />}
                    </button>
                ))}
            </div>

            <SessionModal isOpen={isSessionModalOpen} onClose={() => setIsSessionModalOpen(false)} onConnect={handleConnectSession} initialRoomId={roomId} isConnecting={false} />
            
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
                canvas { touch-action: none; image-rendering: pixelated; }
            `}</style>
        </div>
    );

    function handleUndo() {
        if (historyStep > 0) setHistoryStep(s => s - 1);
    }
};
