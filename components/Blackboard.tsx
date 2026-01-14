
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
    Pen, Eraser, Type, Square, 
    Highlighter, Move, Wand2, Image as ImageIcon,
    Undo2, Redo2, Download, Trash2, 
    ChevronRight, ChevronLeft, FilePlus,
    Users, Link as LinkIcon, Settings, LogOut, Loader2,
    Check, X as CloseIcon, Star, ArrowUpRight, MousePointer2,
    Upload
} from 'lucide-react';
import { supabase } from '../services/db';

// --- Helpers ---
const generateId = () => Math.random().toString(36).substr(2, 6).toUpperCase();

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
    }
    if (fill && !['arrow'].includes(type)) {
        ctx.fill();
    }
    ctx.stroke();
};

// --- Modal Component ---
const SessionModal = ({ isOpen, onClose, onConnect, isConnecting, initialRoomId }: any) => {
    const [roomId, setRoomId] = useState(initialRoomId || '');
    const [copied, setCopied] = useState(false);

    useEffect(() => { if (!roomId && isOpen) setRoomId(generateId()); }, [isOpen]);

    if (!isOpen) return null;

    const handleCopyLink = async () => {
        const url = new URL(window.location.href);
        url.searchParams.set('room', roomId);
        await navigator.clipboard.writeText(roomId);
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
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 px-2">كود الغرفة</label>
                        <input type="text" value={roomId} onChange={e => setRoomId(e.target.value.toUpperCase())} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 text-center font-mono text-xl tracking-widest dark:text-white focus:ring-2 focus:ring-indigo-500 uppercase" />
                    </div>
                    <div className="flex flex-col gap-3">
                        <button onClick={() => onConnect(roomId)} disabled={isConnecting} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl shadow-xl transition-all active:scale-95 flex justify-center items-center gap-3">
                            {isConnecting ? <Loader2 className="animate-spin" /> : <Users size={20} />}
                            دخول الغرفة
                        </button>
                        <button onClick={handleCopyLink} className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-3">
                            <LinkIcon size={18} />
                            {copied ? 'تم نسخ الكود' : 'نسخ كود الغرفة'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const Blackboard: React.FC = () => {
    const [currentTool, setCurrentTool] = useState('pen');
    const [settings, setSettings] = useState({ color: '#4f46e5', thickness: 5, isFilled: false });
    const [shapeType, setShapeType] = useState('rectangle');
    const [backgroundType, setBackgroundType] = useState('plain');
    const [history, setHistory] = useState<string[]>([]);
    const [historyStep, setHistoryStep] = useState(-1);
    const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [roomId, setRoomId] = useState<string | null>(null);
    const [remoteCursors, setRemoteCursors] = useState<any>({});
    const [textInput, setTextInput] = useState<any>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [startPoint, setStartPoint] = useState<any>(null);
    const [lastPoint, setLastPoint] = useState<any>(null);

    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const tempCanvasRef = useRef<HTMLCanvasElement>(null);
    const channelRef = useRef<any>(null);
    const textAreaRef = useRef<HTMLTextAreaElement>(null);

    const COLORS = ['#000000', '#ef4444', '#22c55e', '#3b82f6', '#eab308', '#a855f7', '#4f46e5'];

    const getCoords = (e: any) => {
        if (!containerRef.current) return { x: 0, y: 0, nx: 0, ny: 0 };
        const rect = containerRef.current.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        return { x, y, nx: x / rect.width, ny: y / rect.height };
    };

    const broadcast = useCallback((payload: any) => {
        if (isConnected && channelRef.current) {
            channelRef.current.send({
                type: 'broadcast',
                event: 'drawing_event',
                payload
            });
        }
    }, [isConnected]);

    // Setup Supabase Realtime
    useEffect(() => {
        if (isConnected && roomId && supabase) {
            const channel = supabase.channel(`room_${roomId}`, {
                config: { broadcast: { self: false } }
            });

            channel
                .on('broadcast', { event: 'drawing_event' }, ({ payload }) => {
                    handleRemoteEvent(payload);
                })
                .subscribe();

            channelRef.current = channel;
            return () => { channel.unsubscribe(); };
        }
    }, [isConnected, roomId]);

    const handleRemoteEvent = (data: any) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const w = canvas.width;
        const h = canvas.height;

        switch (data.type) {
            case 'draw':
                ctx.beginPath();
                ctx.strokeStyle = data.color;
                ctx.lineWidth = data.thickness;
                ctx.globalAlpha = data.opacity || 1.0;
                ctx.lineCap = 'round';
                ctx.moveTo(data.x0 * w, data.y0 * h);
                ctx.lineTo(data.x1 * w, data.y1 * h);
                ctx.stroke();
                ctx.globalAlpha = 1.0;
                break;
            case 'clear':
                ctx.clearRect(0, 0, w, h);
                drawBackground(ctx, w, h, backgroundType);
                break;
            case 'text':
                ctx.font = `${data.fontSize}px Cairo`;
                ctx.fillStyle = data.color;
                ctx.fillText(data.text, data.x * w, data.y * h);
                break;
            case 'shape':
                ctx.strokeStyle = data.color;
                ctx.lineWidth = data.thickness;
                ctx.fillStyle = data.color;
                drawShape(ctx, { x: data.x0 * w, y: data.y0 * h }, { x: data.x1 * w, y: data.y1 * h }, data.shapeType, data.fill);
                break;
            case 'image':
                const img = new Image();
                img.onload = () => ctx.drawImage(img, data.x * w, data.y * h, data.w * w, data.h * h);
                img.src = data.src;
                break;
            case 'cursor':
                setRemoteCursors((prev: any) => ({ ...prev, [data.userId]: { x: data.x, y: data.y } }));
                break;
        }
    };

    const saveToHistory = (dataURL: string) => {
        setHistory(prev => {
            const next = prev.slice(0, historyStep + 1);
            next.push(dataURL);
            if (next.length > 20) next.shift();
            return next;
        });
        setHistoryStep(prev => prev + 1);
    };

    const startDrawing = (e: any) => {
        const coords = getCoords(e);
        if (currentTool === 'text') {
            if (textInput) finishText();
            else setTextInput({ ...coords, value: '' });
            return;
        }
        setIsDrawing(true);
        setStartPoint(coords);
        setLastPoint(coords);
    };

    const draw = (e: any) => {
        const coords = getCoords(e);
        if (isConnected) broadcast({ type: 'cursor', x: coords.nx, y: coords.ny, userId: 'User1' });

        if (!isDrawing || !lastPoint) return;
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;

        if (['pen', 'eraser', 'highlighter'].includes(currentTool)) {
            ctx.beginPath();
            ctx.strokeStyle = currentTool === 'eraser' ? '#ffffff' : settings.color;
            ctx.lineWidth = currentTool === 'highlighter' ? settings.thickness * 4 : settings.thickness;
            ctx.globalAlpha = currentTool === 'highlighter' ? 0.3 : 1.0;
            ctx.lineCap = 'round';
            ctx.moveTo(lastPoint.x, lastPoint.y);
            ctx.lineTo(coords.x, coords.y);
            ctx.stroke();

            broadcast({
                type: 'draw',
                x0: lastPoint.nx, y0: lastPoint.ny,
                x1: coords.nx, y1: coords.ny,
                color: ctx.strokeStyle,
                thickness: ctx.lineWidth,
                opacity: ctx.globalAlpha
            });
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
        const coords = getCoords(e);
        const ctx = canvasRef.current?.getContext('2d');
        if (currentTool === 'shape' && ctx && tempCanvasRef.current) {
            ctx.drawImage(tempCanvasRef.current, 0, 0);
            broadcast({
                type: 'shape',
                shapeType,
                x0: startPoint.nx, y0: startPoint.ny,
                x1: coords.nx, y1: coords.ny,
                color: settings.color,
                thickness: settings.thickness,
                fill: settings.isFilled
            });
            tempCanvasRef.current.getContext('2d')?.clearRect(0, 0, tempCanvasRef.current.width, tempCanvasRef.current.height);
        }
        if (canvasRef.current) saveToHistory(canvasRef.current.toDataURL());
    };

    const finishText = () => {
        if (textInput && textInput.value.trim()) {
            const ctx = canvasRef.current?.getContext('2d');
            if (ctx) {
                const fontSize = settings.thickness * 4;
                ctx.font = `${fontSize}px Cairo`;
                ctx.fillStyle = settings.color;
                ctx.fillText(textInput.value, textInput.x, textInput.y);
                broadcast({
                    type: 'text',
                    text: textInput.value,
                    x: textInput.nx,
                    y: textInput.ny,
                    color: settings.color,
                    fontSize
                });
                saveToHistory(canvasRef.current!.toDataURL());
            }
        }
        setTextInput(null);
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const src = event.target?.result as string;
            const img = new Image();
            img.onload = () => {
                const ctx = canvasRef.current?.getContext('2d');
                if (ctx) {
                    const canvas = canvasRef.current!;
                    const w = 0.3; // 30% width
                    const h = (img.height / img.width) * w * (canvas.width / canvas.height);
                    ctx.drawImage(img, 0.35 * canvas.width, 0.35 * canvas.height, w * canvas.width, h * canvas.height);
                    broadcast({ type: 'image', src, x: 0.35, y: 0.35, w, h });
                    saveToHistory(canvas.toDataURL());
                }
            };
            img.src = src;
        };
        reader.readAsDataURL(file);
    };

    const initCanvas = useCallback(() => {
        if (!containerRef.current || !canvasRef.current || !tempCanvasRef.current) return;
        const { clientWidth, clientHeight } = containerRef.current;
        canvasRef.current.width = tempCanvasRef.current.width = clientWidth;
        canvasRef.current.height = tempCanvasRef.current.height = clientHeight;
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) drawBackground(ctx, clientWidth, clientHeight, backgroundType);
    }, [backgroundType]);

    useEffect(() => {
        initCanvas();
        window.addEventListener('resize', initCanvas);
        return () => window.removeEventListener('resize', initCanvas);
    }, [initCanvas]);

    const handleClear = () => {
        if (confirm('هل تريد مسح السبورة؟')) {
            const ctx = canvasRef.current?.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
                drawBackground(ctx, canvasRef.current!.width, canvasRef.current!.height, backgroundType);
                broadcast({ type: 'clear' });
                saveToHistory(canvasRef.current!.toDataURL());
            }
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-10rem)] bg-white dark:bg-slate-950 rounded-[3rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden relative font-cairo">
            
            {/* Top Bar */}
            <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-8 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-6 z-20">
                <div className="flex items-center gap-4">
                    <div className="flex gap-1 p-1 bg-slate-50 dark:bg-slate-800 rounded-xl">
                        {COLORS.map(c => (
                            <button key={c} onClick={() => setSettings(s => ({ ...s, color: c }))} className={`w-6 h-6 rounded-lg transition-all ${settings.color === c ? 'scale-110 shadow-md ring-2 ring-indigo-500' : ''}`} style={{ backgroundColor: c }} />
                        ))}
                    </div>
                    <input type="range" min="1" max="40" value={settings.thickness} onChange={e => setSettings(s => ({ ...s, thickness: parseInt(e.target.value) }))} className="w-24 accent-indigo-600" />
                </div>

                <div className="flex items-center gap-3">
                    <button onClick={() => setIsSessionModalOpen(true)} className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl text-xs font-black transition-all ${isConnected ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>
                        <Users size={16} /> {isConnected ? `غرفة: ${roomId}` : 'مشاركة حية'}
                    </button>
                    <button onClick={handleClear} className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all"><Trash2 size={20} /></button>
                </div>
            </div>

            {/* Main Area */}
            <div className="flex-1 flex overflow-hidden">
                <aside className="w-16 bg-white dark:bg-slate-900 border-l border-slate-100 dark:border-slate-800 flex flex-col items-center py-6 gap-4 shadow-xl z-20">
                    {[
                        { id: 'pen', icon: Pen },
                        { id: 'highlighter', icon: Highlighter },
                        { id: 'eraser', icon: Eraser },
                        { id: 'text', icon: Type },
                        { id: 'shape', icon: Square },
                    ].map(t => (
                        <button key={t.id} onClick={() => setCurrentTool(t.id)} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${currentTool === t.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>
                            <t.icon size={20} />
                        </button>
                    ))}
                    <label className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:bg-indigo-50 cursor-pointer">
                        <ImageIcon size={20} />
                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                    </label>
                </aside>

                <main className="flex-1 relative bg-white touch-none" ref={containerRef}>
                    <canvas ref={canvasRef} className="absolute inset-0 z-0" onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing} onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing} />
                    <canvas ref={tempCanvasRef} className="absolute inset-0 z-10 pointer-events-none" />

                    {textInput && (
                        <textarea 
                            ref={textAreaRef} autoFocus 
                            value={textInput.value} 
                            onChange={e => setTextInput({ ...textInput, value: e.target.value })}
                            onBlur={finishText}
                            placeholder="اكتب هنا..."
                            className="absolute z-50 bg-white/90 border-2 border-indigo-500 rounded-xl p-2 shadow-2xl outline-none resize-none font-bold text-lg"
                            style={{ left: textInput.x, top: textInput.y }}
                        />
                    )}

                    {/* Remote Cursors */}
                    {Object.entries(remoteCursors).map(([id, c]: any) => (
                        <div key={id} className="absolute z-40 pointer-events-none flex flex-col items-center" style={{ left: c.x * (containerRef.current?.clientWidth || 0), top: c.y * (containerRef.current?.clientHeight || 0) }}>
                            <MousePointer2 size={20} className="text-indigo-600 fill-indigo-600" />
                            <span className="bg-indigo-600 text-white text-[8px] px-1.5 py-0.5 rounded-full font-black">طالب</span>
                        </div>
                    ))}
                </main>
            </div>

            <SessionModal 
                isOpen={isSessionModalOpen} 
                onClose={() => setIsSessionModalOpen(false)} 
                onConnect={(room: string) => { setRoomId(room); setIsConnected(true); setIsSessionModalOpen(false); }} 
            />
            <style>{`canvas { touch-action: none; cursor: crosshair; }`}</style>
        </div>
    );
};
