import React from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { KOKORO_VOICES } from '../lib/kokoro';

interface VoiceControlsProps {
    enabled: boolean;
    currentVoice: string;
    isPlaying: boolean;
    isInitializing: boolean;
    onToggle: () => void;
    onVoiceChange: (voiceId: string) => void;
    onStop: () => void;
}

export default function VoiceControls({
    enabled,
    currentVoice,
    isPlaying,
    isInitializing,
    onToggle,
    onVoiceChange,
    onStop,
}: VoiceControlsProps) {
    return (
        <div className="glass-card p-3">
            <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-white/80">Voice</span>
                <button
                    onClick={enabled && isPlaying ? onStop : onToggle}
                    className={`p-2 rounded-lg transition-all ${enabled
                        ? 'bg-ani-primary/20 text-ani-primary hover:bg-ani-primary/30'
                        : 'bg-white/5 text-white/40 hover:bg-white/10'
                        }`}
                    disabled={isInitializing}
                >
                    {isInitializing ? (
                        <div className="w-5 h-5 border-2 border-ani-primary border-t-transparent rounded-full animate-spin" />
                    ) : enabled ? (
                        <Volume2 size={20} />
                    ) : (
                        <VolumeX size={20} />
                    )}
                </button>
            </div>

            {enabled && (
                <select
                    value={currentVoice}
                    onChange={(e) => onVoiceChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white/80 text-sm focus:outline-none focus:border-ani-primary/50"
                >
                    {KOKORO_VOICES.map((voice) => (
                        <option key={voice.id} value={voice.id} className="bg-gothic-charcoal">
                            {voice.name}
                        </option>
                    ))}
                </select>
            )}

            {isPlaying && (
                <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-ani-primary animate-pulse" />
                    </div>
                    <span className="text-xs text-white/50">Speaking...</span>
                </div>
            )}
        </div>
    );
}
