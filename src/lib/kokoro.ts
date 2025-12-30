import { KokoroTTS } from 'kokoro-js';

// Define the Kokoro voices we want to expose
export const KOKORO_VOICES = [
    { id: 'af_heart', name: 'Kokoro - Heart (US Female)', lang: 'en-US' },
    { id: 'af_bella', name: 'Kokoro - Bella (US Female)', lang: 'en-US' },
    { id: 'af_sarah', name: 'Kokoro - Sarah (US Female)', lang: 'en-US' },
    { id: 'af_sky', name: 'Kokoro - Sky (US Female)', lang: 'en-US' },
    { id: 'af_nicole', name: 'Kokoro - Nicole (US Female)', lang: 'en-US' },
    { id: 'af_aoede', name: 'Kokoro - Aoede (US Female)', lang: 'en-US' },
    { id: 'af_kore', name: 'Kokoro - Kore (US Female)', lang: 'en-US' },
    { id: 'am_adam', name: 'Kokoro - Adam (US Male)', lang: 'en-US' },
    { id: 'am_michael', name: 'Kokoro - Michael (US Male)', lang: 'en-US' },
    { id: 'am_puck', name: 'Kokoro - Puck (US Male)', lang: 'en-US' },
    { id: 'am_fenrir', name: 'Kokoro - Fenrir (US Male)', lang: 'en-US' },
    { id: 'bf_emma', name: 'Kokoro - Emma (UK Female)', lang: 'en-GB' },
    { id: 'bf_isabella', name: 'Kokoro - Isabella (UK Female)', lang: 'en-GB' },
    { id: 'bm_george', name: 'Kokoro - George (UK Male)', lang: 'en-GB' },
    { id: 'bm_lewis', name: 'Kokoro - Lewis (UK Male)', lang: 'en-GB' },
];

export interface KokoroVoice {
    id: string;
    name: string;
    lang: string;
}

class KokoroService {
    private tts: any = null;
    private isInitializing = false;
    private audioContext: AudioContext | null = null;
    private currentSource: AudioBufferSourceNode | null = null;
    private isPaused = false;
    private pauseResolve: (() => void) | null = null;
    private streamDestination: MediaStreamAudioDestinationNode | null = null;

    async initialize() {
        if (this.tts) return this.tts;
        if (this.isInitializing) {
            // Wait for initialization
            while (this.isInitializing) {
                await new Promise(r => setTimeout(r, 100));
            }
            return this.tts;
        }

        this.isInitializing = true;
        try {
            console.log('[Kokoro] Starting initialization...');

            // Detect WebGPU support
            let device: 'webgpu' | 'wasm' = 'wasm';
            if ('gpu' in navigator) {
                try {
                    console.log('[Kokoro] WebGPU API detected, requesting adapter...');
                    const adapter = await (navigator as any).gpu.requestAdapter();
                    if (adapter) {
                        device = 'webgpu';
                        console.log('[Kokoro] ✅ WebGPU adapter acquired! Using GPU acceleration');
                        try {
                            const adapterInfo = await (adapter as any).requestAdapterInfo();
                            console.log('[Kokoro] GPU Info:', {
                                vendor: adapterInfo?.vendor || 'unknown',
                                architecture: adapterInfo?.architecture || 'unknown'
                            });
                        } catch (infoError) {
                            console.log('[Kokoro] GPU info not available (older browser)');
                        }
                    } else {
                        console.warn('[Kokoro] WebGPU adapter not available, falling back to CPU');
                    }
                } catch (e) {
                    console.warn('[Kokoro] WebGPU detection failed, falling back to CPU:', e);
                }
            } else {
                console.log('[Kokoro] WebGPU not supported in this browser, using CPU (WASM)');
            }

            // Load the model
            console.log(`[Kokoro] Loading model with device: ${device}, dtype: ${device === 'webgpu' ? 'fp32' : 'q8'}`);
            this.tts = await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", {
                dtype: device === 'webgpu' ? "fp32" : "q8",
                device: device
            });
            console.log(`[Kokoro] ✅ Model loaded successfully (${device.toUpperCase()})`);

            // Initialize AudioContext on user interaction
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                this.streamDestination = this.audioContext.createMediaStreamDestination();

                // Add a silent oscillator to keep the stream "hot"
                // Some MediaRecorders ignore tracks that are silent for too long at the start
                const silentNode = this.audioContext.createConstantSource();
                silentNode.offset.value = 0;
                silentNode.connect(this.streamDestination);
                silentNode.start();
            }
        } catch (error) {
            console.error('[Kokoro] ❌ Initialization failed:', error);
            throw error;
        } finally {
            this.isInitializing = false;
        }
        return this.tts;
    }

    getAudioStream(): MediaStream | null {
        if (!this.streamDestination) {
            // Attempt to init context if missing (though likely needs user gesture first)
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            }
            this.streamDestination = this.audioContext.createMediaStreamDestination();

            // Add a silent oscillator to keep the stream "hot"
            const silentNode = this.audioContext.createConstantSource();
            silentNode.offset.value = 0;
            silentNode.connect(this.streamDestination);
            silentNode.start();
        }
        return this.streamDestination ? this.streamDestination.stream : null;
    }

    async speak(text: string, voiceId: string, speed: number = 1.0, onStart?: () => void, onEnd?: () => void) {
        try {
            const tts = await this.initialize();

            // Clean text of emotion tags, emojis, and kaomojis for TTS
            const cleanText = text
                .replace(/\[.*?\]/g, '')     // Remove emotion tags [happy]
                .replace(/(\(.*?\)|（.*?）)/g, '') // Remove thoughts/kaomojis in parentheses (e.g. (laughs))
                .replace(/[^\w\s.,!?'"-]/gi, '') // Remove everything else (emojis, special symbols)
                .replace(/\s+/g, ' ')        // Collapse whitespace
                .trim();

            if (!cleanText) {
                console.log('[Kokoro] Text was empty after cleaning (emojis only?), skipping.');
                if (onEnd) onEnd();
                return;
            }

            // Validate voice ID
            let targetVoice = voiceId;
            const validVoices = KOKORO_VOICES.map(v => v.id);
            if (!validVoices.includes(targetVoice)) {
                console.warn(`[Kokoro] Invalid voice ID "${voiceId}", falling back to "af_heart"`);
                targetVoice = 'af_heart';
            }

            console.log(`Generating audio for (streaming): "${cleanText}" with voice ${targetVoice}`);

            // Split into sentences for streaming playback
            const sentences = cleanText.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [cleanText];

            const audioQueue: { buffer: AudioBuffer }[] = [];
            let isPlaying = false;
            // Use a unique ID to track if we should stop
            const currentSequenceId = Date.now();
            (this as any)._currentSequenceId = currentSequenceId;

            const processQueue = async () => {
                if (isPlaying || audioQueue.length === 0) return;

                // Double check if we were stopped
                if ((this as any)._currentSequenceId !== currentSequenceId) return;

                isPlaying = true;
                const next = audioQueue.shift();
                if (next) {
                    await this.playAudioBuffer(next.buffer, () => {
                        isPlaying = false;
                        processQueue();
                    });
                } else {
                    isPlaying = false;
                }
            };

            // Generation Loop
            for (const sentence of sentences) {
                if ((this as any)._currentSequenceId !== currentSequenceId) break; // Stopped
                if (!sentence.trim()) continue;

                // Generate chunk
                const result = await tts.generate(sentence.trim(), {
                    voice: targetVoice,
                    speed: speed,
                });

                if ((this as any)._currentSequenceId !== currentSequenceId) break;

                // Create AudioBuffer
                if (!this.audioContext) {
                    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                    this.streamDestination = this.audioContext.createMediaStreamDestination();
                }
                const buffer = this.audioContext.createBuffer(1, result.audio.length, result.sampling_rate || 24000);
                buffer.getChannelData(0).set(result.audio as any);

                audioQueue.push({ buffer });

                if (audioQueue.length === 1 && !isPlaying) {
                    if (onStart) onStart();
                }

                processQueue(); // Ensure player is running
            }

            // Wait until queue is empty to call onEnd
            return new Promise<void>((resolve) => {
                const checkDone = setInterval(() => {
                    if ((this as any)._currentSequenceId !== currentSequenceId) {
                        clearInterval(checkDone);
                        resolve();
                        return;
                    }
                    if (!isPlaying && audioQueue.length === 0) {
                        clearInterval(checkDone);
                        if (onEnd) onEnd();
                        resolve();
                    }
                }, 100);
            });

        } catch (error) {
            console.error('Kokoro speak error:', error);
            if (onEnd) onEnd();
        }
    }

    private playAudioBuffer(buffer: AudioBuffer, onEnded: () => void) {
        return new Promise<void>((resolve) => {
            if (!this.audioContext) {
                onEnded();
                return resolve();
            }
            if (this.audioContext.state === 'suspended') this.audioContext.resume();

            // Ensure destination exists
            if (!this.streamDestination) {
                this.streamDestination = this.audioContext.createMediaStreamDestination();
            }

            const source = this.audioContext.createBufferSource();
            source.buffer = buffer;
            // Connect to speakers
            source.connect(this.audioContext.destination);
            // Connect to stream destination (for recording)
            source.connect(this.streamDestination);

            this.currentSource = source;

            source.onended = () => {
                onEnded();
                resolve();
            };

            source.start();
        });
    }

    /**
     * Speak multiple segments sequentially with different voices (for podcast feature)
     */
    async speakSegments(
        segments: Array<{ text: string; voiceId: string }>,
        onSegmentStart?: (index: number, text: string) => void,
        onEnd?: () => void
    ) {
        try {
            const tts = await this.initialize();

            const podcastId = Date.now();
            (this as any)._podcastSequenceId = podcastId;

            console.log('[Podcast] Starting playback with', segments.length, 'segments');

            for (let i = 0; i < segments.length; i++) {
                // Check if stopped
                if ((this as any)._podcastSequenceId !== podcastId) {
                    console.log('[Podcast] Stopped at segment', i);
                    return;
                }

                const segment = segments[i];
                if (!segment.text.trim()) continue;

                console.log(`[Podcast] Playing segment ${i + 1}/${segments.length}:`, segment.voiceId);

                // Notify segment start
                if (onSegmentStart) {
                    onSegmentStart(i, segment.text);
                }

                // Generate audio for this segment directly (don't use speak() to avoid sequence ID conflict)
                const result = await tts.generate(segment.text, { voice: segment.voiceId });

                // Check again if stopped during generation
                if ((this as any)._podcastSequenceId !== podcastId) {
                    console.log('[Podcast] Stopped during generation');
                    return;
                }

                // Get audio context
                if (!this.audioContext) {
                    this.audioContext = new AudioContext();
                    this.streamDestination = this.audioContext.createMediaStreamDestination();
                }

                // Create audio buffer
                const sampleRate = result.sampling_rate || 24000;
                const audioBuffer = this.audioContext.createBuffer(1, result.audio.length, sampleRate);
                audioBuffer.getChannelData(0).set(result.audio as any);

                // Play and wait for completion
                await new Promise<void>((resolve) => {
                    const source = this.audioContext!.createBufferSource();
                    source.buffer = audioBuffer;

                    // Connect to speakers
                    source.connect(this.audioContext!.destination);
                    // Connect to stream
                    if (this.streamDestination) {
                        source.connect(this.streamDestination);
                    }

                    this.currentSource = source;

                    source.onended = () => {
                        this.currentSource = null;
                        resolve();
                    };

                    source.start();
                });

                // Small pause between speakers
                if (i < segments.length - 1) {
                    await new Promise(r => setTimeout(r, 400));
                }
            }

            console.log('[Podcast] Playback complete');
            if (onEnd && (this as any)._podcastSequenceId === podcastId) {
                onEnd();
            }
        } catch (error) {
            console.error('[Podcast] Playback error:', error);
            if (onEnd) onEnd();
        }
    }

    stop() {
        // Invalidate sequences to stop both regular speech and podcasts
        (this as any)._currentSequenceId = 0;
        (this as any)._podcastSequenceId = 0;

        if (this.currentSource) {
            try {
                this.currentSource.stop();
            } catch (e) {
                // Ignore
            }
            this.currentSource = null;
        }

        // Also unpause if stopped
        this.isPaused = false;
        if (this.pauseResolve) {
            this.pauseResolve();
            this.pauseResolve = null;
        }
    }

    pause() {
        if (!this.isPaused && this.audioContext) {
            this.isPaused = true;
            this.audioContext.suspend();
            console.log('[Kokoro] Paused');
        }
    }

    resume() {
        if (this.isPaused && this.audioContext) {
            this.isPaused = false;
            this.audioContext.resume();
            console.log('[Kokoro] Resumed');
        }
    }

    getIsPaused() {
        return this.isPaused;
    }

    isBusy() {
        return (this as any)._currentSequenceId !== 0 || (this as any)._podcastSequenceId !== 0;
    }
}

export const kokoroService = new KokoroService();
