
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
    Pen, Eraser, Type, Square, 
    Highlighter, Wand2, Image as ImageIcon,
    Undo2, Redo2, Download, Trash2, 
    ChevronRight, ChevronLeft, FilePlus,
    Users, Link as LinkIcon, Settings, Loader2,
    Check, X as CloseIcon, Star, ArrowUpRight, MousePointer2,
    Triangle, Circle, Minus, StickyNote, Grid3X3, AlignJustify, 
    Maximize2, Camera, CheckCircle2, XCircle, Printer, Move
} from 'lucide-react';
import { supabase } from '../services/db';
import { translations } from '../i18n';

// --- Helpers ---
const generateId = () => Math.random().toString(36).substr(2, 6).toUpperCase();

const drawBackground = (ctx: CanvasRenderingContext2D, width: number, height: number, type: string, theme: 'green' | 'black' | 'white') => {
    ctx.save();
    // Base Colors
    if (theme === 'green') ctx.fillStyle = '#064e3b';
    else if (theme === 'black') ctx.fillStyle = '#0f172a';
    else ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    
    // Chalkboard texture effect (Natural look)
    if (theme !== 'white') {
        ctx.globalAlpha = 0.04;
        for (let i = 0; i < 300; i++) {
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(Math.random() * width, Math.random() * height, Math.random() * 1.5, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1.0;
    }

    ctx.strokeStyle = theme === 'white' ? '#e2e8f0' : 'rgba(255,255,255,0.08)'; 
    ctx.lineWidth = 1;

    if (type === 'lines') {
        const spacing = 40;
        ctx.beginPath();
        for (let y = spacing; y < height; y += spacing) { ctx.moveTo(0, y); ctx.lineTo(width, y); }
        ctx.stroke();
    } else if (type === 'grid') {
        const spacing = 50;
        ctx.beginPath();
        for (let x = spacing; x < width; x += spacing) { ctx.moveTo(x, 0); ctx.lineTo(x, height); }
        for (let y = spacing; y < height; y += spacing) { ctx.moveTo(0, y); ctx.lineTo(width, y); }
        ctx.stroke();
    } else if (type === 'dots') {
        const spacing = 40;
        ctx.fillStyle = theme === 'white' ? '#cbd5e1' : 'rgba(255,255,255,0.15)';
        for (let x = spacing; x < width; x += spacing) {
            for (let y = spacing; y < height; y += spacing) {
                ctx.beginPath(); ctx.arc(x, y, 1.2, 0, Math.PI * 2); ctx.fill();
            }
        }
    }
    ctx.restore();
};

const drawShape = (ctx: CanvasRenderingContext2D, start: any, end: any, type: string, fill: boolean, isChalk: boolean) => {
    const width = end.x - start.x;
    const height = end.y - start.y;
    const centerX = start.x + width / 2;
    const centerY = start.y + height / 2;
    
    if (isChalk) {
        ctx.setLineDash([2, 4]);
        ctx.shadowBlur = 1;
        ctx.shadowColor = ctx.strokeStyle as string;
    }

    ctx.beginPath();
    if (type === 'rectangle') ctx.rect(start.x, start.y, width, height);
    else if (type === 'circle') ctx.ellipse(centerX, centerY, Math.abs(width) / 2, Math.abs(height) / 2, 0, 0, 2 * Math.PI);
    else if (type === 'triangle') {
        ctx.moveTo(centerX, start.y); ctx.lineTo(start.x, end.y); ctx.lineTo(end.x, end.y); ctx.closePath();
    } else if (type === 'arrow') {
        const angle = Math.atan2(end.y - start.y, end.x - start.x);
        const headLen = 15;
        ctx.moveTo(start.x, start.y); ctx.lineTo(end.x, end.y);
        ctx.moveTo(end.x, end.y);
        ctx.lineTo(end.x - headLen * Math.cos(angle - Math.PI / 6), end.y - headLen * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(end.x, end.y);
        ctx.lineTo(end.x - headLen * Math.cos(angle + Math.PI / 6), end.y - headLen * Math.sin(angle + Math.PI / 6));
    } else if (type === 'line') {
        ctx.moveTo(start.x, start.y); ctx.lineTo(end.x, end.y);
    } else if (type === 'star') {
        const spikes = 5; const outerR = Math.min(Math.abs(width), Math.abs(height)) / 2; const innerR = outerR / 2;
        let rot = Math.PI / 2 * 3; let x = centerX; let y = centerY; const step = Math.PI / spikes;
        ctx.moveTo(centerX, centerY - outerR);
        for (let i = 0; i < spikes; i++) {
            x = centerX + Math.cos(rot) * outerR; y = centerY + Math.sin(rot) * outerR; ctx.lineTo(x, y); rot += step;
            x = centerX + Math.cos(rot) * innerR; y = centerY + Math.sin(rot) * innerR; ctx.lineTo(x, y); rot += step;
        }
        ctx.closePath();
    } else if (type === 'check') {
        const size = Math.min(Math.abs(width), Math.abs(height)); const pad = size * 0.2;
        ctx.moveTo(start.x + pad, centerY); ctx.lineTo(centerX, end.y - pad); ctx.lineTo(end.x - pad, start.y + pad);
    } else if (type === 'cross') {
        const pad = Math.min(Math.abs(width), Math.abs(height)) * 0.2;
        ctx.moveTo(start.x + pad, start.y + pad); ctx.lineTo(end.x - pad, end.y - pad);
        ctx.moveTo(end.x - pad, start.y + pad); ctx.lineTo(start.x + pad, end.y - pad);
    }

    if (fill && !['arrow', 'line', 'check', 'cross'].includes(type)) ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;
};

export const Blackboard: React.FC<{ lang?: 'ar' | 'en' }> = ({ lang = 'ar' }) => {
    const t = translations[lang];
    const [currentTool, setCurrentTool] = useState('pen');
    const [theme, setTheme] = useState<'green' | 'black' | 'white'>('green');
    const [settings, setSettings] = useState({ color: '#ffffff', thickness: 4, isFilled: false });
    const [shapeType, setShapeType] = useState('rectangle');
    const [gridType, setGridType] = useState('plain');
    const [pages, setPages] = useState<string[]>(['']);
    const [currentPageIdx, setCurrentPageIdx] = useState(0);
    
    const [isDrawing, setIsDrawing] = useState(false);
    const [startPoint, setStartPoint] = useState<any>(null);
    const [lastPoint, setLastPoint] = useState<any>(null);
    const [stickyNotes, setStickyNotes] = useState<any[]>([]);
    const [textInput, setTextInput] = useState<any>(null);

    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const tempCanvasRef = useRef<HTMLCanvasElement>(null);
    const laserPoints = useRef<any[]>([]);

    const COLORS = theme === 'white' ? 
        ['#000000', '#ef4444', '#22c55e', '#3b82f6', '#4f46e5', '#a855f7'] : 
        ['#ffffff', '#fbbf24', '#f87171', '#60a5fa', '#34d399', '#f472b6'];

    const getCoords = (e: any) => {
        if (!containerRef.current) return { x: 0, y: 0, nx: 0, ny: 0 };
        const rect = containerRef.current.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const x = clientX - rect.left; const y = clientY - rect.top;
        return { x, y, nx: x / rect.width, ny: y / rect.height };
    };

    useEffect(() => {
        const animate = () => {
            const tempCtx = tempCanvasRef.current?.getContext('2d');
            if (!tempCtx || !tempCanvasRef.current) return;
            if (!isDrawing || currentTool !== 'shape') {
                tempCtx.clearRect(0, 0, tempCanvasRef.current.width, tempCanvasRef.current.height);
            }
            const now = Date.now();
            laserPoints.current = laserPoints.current.filter(p => now - p.time < 800);
            if (laserPoints.current.length > 0) {
                tempCtx.lineCap = 'round';
                for (let i = 1; i < laserPoints.current.length; i++) {
                    const p1 = laserPoints.current[i-1]; const p2 = laserPoints.current[i];
                    if (Math.abs(p1.x - p2.x) > 100) continue;
                    const opacity = 1 - ((now - p2.time) / 800);
                    tempCtx.beginPath(); tempCtx.moveTo(p1.x, p1.y); tempCtx.lineTo(p2.x, p2.y);
                    tempCtx.lineWidth = 4; tempCtx.strokeStyle = `rgba(239, 68, 68, ${opacity})`; tempCtx.stroke();
                }
            }
            requestAnimationFrame(animate);
        };
        const animId = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animId);
    }, [isDrawing, currentTool]);

    const startDrawing = (e: any) => {
        const coords = getCoords(e);
        if (currentTool === 'text') {
            if (textInput?.visible) finishText();
            else setTextInput({ x: coords.x, y: coords.y, nx: coords.nx, ny: coords.ny, visible: true, value: '' });
            return;
        }
        setIsDrawing(true); setStartPoint(coords); setLastPoint(coords);
    };

    const draw = (e: any) => {
        const coords = getCoords(e);
        if (currentTool === 'laser') {
            laserPoints.current.push({ x: coords.x, y: coords.y, time: Date.now() });
            return;
        }
        if (!isDrawing || !lastPoint) return;
        const ctx = canvasRef.current?.getContext('2d'); if (!ctx) return;

        if (['pen', 'eraser', 'highlighter'].includes(currentTool)) {
            ctx.beginPath();
            ctx.strokeStyle = currentTool === 'eraser' ? (theme === 'white' ? '#ffffff' : (theme === 'green' ? '#064e3b' : '#0f172a')) : settings.color;
            ctx.lineWidth = currentTool === 'highlighter' ? settings.thickness * 8 : settings.thickness;
            ctx.globalAlpha = currentTool === 'highlighter' ? 0.35 : 1.0;
            ctx.lineCap = 'round';
            if (theme !== 'white' && currentTool === 'pen') {
                ctx.shadowBlur = 1; ctx.shadowColor = settings.color; ctx.setLineDash([1, 2]);
            }
            ctx.moveTo(lastPoint.x, lastPoint.y); ctx.lineTo(coords.x, coords.y); ctx.stroke();
            setLastPoint(coords); ctx.globalAlpha = 1.0; ctx.shadowBlur = 0; ctx.setLineDash([]);
        } else if (currentTool === 'shape') {
            const tempCtx = tempCanvasRef.current?.getContext('2d');
            if (tempCtx) {
                tempCtx.clearRect(0, 0, tempCanvasRef.current!.width, tempCanvasRef.current!.height);
                tempCtx.strokeStyle = settings.color; tempCtx.lineWidth = settings.thickness; tempCtx.fillStyle = settings.color;
                drawShape(tempCtx, startPoint, coords, shapeType, settings.isFilled, theme !== 'white');
            }
        }
    };

    const stopDrawing = () => {
        if (!isDrawing) return;
        setIsDrawing(false);
        const ctx = canvasRef.current?.getContext('2d');
        if (currentTool === 'shape' && ctx && tempCanvasRef.current) {
            ctx.drawImage(tempCanvasRef.current, 0, 0);
            tempCanvasRef.current.getContext('2d')?.clearRect(0, 0, tempCanvasRef.current.width, tempCanvasRef.current.height);
        }
        updatePageState();
    };

    const updatePageState = () => {
        const newPages = [...pages]; 
        newPages[currentPageIdx] = canvasRef.current?.toDataURL() || ''; 
        setPages(newPages);
    };

    const finishText = () => {
        if (!textInput || !textInput.value) { setTextInput(null); return; }
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) {
            ctx.save(); ctx.font = `bold ${settings.thickness * 5}px 'Cairo'`; ctx.fillStyle = settings.color; ctx.textBaseline = 'top';
            textInput.value.split('\n').forEach((line: string, i: number) => {
                ctx.fillText(line, textInput.x, textInput.y + (i * settings.thickness * 6));
            });
            ctx.restore();
            updatePageState();
        }
        setTextInput(null);
    };

    const handleClear = () => {
        if (confirm(t.blackboard_clear_confirm)) {
            const ctx = canvasRef.current?.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
                drawBackground(ctx, canvasRef.current!.width, canvasRef.current!.height, gridType, theme);
                setStickyNotes([]);
                updatePageState();
            }
        }
    };

    const exportPDF = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        const slidesHtml = pages.map((p, i) => `
            <div style="page-break-after: always; height: 100vh; display: flex; align-items: center; justify-content: center; background: #0f172a; padding: 20px;">
                <img src="${p}" style="max-width: 100%; max-height: 100%; border: 15px solid #3e2723; border-radius: 10px; box-shadow: 0 20px 40px rgba(0,0,0,0.8);">
            </div>
        `).join('');
        printWindow.document.write(`<html><body style="margin:0; background: #020617;">${slidesHtml}<script>window.onload=()=>window.print();</script></body></html>`);
        printWindow.document.close();
    };

    const initCanvas = useCallback(() => {
        if (!containerRef.current || !canvasRef.current || !tempCanvasRef.current) return;
        const { clientWidth, clientHeight } = containerRef.current;
        canvasRef.current.width = tempCanvasRef.current.width = clientWidth;
        canvasRef.current.height = tempCanvasRef.current.height = clientHeight;
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
            drawBackground(ctx, clientWidth, clientHeight, gridType, theme);
            if (pages[currentPageIdx]) {
                const img = new Image(); img.src = pages[currentPageIdx];
                img.onload = () => ctx.drawImage(img, 0, 0);
            }
        }
    }, [gridType, theme, currentPageIdx, pages]);

    useEffect(() => { initCanvas(); window.addEventListener('resize', initCanvas); return () => window.removeEventListener('resize', initCanvas); }, [initCanvas]);

    return (
        <div className={`flex flex-col h-[calc(100vh-10rem)] bg-slate-50 dark:bg-slate-950 rounded-[3.5rem] shadow-2xl border-[12px] border-[#3e2723] overflow-hidden relative font-cairo ${lang === 'ar' ? 'rtl' : 'ltr'}`}>
            
            {/* Professional School Tray */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-[#211210] p-3 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.6)] flex items-center gap-6 z-50 border-t-4 border-[#5d4037]">
                <div className="flex gap-2.5 px-4 border-l border-white/10">
                    {COLORS.map(c => (
                        <button key={c} onClick={() => setSettings(s => ({ ...s, color: c }))} className={`w-10 h-10 rounded-full transition-all border-2 ${settings.color === c ? 'scale-125 border-white shadow-[0_0_15px_white]' : 'border-transparent opacity-60 hover:opacity-100'}`} style={{ backgroundColor: c }} />
                    ))}
                </div>
                <div className="flex gap-2">
                    {[
                        { id: 'pen', icon: Pen, label: 'طباشير' },
                        { id: 'eraser', icon: Eraser, label: 'ممسحة' },
                        { id: 'text', icon: Type, label: 'نص' },
                        { id: 'shape', icon: Square, label: 'أشكال' },
                        { id: 'laser', icon: Wand2, label: 'ليزر' },
                    ].map(t => (
                        <button key={t.id} onClick={() => setCurrentTool(t.id)} className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${currentTool === t.id ? 'bg-white text-[#3e2723] shadow-xl scale-110' : 'text-white/40 hover:text-white hover:bg-white/5'}`}>
                            <t.icon size={26} />
                        </button>
                    ))}
                    <button onClick={() => setStickyNotes([...stickyNotes, { id: Date.now(), x: 100, y: 100, text: '', color: '#fef3c7' }])} className="w-14 h-14 bg-amber-400 text-amber-950 rounded-2xl flex items-center justify-center hover:scale-110 transition-all shadow-lg"><StickyNote size={26} /></button>
                </div>
            </div>

            {/* School Header Panel */}
            <div className="bg-[#2d1b18] px-10 py-5 flex flex-wrap items-center justify-between gap-6 z-20 shadow-2xl border-b border-[#3e2723]">
                <div className="flex items-center gap-5">
                    <div className="flex bg-black/40 p-1 rounded-2xl border border-white/10">
                        <button onClick={() => setTheme('green')} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${theme === 'green' ? 'bg-[#064e3b] text-white shadow-lg' : 'text-white/30'}`}>خضراء</button>
                        <button onClick={() => setTheme('black')} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${theme === 'black' ? 'bg-slate-900 text-white shadow-lg' : 'text-white/30'}`}>سوداء</button>
                        <button onClick={() => setTheme('white')} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${theme === 'white' ? 'bg-white text-indigo-800 shadow-lg' : 'text-white/30'}`}>بيضاء</button>
                    </div>
                    <div className="flex bg-black/40 p-1 rounded-2xl border border-white/10">
                        <button onClick={() => setGridType('plain')} className={`p-2.5 rounded-xl ${gridType === 'plain' ? 'bg-white/20 text-white' : 'text-white/30'}`}><Maximize2 size={18} /></button>
                        <button onClick={() => setGridType('lines')} className={`p-2.5 rounded-xl ${gridType === 'lines' ? 'bg-white/20 text-white' : 'text-white/30'}`}><AlignJustify size={18} /></button>
                        <button onClick={() => setGridType('grid')} className={`p-2.5 rounded-xl ${gridType === 'grid' ? 'bg-white/20 text-white' : 'text-white/30'}`}><Grid3X3 size={18} /></button>
                    </div>
                </div>

                <div className="flex items-center gap-3 bg-black/30 p-1.5 rounded-2xl border border-white/5">
                    <button onClick={() => currentPageIdx > 0 && setCurrentPageIdx(currentPageIdx - 1)} disabled={currentPageIdx === 0} className="p-2.5 text-white/60 hover:text-white disabled:opacity-20"><ChevronRight size={22} /></button>
                    <span className="text-sm font-black text-white px-4 min-w-[70px] text-center">{currentPageIdx + 1} / {pages.length}</span>
                    <button onClick={() => currentPageIdx < pages.length - 1 && setCurrentPageIdx(currentPageIdx + 1)} disabled={currentPageIdx === pages.length - 1} className="p-2.5 text-white/60 hover:text-white disabled:opacity-20"><ChevronLeft size={22} /></button>
                    <button onClick={() => { setPages([...pages, '']); setCurrentPageIdx(pages.length); }} className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center hover:bg-indigo-500 shadow-lg transition-all"><FilePlus size={20} /></button>
                </div>

                <div className="flex items-center gap-3">
                    <button onClick={exportPDF} className="px-8 py-3.5 bg-white text-[#3e2723] rounded-2xl font-black text-xs shadow-xl flex items-center gap-3 hover:bg-slate-100 transition-all"><Printer size={20} /> تصدير الدرس PDF</button>
                    <button onClick={handleClear} className="w-12 h-12 rounded-2xl bg-rose-500 text-white flex items-center justify-center hover:bg-rose-600 transition-all shadow-lg"><Trash2 size={24} /></button>
                </div>
            </div>

            {/* Float Palette for shapes */}
            {currentTool === 'shape' && (
                <div className="absolute top-32 left-10 flex flex-col gap-3 bg-white p-3 rounded-[2.5rem] shadow-2xl animate-in slide-in-from-left-4 z-50 border-2 border-indigo-100">
                    {[
                        { id: 'rectangle', icon: Square }, { id: 'circle', icon: Circle },
                        { id: 'triangle', icon: Triangle }, { id: 'star', icon: Star },
                        { id: 'arrow', icon: ArrowUpRight }, { id: 'line', icon: Minus },
                        { id: 'check', icon: CheckCircle2 }, { id: 'cross', icon: XCircle }
                    ].map(s => (
                        <button key={s.id} onClick={() => setShapeType(s.id)} className={`w-12 h-12 rounded-2xl transition-all flex items-center justify-center ${shapeType === s.id ? 'bg-indigo-600 text-white shadow-lg scale-110' : 'text-slate-400 hover:bg-slate-50'}`}><s.icon size={22} /></button>
                    ))}
                </div>
            )}

            {/* Blackboard Canvas Surface */}
            <main className="flex-1 relative touch-none bg-slate-900/50" ref={containerRef}>
                <canvas ref={canvasRef} className="absolute inset-0 z-0" onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing} />
                <canvas ref={tempCanvasRef} className="absolute inset-0 z-10 pointer-events-none" />

                {textInput?.visible && (
                    <div className="absolute z-[60] bg-white/10 backdrop-blur-md p-1 rounded-2xl border-2 border-indigo-500 shadow-2xl" style={{ left: textInput.x, top: textInput.y }}>
                        <textarea
                            autoFocus
                            value={textInput.value}
                            onChange={(e) => setTextInput({ ...textInput, value: e.target.value })}
                            onBlur={finishText}
                            className="bg-transparent text-white outline-none font-black min-w-[280px] p-5 text-2xl resize-none placeholder:text-white/20"
                            placeholder="اكتب فكرتك هنا..."
                        />
                        <div className="flex justify-end p-2 border-t border-white/10"><button onClick={finishText} className="bg-indigo-600 text-white px-5 py-2 rounded-xl font-black text-xs shadow-lg">تثبيت النص</button></div>
                    </div>
                )}

                {stickyNotes.map(note => (
                    <div key={note.id} className="absolute p-6 shadow-[0_20px_50px_rgba(0,0,0,0.3)] animate-in zoom-in cursor-move z-30 group" style={{ left: note.x, top: note.y, backgroundColor: note.color, width: '220px', transform: 'rotate(-2deg)' }}>
                        <button onClick={() => setStickyNotes(stickyNotes.filter(n => n.id !== note.id))} className="absolute -top-3 -right-3 w-8 h-8 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"><CloseIcon size={14} /></button>
                        <textarea className="w-full bg-transparent border-none outline-none font-black text-base text-slate-800 resize-none h-32" placeholder="اكتب ملاحظة هامة..." defaultValue={note.text} />
                    </div>
                ))}
            </main>

            <style>{`
                canvas { touch-action: none; cursor: crosshair; }
                .stroke-round { stroke-linecap: round; stroke-linejoin: round; }
            `}</style>
        </div>
    );
};
