import React from 'react';
import { X, Flame, Gift, Heart } from 'lucide-react';

interface StreaksPanelProps {
    isOpen: boolean;
    onClose: () => void;
    userName?: string;
    companionName: string;
    friendshipDays: number;
    currentStreak: number;
    weeklyProgress: boolean[]; // Array of 7 booleans for M-S
    connectionLevel: number;
    connectionMax: number;
}

export default function StreaksPanel({
    isOpen,
    onClose,
    userName = 'You',
    companionName,
    friendshipDays,
    currentStreak,
    weeklyProgress,
    connectionLevel,
    connectionMax,
}: StreaksPanelProps) {
    if (!isOpen) return null;

    const weekDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    const connectionProgress = Math.min((connectionLevel / connectionMax) * 100, 100);

    return (
        <div className="fullscreen-overlay animate-fade-in" onClick={onClose}>
            <div
                className="flex-1 flex flex-col p-6 max-w-md mx-auto w-full"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="self-end p-2 text-white/60 hover:text-white transition-colors"
                >
                    <X size={24} />
                </button>

                {/* Header */}
                <div className="mt-4">
                    <h1 className="text-2xl font-bold text-white">
                        {userName} and {companionName}
                    </h1>
                    <p className="text-white/60 flex items-center gap-2 mt-1">
                        <Heart size={14} className="text-ani-primary" />
                        {friendshipDays} friendship days
                    </p>
                </div>

                {/* Streak Flame */}
                <div className="flex flex-col items-center mt-12">
                    <div className="streak-flame glow-orange">
                        <span className="text-3xl font-bold text-white">{currentStreak}</span>
                    </div>
                    <h2 className="text-xl font-semibold text-white mt-4">day streak</h2>
                    <p className="text-white/50 text-sm text-center mt-2">
                        Speak every day to make your connection<br />better and earn special rewards
                    </p>
                </div>

                {/* Weekly Progress */}
                <div className="flex justify-center gap-3 mt-8">
                    {weekDays.map((day, index) => (
                        <div
                            key={index}
                            className={`streak-day ${weeklyProgress[index] ? 'streak-day-active' : ''}`}
                        >
                            {weeklyProgress[index] ? '✓' : day}
                        </div>
                    ))}
                </div>

                {/* Next Milestone */}
                <div className="glass-card p-4 mt-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-white font-medium">Next milestone</h3>
                            <p className="text-white/50 text-sm mt-1">
                                Hit a 7-day streak to unlock a<br />new outfit
                            </p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                            <Gift size={24} className="text-white/60" />
                        </div>
                    </div>

                    {/* Milestone progress */}
                    <div className="mt-4">
                        <div className="progress-bar">
                            <div
                                className="progress-fill progress-fill-orange"
                                style={{ width: `${(currentStreak / 7) * 100}%` }}
                            />
                        </div>
                        <div className="flex justify-between mt-2 text-xs text-white/40">
                            <span>Day 1</span>
                            <span>Day 7</span>
                        </div>
                    </div>
                </div>

                {/* Connection Level */}
                <div className="mt-6">
                    <h3 className="text-white font-medium">Your connection</h3>
                    <p className="text-white/50 text-sm">Chat to improve your connection</p>

                    <div className="mt-3 relative">
                        <div className="progress-bar h-3">
                            <div
                                className="progress-fill progress-fill-pink"
                                style={{ width: `${(connectionLevel % 100)}%` }}
                            />
                        </div>
                        {/* Heart icon on progress */}
                        <div
                            className="absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-ani-primary flex items-center justify-center"
                            style={{ left: `calc(${(connectionLevel % 100)}% - 12px)` }}
                        >
                            <Heart size={12} className="text-white fill-white" />
                        </div>
                    </div>
                    <div className="flex justify-between mt-2 text-xs text-white/40">
                        <span>Level {Math.floor(connectionLevel / 100)}</span>
                        <span>Level {Math.floor(connectionLevel / 100) + 1}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
