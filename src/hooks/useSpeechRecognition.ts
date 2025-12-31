import { useState, useCallback, useRef, useEffect } from 'react';

interface SpeechRecognitionHook {
    isListening: boolean;
    isSupported: boolean;
    transcript: string;
    interimTranscript: string;
    startListening: () => void;
    stopListening: () => void;
    resetTranscript: () => void;
}

// Type definitions for Web Speech API
interface SpeechRecognitionResult {
    transcript: string;
    confidence: number;
}

interface SpeechRecognitionResultList {
    length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: {
        isFinal: boolean;
        [index: number]: SpeechRecognitionResult;
    };
}

interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
    resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
    error: string;
    message: string;
}

// Browser speech recognition
declare global {
    interface Window {
        SpeechRecognition: new () => SpeechRecognition;
        webkitSpeechRecognition: new () => SpeechRecognition;
    }
}

interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
    onend: (() => void) | null;
    onstart: (() => void) | null;
    onspeechend: (() => void) | null;
    start: () => void;
    stop: () => void;
    abort: () => void;
}

// Silence timeout in milliseconds - auto-stop after this much silence
const SILENCE_TIMEOUT_MS = 1500;

export function useSpeechRecognition(): SpeechRecognitionHook {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');

    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const hasSpokenRef = useRef(false);

    // Check for browser support
    const isSupported = typeof window !== 'undefined' &&
        ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

    // Clear silence timeout
    const clearSilenceTimeout = useCallback(() => {
        if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current);
            silenceTimeoutRef.current = null;
        }
    }, []);

    // Start silence timeout - will auto-stop if no speech detected
    const startSilenceTimeout = useCallback(() => {
        clearSilenceTimeout();
        silenceTimeoutRef.current = setTimeout(() => {
            // Only auto-stop if user has spoken something
            if (hasSpokenRef.current && recognitionRef.current) {
                console.log('[Speech] Silence detected, auto-stopping...');
                recognitionRef.current.stop();
            }
        }, SILENCE_TIMEOUT_MS);
    }, [clearSilenceTimeout]);

    // Initialize recognition
    useEffect(() => {
        if (!isSupported) return;

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();

        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            setIsListening(true);
            hasSpokenRef.current = false;
            // Start initial silence timeout (in case user doesn't speak at all)
            startSilenceTimeout();
        };

        recognition.onend = () => {
            setIsListening(false);
            clearSilenceTimeout();
        };

        recognition.onspeechend = () => {
            // Browser detected end of speech, start silence timeout
            console.log('[Speech] Speech ended, starting silence timeout...');
            startSilenceTimeout();
        };

        recognition.onresult = (event: SpeechRecognitionEvent) => {
            let finalTranscript = '';
            let interimText = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                if (result.isFinal) {
                    finalTranscript += result[0].transcript;
                    hasSpokenRef.current = true;
                    // Reset silence timeout on final result
                    startSilenceTimeout();
                } else {
                    interimText += result[0].transcript;
                    // Reset silence timeout on interim result too
                    startSilenceTimeout();
                }
            }

            if (finalTranscript) {
                setTranscript(prev => prev + finalTranscript);
            }
            setInterimTranscript(interimText);
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            console.error('Speech recognition error:', event.error);
            setIsListening(false);
            clearSilenceTimeout();
        };

        recognitionRef.current = recognition;

        return () => {
            recognition.abort();
            clearSilenceTimeout();
        };
    }, [isSupported, startSilenceTimeout, clearSilenceTimeout]);

    const startListening = useCallback(() => {
        if (recognitionRef.current && !isListening) {
            setTranscript('');
            setInterimTranscript('');
            hasSpokenRef.current = false;
            try {
                recognitionRef.current.start();
            } catch (e) {
                console.error('Failed to start recognition:', e);
            }
        }
    }, [isListening]);

    const stopListening = useCallback(() => {
        if (recognitionRef.current && isListening) {
            recognitionRef.current.stop();
            clearSilenceTimeout();
        }
    }, [isListening, clearSilenceTimeout]);

    const resetTranscript = useCallback(() => {
        setTranscript('');
        setInterimTranscript('');
    }, []);

    return {
        isListening,
        isSupported,
        transcript,
        interimTranscript,
        startListening,
        stopListening,
        resetTranscript,
    };
}

