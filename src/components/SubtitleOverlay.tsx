import React from 'react';
import { cleanEmotionTags } from '../lib/emotions';

interface SubtitleOverlayProps {
    text: string;
    isVisible: boolean;
}

export default function SubtitleOverlay({ text, isVisible }: SubtitleOverlayProps) {
    if (!isVisible || !text) return null;

    const cleanText = cleanEmotionTags(text);

    return (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-30 max-w-[70%] pointer-events-none">
            <div className="glass-card px-6 py-3 bg-black/70">
                <p className="text-white text-center text-base font-medium subtitle-overlay leading-relaxed">
                    {cleanText}
                </p>
            </div>
        </div>
    );
}
