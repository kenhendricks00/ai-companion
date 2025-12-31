import React from 'react';
import { Flame, Camera, Shirt, Trash2, Volume2, VolumeX, Settings, ChevronUp, ChevronDown } from 'lucide-react';

interface FloatingMenuProps {
    streakCount: number;
    isVoiceEnabled: boolean;
    isExpanded: boolean;
    onStreaksClick: () => void;
    onCaptureClick: () => void;
    onOutfitClick: () => void;
    onEraseClick: () => void;
    onSpeakerClick: () => void;
    onSettingsClick: () => void;
    onToggleExpand: () => void;
}

const FloatingMenu = React.memo(({
    streakCount,
    isVoiceEnabled,
    isExpanded,
    onStreaksClick,
    onCaptureClick,
    onOutfitClick,
    onEraseClick,
    onSpeakerClick,
    onSettingsClick,
    onToggleExpand,
}: FloatingMenuProps) => {
    // Icon-only button for collapsed state
    const IconButton = ({ onClick, children, className = '' }: { onClick: () => void; children: React.ReactNode; className?: string }) => (
        <button
            onClick={onClick}
            className={`w-10 h-10 rounded-full backdrop-blur-md bg-black/40 border border-white/10 flex items-center justify-center text-white/70 hover:bg-white/10 hover:text-white transition-all ${className}`}
        >
            {children}
        </button>
    );

    // Full button with label for expanded state
    const FullButton = ({ onClick, label, children }: { onClick: () => void; label: string; children: React.ReactNode }) => (
        <button
            onClick={onClick}
            className="floating-menu-button"
        >
            <span>{label}</span>
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                {children}
            </div>
        </button>
    );

    if (!isExpanded) {
        // Collapsed: Icon-only buttons
        return (
            <div className="fixed right-4 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-2">
                {/* Streak badge */}
                <button
                    onClick={onStreaksClick}
                    className="w-10 h-10 rounded-full bg-gradient-to-b from-orange-400 to-orange-600 flex items-center justify-center text-white text-sm font-bold shadow-lg hover:scale-105 transition-transform"
                >
                    {streakCount}
                </button>

                <IconButton onClick={onCaptureClick}>
                    <Camera size={18} />
                </IconButton>

                <IconButton onClick={onOutfitClick}>
                    <Shirt size={18} />
                </IconButton>

                <IconButton onClick={onEraseClick}>
                    <Trash2 size={18} />
                </IconButton>

                <IconButton onClick={onSpeakerClick}>
                    {isVoiceEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                </IconButton>

                {/* Expand button */}
                <IconButton onClick={onToggleExpand}>
                    <ChevronDown size={18} />
                </IconButton>
            </div>
        );
    }

    // Expanded: Full buttons with labels
    return (
        <div className="fixed right-4 top-1/2 -translate-y-1/2 z-30 flex flex-col items-end gap-2">
            {/* Streaks */}
            <button
                onClick={onStreaksClick}
                className="floating-menu-button"
            >
                <span>Streaks</span>
                <div className="w-8 h-8 rounded-full bg-gradient-to-b from-orange-400 to-orange-600 flex items-center justify-center text-white text-xs font-bold shadow-lg">
                    {streakCount}
                </div>
            </button>

            <FullButton onClick={onCaptureClick} label="Capture">
                <Camera size={16} />
            </FullButton>

            <FullButton onClick={onOutfitClick} label="Outfit">
                <Shirt size={16} />
            </FullButton>

            <FullButton onClick={onEraseClick} label="Erase">
                <Trash2 size={16} />
            </FullButton>

            <FullButton onClick={onSpeakerClick} label="Speaker">
                {isVoiceEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </FullButton>

            <FullButton onClick={onSettingsClick} label="Settings">
                <Settings size={16} />
            </FullButton>

            {/* Collapse button */}
            <button
                onClick={onToggleExpand}
                className="floating-menu-button"
            >
                <span>Close</span>
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                    <ChevronUp size={16} />
                </div>
            </button>
        </div>
    );
});

export default FloatingMenu;
