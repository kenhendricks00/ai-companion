import React, { useState, useRef, useEffect } from 'react';
import { X, Play, Pause, Camera, MessageSquare, ChevronLeft, ChevronRight } from 'lucide-react';

interface CaptureMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

interface CapturePanelProps {
    isOpen: boolean;
    onClose: () => void;
    lastInteraction: CaptureMessage[] | null;
    videoBlob: Blob | null;
}

export default function CapturePanel({
    isOpen,
    onClose,
    lastInteraction,
    videoBlob,
}: CapturePanelProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [showCaptions, setShowCaptions] = useState(true);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);

    useEffect(() => {
        if (videoBlob) {
            const url = URL.createObjectURL(videoBlob);
            setVideoUrl(url);
            return () => URL.revokeObjectURL(url);
        } else {
            setVideoUrl(null);
        }
    }, [videoBlob]);

    useEffect(() => {
        if (!isOpen) {
            setIsPlaying(false);
            setCurrentTime(0);
            if (videoRef.current) {
                videoRef.current.pause();
                videoRef.current.currentTime = 0;
            }
        }
    }, [isOpen]);

    const handlePlayPause = () => {
        if (!videoRef.current) return;

        if (isPlaying) {
            videoRef.current.pause();
        } else {
            videoRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);
        }
    };

    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            // Fix for duration 0 or Infinity: only do if truly needed
            const d = videoRef.current.duration;
            if (!isFinite(d) || d === 0) {
                // Subtle hack: seek way ahead but reset on next frame
                videoRef.current.currentTime = 1e10;
                const check = () => {
                    if (videoRef.current && isFinite(videoRef.current.duration)) {
                        setDuration(videoRef.current.duration);
                        videoRef.current.currentTime = 0;
                    } else if (isOpen) {
                        requestAnimationFrame(check);
                    }
                };
                requestAnimationFrame(check);
            } else {
                setDuration(d);
            }
        }
    };

    const handleVideoError = (e: any) => {
        console.error('Video element error:', e);
    };

    const handleEnded = () => {
        setIsPlaying(false);
    };

    const handleSeek = (direction: 'back' | 'forward') => {
        if (!videoRef.current) return;
        const skipAmount = 2; // seconds
        if (direction === 'back') {
            videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - skipAmount);
        } else {
            videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + skipAmount);
        }
    };

    const handleSave = async () => {
        if (!videoBlob) return;

        try {
            const { save } = await import('@tauri-apps/plugin-dialog');
            const { writeFile } = await import('@tauri-apps/plugin-fs');

            const filePath = await save({
                filters: [{
                    name: 'Video',
                    extensions: ['webm']
                }],
                defaultPath: `suki-clip-${Date.now()}.webm`
            });

            if (filePath) {
                const arrayBuffer = await videoBlob.arrayBuffer();
                await writeFile(filePath, new Uint8Array(arrayBuffer));
                onClose();
            }
        } catch (error) {
            console.error('Failed to save video:', error);
            const url = URL.createObjectURL(videoBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `suki-clip-${Date.now()}.webm`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    };

    const formatTime = (time: number) => {
        if (!isFinite(time)) return '0:00';
        const mins = Math.floor(time / 60);
        const secs = Math.floor(time % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Generate waveform bars based on playback position
    const waveformBars = Array.from({ length: 40 }, (_, i) => {
        const height = 20 + Math.sin(i * 0.8) * 30 + Math.random() * 10;
        const progress = duration > 0 ? currentTime / duration : 0;
        const isActive = (i / 40) <= progress;
        return { height, isActive };
    });

    if (!isOpen) return null;

    const assistantMessage = lastInteraction?.find(m => m.role === 'assistant');

    return (
        <div className="fixed inset-0 z-[60] bg-[#0a0a0c] flex flex-col font-sans">
            {/* Header */}
            <div className="flex justify-between items-center p-4 backdrop-blur-md bg-black/20">
                <button
                    onClick={onClose}
                    className="p-3 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-all"
                >
                    <X size={20} />
                </button>
                <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse mr-2" />
                    <span className="text-white/40 text-xs font-medium uppercase tracking-widest">Recorded Clip</span>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowCaptions(!showCaptions)}
                        className={`p-3 rounded-full transition-all ${showCaptions ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'}`}
                    >
                        <MessageSquare size={18} />
                    </button>
                </div>
            </div>

            {/* Video container area */}
            <div className="flex-1 relative overflow-hidden bg-black flex items-center justify-center">
                {videoUrl ? (
                    <div className="w-full h-full flex items-center justify-center p-4">
                        <video
                            ref={videoRef}
                            src={videoUrl}
                            className="max-w-full max-h-full rounded-2xl shadow-2xl bg-black object-contain cursor-pointer"
                            onTimeUpdate={handleTimeUpdate}
                            onLoadedMetadata={handleLoadedMetadata}
                            onEnded={handleEnded}
                            onError={handleVideoError}
                            onClick={handlePlayPause}
                            playsInline
                        />
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-4 text-white/30 animate-pulse">
                        <Camera size={48} strokeWidth={1} />
                        <div className="text-center">
                            <p className="text-lg font-medium">No interaction recorded</p>
                            <p className="text-sm">Start a conversation to capture Suki!</p>
                        </div>
                    </div>
                )}

                {/* Caption overlay */}
                {showCaptions && assistantMessage && videoUrl && (
                    <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-full max-w-2xl px-6 pointer-events-none">
                        <div className="backdrop-blur-xl bg-black/60 border border-white/10 rounded-2xl p-4 shadow-2xl">
                            <p className="text-white/90 text-center text-sm sm:text-base leading-relaxed">
                                {assistantMessage.content.replace(/\[.*?\]/g, '').trim()}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Playback & Controls Area */}
            <div className="relative z-10 bg-[#0f0f12] border-t border-white/5 p-6 pb-10 space-y-6 shadow-[0_-20px_40px_rgba(0,0,0,0.5)]">
                {/* Progress & Waveform */}
                <div className="flex flex-col gap-2">
                    <div className="flex items-end justify-between gap-1 h-12 px-2">
                        {waveformBars.map((bar, i) => (
                            <div
                                key={i}
                                className={`w-1 rounded-full transition-all duration-300 ${bar.isActive ? 'bg-ani-primary shadow-[0_0_8px_rgba(255,107,155,0.5)]' : 'bg-white/10'}`}
                                style={{ height: `${bar.height}%` }}
                            />
                        ))}
                    </div>
                    <div className="flex justify-between text-[10px] font-mono text-white/30 tracking-tighter uppercase">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                    </div>
                </div>

                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => handleSeek('back')}
                            className="p-3 text-white/40 hover:text-white hover:bg-white/5 rounded-full transition-all"
                        >
                            <ChevronLeft size={24} />
                        </button>

                        <button
                            onClick={handlePlayPause}
                            disabled={!videoUrl}
                            className="w-14 h-14 rounded-full bg-white flex items-center justify-center text-black hover:scale-105 active:scale-95 transition-all disabled:opacity-50 shadow-xl"
                        >
                            {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} className="ml-1" fill="currentColor" />}
                        </button>

                        <button
                            onClick={() => handleSeek('forward')}
                            className="p-3 text-white/40 hover:text-white hover:bg-white/5 rounded-full transition-all"
                        >
                            <ChevronRight size={24} />
                        </button>
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={!videoBlob}
                        className="flex-1 max-w-[200px] h-14 rounded-2xl bg-ani-primary text-white font-bold text-sm tracking-widest uppercase shadow-lg shadow-ani-primary/20 hover:brightness-110 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
                    >
                        Save Clip
                    </button>
                </div>
            </div>
        </div>
    );
}
