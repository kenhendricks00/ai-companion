import { useState, useCallback, useRef, useEffect } from 'react';
import { kokoroService, KOKORO_VOICES } from '../lib/kokoro';
import { LipSyncController } from '../lib/lipsync';
import { Viseme } from '../types';

export function useTTS(
    onVisemeChange?: (viseme: Viseme, weights: Record<string, number>) => void
) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const [currentVoice, setCurrentVoice] = useState('af_heart');
    const [isInitializing, setIsInitializing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const lipSyncRef = useRef<LipSyncController | null>(null);

    // Initialize Kokoro TTS
    const initialize = useCallback(async () => {
        if (isInitialized || isInitializing) return true;

        setIsInitializing(true);
        setError(null);

        try {
            await kokoroService.initialize();
            setIsInitialized(true);

            if (!lipSyncRef.current) {
                lipSyncRef.current = new LipSyncController(onVisemeChange);
            }

            return true;
        } catch (e) {
            setError(String(e));
            return false;
        } finally {
            setIsInitializing(false);
        }
    }, [isInitialized, isInitializing, onVisemeChange]);

    // Speak text
    const speak = useCallback(async (text: string) => {
        // Stop any current lipsync
        lipSyncRef.current?.stop();

        try {
            setIsPlaying(true);

            await kokoroService.speak(
                text,
                currentVoice,
                1.2, // speed
                () => {
                    // On start - begin lip sync
                    // Note: duration is estimated for the whole text
                    const estimatedDuration = (text.split(/\s+/).length / 150) * 60 * 1000;
                    lipSyncRef.current?.start(text, estimatedDuration);
                },
                () => {
                    // On end
                    setIsPlaying(false);
                    lipSyncRef.current?.stop();
                }
            );
        } catch (e) {
            setError(String(e));
            setIsPlaying(false);
            lipSyncRef.current?.stop();
        }
    }, [currentVoice]);

    // Stop playback
    const stop = useCallback(() => {
        kokoroService.stop();
        lipSyncRef.current?.stop();
        setIsPlaying(false);
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            lipSyncRef.current?.destroy();
        };
    }, []);

    return {
        isPlaying,
        isInitialized,
        isInitializing,
        currentVoice,
        setCurrentVoice,
        error,
        voices: KOKORO_VOICES,
        initialize,
        speak,
        stop,
    };
}
