import { useState, useCallback, useRef, useEffect } from 'react';
import { pipeline } from '@xenova/transformers';

interface WhisperHook {
    isListening: boolean;
    isSupported: boolean;
    transcript: string; // Accumulated transcript
    interimTranscript: string; // Not typically available in local Whisper without streaming, but keeping interface
    isLoadingModel: boolean;
    isProcessing: boolean; // True when transcribing
    isUserSpeaking: boolean; // VAD state
    startListening: () => void;
    stopListening: () => void;
    resetTranscript: () => void;
    setDeviceId: (deviceId: string) => void;
}

// VAD Constants
const VAD_THRESHOLD = 0.02; // RMS threshold
const SILENCE_DURATION_MS = 1000; // Stop recording after this much silence
const MIN_SPEECH_DURATION_MS = 300; // Ignore short noises

export function useWhisper(initialDeviceId?: string): WhisperHook {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [isLoadingModel, setIsLoadingModel] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isUserSpeaking, setIsUserSpeaking] = useState(false);
    const [deviceId, setDeviceIdState] = useState<string | undefined>(initialDeviceId);

    const transcriberRef = useRef<any>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null); // Using ScriptProcessor for simplicity (AudioWorklet is better but harder to setup in one file)

    // Audio buffers
    const audioChunksRef = useRef<Float32Array[]>([]);
    const recordingStartTimeRef = useRef<number>(0);
    const silenceStartRef = useRef<number>(0);
    const isRecordingRef = useRef(false);

    // Initialize model
    useEffect(() => {
        const loadModel = async () => {
            if (transcriberRef.current) return;

            try {
                setIsLoadingModel(true);
                // Use quantized version for browser performance/size
                transcriberRef.current = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en', {
                    quantized: true,
                });
                console.log('[Whisper] Model loaded');
            } catch (e) {
                console.error('[Whisper] Failed to load model:', e);
            } finally {
                setIsLoadingModel(false);
            }
        };

        loadModel();
    }, []);

    const setDeviceId = useCallback((id: string) => {
        setDeviceIdState(id);
        if (isListening) {
            // Restart to apply new device
            stopListening();
            setTimeout(() => startListening(), 100);
        }
    }, [isListening]);

    const processAudio = async (audioData: Float32Array) => {
        if (!transcriberRef.current || audioData.length === 0) return;

        try {
            setIsProcessing(true);
            const result = await transcriberRef.current(audioData, {
                language: 'english',
                task: 'transcribe',
            });

            const text = result.text.trim();
            if (text) {
                console.log('[Whisper] Transcribed:', text);
                setTranscript(prev => prev + ' ' + text);
            }
        } catch (e) {
            console.error('[Whisper] Transcription failed:', e);
        } finally {
            setIsProcessing(false);
        }
    };

    const stopListening = useCallback(() => {
        setIsListening(false);
        setIsUserSpeaking(false);
        isRecordingRef.current = false;

        if (processorRef.current) {
            processorRef.current.disconnect();
            sourceRef.current?.disconnect();
            // Don't close AudioContext to reuse it, or do close? Typically keep it.
        }

        mediaStreamRef.current?.getTracks().forEach(t => t.stop());
        mediaStreamRef.current = null;
    }, []);

    const startListening = useCallback(async () => {
        if (!transcriberRef.current) {
            console.warn('[Whisper] Model not loaded yet');
            return;
        }
        if (isListening) return;

        try {
            let stream;
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        deviceId: deviceId ? { exact: deviceId } : undefined,
                        channelCount: 1,
                        sampleRate: 16000,
                        echoCancellation: true,
                        noiseSuppression: true,
                    }
                });
            } catch (err) {
                if (deviceId) {
                    console.warn('[Whisper] Failed to get specific device, trying default:', err);
                    stream = await navigator.mediaDevices.getUserMedia({
                        audio: {
                            channelCount: 1,
                            sampleRate: 16000,
                            echoCancellation: true,
                            noiseSuppression: true,
                        }
                    });
                } else {
                    throw err;
                }
            }

            mediaStreamRef.current = stream;

            if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            }
            if (audioContextRef.current.state === 'suspended') {
                await audioContextRef.current.resume();
            }

            const ctx = audioContextRef.current;
            const source = ctx.createMediaStreamSource(stream);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 512;
            const bufferLength = analyser.frequencyBinCount;
            // const dataArray = new Uint8Array(bufferLength);

            const processor = ctx.createScriptProcessor(4096, 1, 1);

            source.connect(analyser);
            analyser.connect(processor);
            processor.connect(ctx.destination);

            sourceRef.current = source;
            analyserRef.current = analyser;
            processorRef.current = processor;

            audioChunksRef.current = [];
            isRecordingRef.current = false;

            processor.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);

                // VAD Logic (RMS)
                let sum = 0;
                for (let i = 0; i < inputData.length; i++) {
                    sum += inputData[i] * inputData[i];
                }
                const rms = Math.sqrt(sum / inputData.length);

                if (rms > VAD_THRESHOLD) {
                    // Speech detected
                    if (!isRecordingRef.current) {
                        isRecordingRef.current = true;
                        recordingStartTimeRef.current = Date.now();
                        setIsUserSpeaking(true);
                        console.log('[Whisper] Speech started');
                    }
                    silenceStartRef.current = 0; // Reset silence timer
                } else {
                    // Silence
                    if (isRecordingRef.current) {
                        if (silenceStartRef.current === 0) {
                            silenceStartRef.current = Date.now();
                        } else if (Date.now() - silenceStartRef.current > SILENCE_DURATION_MS) {
                            // Silence timeout reached - stop chunk and transcribe
                            if (Date.now() - recordingStartTimeRef.current > MIN_SPEECH_DURATION_MS) {
                                console.log('[Whisper] Speech ended, processing...');
                                const fullBuffer = mergeBuffers(audioChunksRef.current);
                                processAudio(fullBuffer);
                            }

                            isRecordingRef.current = false;
                            setIsUserSpeaking(false);
                            audioChunksRef.current = []; // Clear buffer
                        }
                    }
                }

                if (isRecordingRef.current) {
                    audioChunksRef.current.push(new Float32Array(inputData));
                }
            };

            setIsListening(true);
            console.log('[Whisper] Started listening on device:', deviceId || 'default');

        } catch (e) {
            console.error('[Whisper] Failed to start listening:', e);
            stopListening();
        }
    }, [deviceId, isListening, stopListening]);

    const resetTranscript = useCallback(() => {
        setTranscript('');
    }, []);

    // Merge Float32Array chunks function
    const mergeBuffers = (chunks: Float32Array[]) => {
        const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
        const result = new Float32Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
            result.set(chunk, offset);
            offset += chunk.length;
        }
        return result;
    };

    return {
        isListening,
        isSupported: true, // Whisper is supported via WebAssembly
        transcript,
        interimTranscript: '', // No interim for now
        isLoadingModel,
        isProcessing,
        isUserSpeaking,
        startListening,
        stopListening,
        resetTranscript,
        setDeviceId
    };
}
