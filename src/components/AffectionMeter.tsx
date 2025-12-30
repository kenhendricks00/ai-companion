import React from 'react';
import { Heart } from 'lucide-react';
import { AFFECTION_LEVELS, getAffectionLevelKey, calculateLevel, AFFECTION_CONFIG } from '../types';

interface AffectionMeterProps {
    points: number; // raw points from backend
    totalMessages: number;
    onClick?: () => void;
}

export default function AffectionMeter({
    points,
    totalMessages,
    onClick,
}: AffectionMeterProps) {
    const level = calculateLevel(points);
    const levelKey = getAffectionLevelKey(points);
    const levelInfo = AFFECTION_LEVELS[levelKey];

    // Progress towards next level (0-100%)
    const progress = points % AFFECTION_CONFIG.POINTS_PER_LEVEL;
    const isMax = level >= AFFECTION_CONFIG.MAX_LEVEL;

    // Color gradients based on level range
    const getGradient = () => {
        if (level <= 2) return 'from-gray-400 to-gray-500';
        if (level <= 4) return 'from-pink-400 to-pink-500';
        if (level <= 8) return 'from-rose-400 to-rose-500';
        return 'from-red-400 via-pink-500 to-purple-500';
    };

    return (
        <button
            onClick={onClick}
            className="glass-card p-3 flex items-center gap-3 hover:bg-white/10 transition-all cursor-pointer group"
        >
            <div className="relative">
                <Heart
                    size={28}
                    className={`text-ani-primary ${level >= 5 ? 'animate-heart-beat' : ''}`}
                    fill={level >= 3 ? 'currentColor' : 'none'}
                />
                {level >= 15 && (
                    <span className="absolute -top-1 -right-1 text-xs">✨</span>
                )}
            </div>

            <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-white/80">
                        {levelInfo.name} <span className="text-white/40 ml-1">Lv. {level}</span>
                    </span>
                    <span className="text-[10px] text-white/50">{isMax ? 'MAX' : `${progress}%`}</span>
                </div>

                <div className="affection-bar">
                    <div
                        className={`affection-fill bg-gradient-to-r ${getGradient()}`}
                        style={{ width: `${isMax ? 100 : progress}%` }}
                    />
                </div>

                <p className="text-[10px] text-white/40 mt-1 truncate">
                    {levelInfo.description} • {totalMessages} messages
                </p>
            </div>
        </button>
    );
}
