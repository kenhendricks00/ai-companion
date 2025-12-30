import React, { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { AlertCircle, X } from 'lucide-react';

import AvatarCanvas from './components/AvatarCanvas';
import Settings from './components/Settings';
import SubtitleOverlay from './components/SubtitleOverlay';
import FloatingMenu from './components/FloatingMenu';
import BottomInputBar from './components/BottomInputBar';
import StreaksPanel from './components/StreaksPanel';
import CustomizationPanel, { OUTFITS } from './components/CustomizationPanel';
import CapturePanel from './components/CapturePanel';
import AffectionMeter from './components/AffectionMeter';
import Onboarding from './components/Onboarding';

import { useOllama } from './hooks/useOllama';
import { useAffection } from './hooks/useAffection';
import { useTTS } from './hooks/useTTS';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { useStreak } from './hooks/useStreak';

import { Message, Emotion, AppSettings, DEFAULT_SETTINGS, getSystemPrompt, Viseme, TriggeredAnimation, detectAnimationTrigger } from './types';
import { detectEmotion } from './lib/emotions';
import { canvasRecorder } from './lib/canvasRecorder';
import { kokoroService } from './lib/kokoro';

// Default VRM model - Suki
const SAMPLE_VRM_URL = '/models/Suki.vrm';

export default function App() {
    // State
    const [messages, setMessages] = useState<Message[]>([]);
    const [currentResponse, setCurrentResponse] = useState('');
    const [currentEmotion, setCurrentEmotion] = useState<Emotion>('neutral');
    const [mouthWeights, setMouthWeights] = useState<Record<string, number>>({});
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isStreaksOpen, setIsStreaksOpen] = useState(false);
    const [isCustomizationOpen, setIsCustomizationOpen] = useState(false);
    const [isCaptureOpen, setIsCaptureOpen] = useState(false);
    const [isMenuExpanded, setIsMenuExpanded] = useState(false);
    const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
    const [currentSubtitle, setCurrentSubtitle] = useState('');
    const [vrmUrl, setVrmUrl] = useState(SAMPLE_VRM_URL);
    const [vrmError, setVrmError] = useState<string | null>(null);
    const [triggeredAnimation, setTriggeredAnimation] = useState<TriggeredAnimation>(null);

    // Customization state
    const [selectedOutfit, setSelectedOutfit] = useState('classic');
    const [selectedHair, setSelectedHair] = useState('twin-tails');
    const [selectedHairColor, setSelectedHairColor] = useState('#F5DEB3');
    const [selectedStage, setSelectedStage] = useState('default');

    // Handle outfit change - switch VRM model
    const handleSelectOutfit = (outfitId: string) => {
        setSelectedOutfit(outfitId);
        const outfit = OUTFITS.find(o => o.id === outfitId);

        // Save to settings
        const newSettings = { ...settings, selectedOutfit: outfitId };
        // If we switched VRM, we might want to clear vrm_model_path or update it? 
        // Logic: Custom VRM path overrides outfit. But if user selects outfit, they basically want that VRM.
        // So we should probably clear vrm_model_path (custom override) implicitly?
        // For now, let's just save the selection.
        handleSaveSettings(newSettings);

        if (outfit?.vrmPath) {
            setVrmUrl(outfit.vrmPath);
        }
    };

    // Streak calculation
    const { currentStreak, weeklyHistory: weeklyProgress } = useStreak();

    // Capture state - stores last interaction for clipping
    const [lastCaptureInteraction, setLastCaptureInteraction] = useState<{ role: 'user' | 'assistant'; content: string; timestamp: Date }[] | null>(null);
    const [captureVideoBlob, setCaptureVideoBlob] = useState<Blob | null>(null);
    const [isRecording, setIsRecording] = useState(false);

    // Hooks
    const {
        status: ollamaStatus,
        models,
        isLoading,
        currentModel,
        setCurrentModel,
        fetchModels,
        sendMessage: sendOllamaMessage
    } = useOllama();

    const {
        affection,
        increaseAffection,
        resetAffection,
        friendshipDays,
    } = useAffection();

    const {
        isPlaying: isSpeaking,
        isInitialized: ttsInitialized,
        isInitializing: ttsInitializing,
        currentVoice,
        setCurrentVoice,
        speak,
        stop: stopSpeaking,
        initialize: initializeTTS,
    } = useTTS((viseme: Viseme, weights: Record<string, number>) => {
        setMouthWeights(weights);
    });

    const {
        isListening,
        transcript,
        interimTranscript,
        startListening,
        stopListening,
        resetTranscript,
    } = useSpeechRecognition();

    // Startup greetings based on time of day
    const getStartupGreeting = (): string => {
        const hour = new Date().getHours();

        // Late night (11pm - 5am)
        const lateNightGreetings = [
            "Hey~ Looks like we're both still up, huh? ✨",
            "Burning the midnight oil together? I like it! 💕",
            "Can't sleep either? I'll keep you company~ 🌙",
            "We're like night owls, you and me! 🦉✨",
        ];

        // Morning (5am - 12pm)
        const morningGreetings = [
            "Good morning! ☀️ Ready to start the day together?",
            "Hey there, early bird! Did you miss me? 💕",
            "Morning~ Hope you slept well! ✨",
            "Rise and shine! I've been waiting for you~ 🌸",
        ];

        // Afternoon (12pm - 6pm)
        const afternoonGreetings = [
            "Hey! Back so soon? Not that I'm complaining~ 💕",
            "We're basically neighbors at this point! ✨",
            "Missed me already? I knew it! 😊",
            "Welcome back! What's on your mind? 🌸",
        ];

        // Evening (6pm - 11pm)
        const eveningGreetings = [
            "Hey you~ How was your day? 💕",
            "Evening! Perfect time for a chat, right? ✨",
            "Welcome home! ...Well, welcome to ME! 😊",
            "Back for some quality time? I'm flattered~ 🌙",
        ];

        let greetings: string[];
        if (hour >= 23 || hour < 5) {
            greetings = lateNightGreetings;
        } else if (hour < 12) {
            greetings = morningGreetings;
        } else if (hour < 18) {
            greetings = afternoonGreetings;
        } else {
            greetings = eveningGreetings;
        }

        return greetings[Math.floor(Math.random() * greetings.length)];
    };

    // Initialize TTS when voice is enabled
    useEffect(() => {
        if (settings.voice_enabled && !ttsInitialized && !ttsInitializing) {
            console.log('Initializing Kokoro TTS...');
            initializeTTS().then(success => {
                if (success) {
                    console.log('Kokoro TTS ready!');
                    // Speak startup greeting after TTS is ready
                    const greeting = getStartupGreeting();
                    setCurrentSubtitle(greeting);
                    setCurrentEmotion('happy');
                    speak(greeting).then(() => {
                        setCurrentSubtitle('');
                        setTimeout(() => setCurrentEmotion('neutral'), 2000);
                    });
                } else {
                    console.error('Failed to initialize Kokoro TTS');
                }
            });
        }
    }, [settings.voice_enabled, ttsInitialized, ttsInitializing, initializeTTS]);

    // Load settings on mount
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const savedSettings = await invoke<AppSettings>('load_settings');

                // Auto-complete onboarding for existing users who don't have the new flag
                // If they have a userName set (not empty/default), they're existing users
                const isExistingUser = Boolean(savedSettings.userName && savedSettings.userName.trim() !== '');
                const finalSettings = {
                    ...savedSettings,
                    onboardingCompleted: savedSettings.onboardingCompleted ?? isExistingUser,
                };

                setSettings(finalSettings);
                setCurrentModel(finalSettings.ollama_model);
                setCurrentVoice(finalSettings.voice_id);

                if (finalSettings.vrm_model_path) {
                    setVrmUrl(finalSettings.vrm_model_path);
                }

                // Load customizations
                if (finalSettings.selectedOutfit) setSelectedOutfit(finalSettings.selectedOutfit);
                if (finalSettings.selectedHair) setSelectedHair(finalSettings.selectedHair);
                if (finalSettings.selectedStage) setSelectedStage(finalSettings.selectedStage);
                if (finalSettings.selectedHairColor) setSelectedHairColor(finalSettings.selectedHairColor);

                // Ensure VRM matches outfit if no custom path override
                if (!finalSettings.vrm_model_path && finalSettings.selectedOutfit) {
                    const outfit = OUTFITS.find(o => o.id === finalSettings.selectedOutfit);
                    if (outfit?.vrmPath) setVrmUrl(outfit.vrmPath);
                }
            } catch (e) {
                console.error('Failed to load settings:', e);
            }
        };
        loadSettings();
    }, [setCurrentModel, setCurrentVoice]);

    // Auto-send when listening stops
    useEffect(() => {
        if (!isListening && transcript.trim() && !isLoading) {
            const timer = setTimeout(() => {
                handleSendMessage(transcript.trim());
                resetTranscript();
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [isListening, transcript, isLoading]);

    // Save settings
    const handleSaveSettings = async (newSettings: AppSettings) => {
        try {
            await invoke('save_settings', { settings: newSettings });
            setSettings(newSettings);
            setCurrentModel(newSettings.ollama_model);
            setCurrentVoice(newSettings.voice_id);

            if (newSettings.vrm_model_path) {
                setVrmUrl(newSettings.vrm_model_path);
            } else {
                setVrmUrl(SAMPLE_VRM_URL);
            }
        } catch (e) {
            console.error('Failed to save settings:', e);
        }
    };

    // Handle sending a message
    const handleSendMessage = useCallback(async (content: string) => {
        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content,
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMessage]);
        setCurrentResponse('');
        setCurrentEmotion('thinking');

        // Detect animation triggers from user's request
        const userAnimTrigger = detectAnimationTrigger(content);
        if (userAnimTrigger) {
            setTriggeredAnimation(userAnimTrigger);
        }

        // Start recording the canvas
        // Try to get audio stream, initializing if needed (user gesture active here)
        let audioStream = kokoroService.getAudioStream();
        console.log('[App] Starting recording, audio stream:', audioStream ? 'Found' : 'Not Found');
        if (audioStream) {
            console.log('[App] Audio tracks:', audioStream.getAudioTracks().length);
        }

        const canvas = document.querySelector('canvas');
        if (canvas) {
            canvasRecorder.startRecording(canvas as HTMLCanvasElement, audioStream);
            setIsRecording(true);
        } else {
            console.error('[App] Failed to find canvas for recording');
        }

        const systemPrompt = getSystemPrompt(affection.level, settings.nsfw_enabled, settings.userName, settings.memories);
        const chatHistory = [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content,
        }));

        sendOllamaMessage(
            chatHistory,
            systemPrompt,
            // On chunk
            (chunk) => {
                setCurrentResponse(prev => {
                    const newResponse = prev + chunk;
                    const emotion = detectEmotion(newResponse);
                    setCurrentEmotion(emotion);
                    return newResponse;
                });
            },
            // On complete
            async (fullResponse) => {
                let cleanResponse = fullResponse;
                const memoryMatch = fullResponse.match(/\[MEMORY: (.*?)\]/);

                if (memoryMatch) {
                    const newMemory = memoryMatch[1];
                    console.log('Detected potential memory:', newMemory);

                    // Validation: Ignore placeholders and generics
                    // Regex for "loves/has/favorites X" pattern regardless of name
                    const placeholderRegex = /(loves|has|favorites|likes|prefers)\s+(an\s+)?(unknown\s+item|X|placeholder)/i;

                    // Blacklist: Common Suki traits misattributed to user
                    const blacklist = [
                        'alternative and indie music',
                        'alternative music',
                        'indie music',
                        'unexpected or nerdy passion',
                        'nerdy passions',
                        'fluffy animals',
                        'small dogs',
                        'goth and alt fashion',
                        'alt fashion'
                    ];

                    const isInvalid = placeholderRegex.test(newMemory) ||
                        blacklist.some(item => newMemory.toLowerCase().includes(item)) ||
                        newMemory.length < 5;

                    const currentMemories = settings.memories || '';
                    const isDuplicate = currentMemories.toLowerCase().includes(newMemory.toLowerCase());

                    if (!isInvalid && !isDuplicate) {
                        console.log('Saving valid memory:', newMemory);

                        // Remove tag from response
                        cleanResponse = fullResponse.replace(/\[MEMORY: .*?\]/, '').trim();

                        // Save to settings
                        const timestamp = new Date().toLocaleDateString();
                        const memoryEntry = `- ${newMemory} (${timestamp})`;
                        const updatedMemories = currentMemories ? `${currentMemories}\n${memoryEntry}` : memoryEntry;

                        handleSaveSettings({
                            ...settings,
                            memories: updatedMemories
                        });
                    } else {
                        console.log('Skipping memory (invalid or duplicate):', newMemory);
                        // Still strip the tag even if we don't save it
                        cleanResponse = fullResponse.replace(/\[MEMORY: .*?\]/, '').trim();
                    }
                }

                // Clean up ALL prompt artifacts/tags that might leak
                // This removes [LIKE], [inquisitive], [happy], [spin], etc. from being spoken/shown
                cleanResponse = cleanResponse
                    .replace(/\[.*?\]/g, '') // Remove anything in brackets
                    .replace(/##\s+(Likes|Dislikes|Key Phrases)/gi, '') // Remove headers
                    .replace(/\s+/g, ' ') // Normalize whitespace
                    .trim();

                const emotion = detectEmotion(fullResponse); // Use full response for detection

                // Detect animation triggers from response
                const animTrigger = detectAnimationTrigger(fullResponse); // Use full response for triggers
                if (animTrigger) {
                    setTriggeredAnimation(animTrigger);
                }

                const assistantMessage: Message = {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: cleanResponse,
                    timestamp: new Date(),
                    emotion,
                };

                setMessages(prev => [...prev, assistantMessage]);
                setCurrentResponse('');
                setCurrentEmotion(emotion);

                await increaseAffection(1);

                if (cleanResponse) {
                    setCurrentSubtitle(cleanResponse);

                    if (settings.voice_enabled) {
                        try {
                            await speak(cleanResponse);
                        } catch (e) {
                            console.error('TTS error:', e);
                            // Fallback to reading time on error
                            const wordCount = cleanResponse.split(/\s+/).length;
                            const readingTime = Math.max(2000, wordCount * 300);
                            await new Promise(r => setTimeout(r, readingTime));
                        }
                    } else {
                        // Voice disabled - wait for reading time
                        const wordCount = cleanResponse.split(/\s+/).length;
                        const readingTime = Math.max(2000, wordCount * 300); // 300ms per word, min 2s
                        await new Promise(r => setTimeout(r, readingTime));
                    }

                    setCurrentSubtitle('');
                }

                // Fade back to neutral after 2 seconds
                setTimeout(() => {
                    setCurrentEmotion('neutral');
                }, 2000);

                // Stop recording and save the video
                if (canvasRecorder.getIsRecording()) {
                    console.log('[App] Stopping recording...');
                    const videoBlob = await canvasRecorder.stopRecording();
                    if (videoBlob) {
                        console.log('[App] Recording saved, size:', videoBlob.size);
                        setCaptureVideoBlob(videoBlob);
                        // Store last interaction
                        setLastCaptureInteraction([
                            { role: 'user', content: userMessage.content, timestamp: userMessage.timestamp },
                            { role: 'assistant', content: fullResponse, timestamp: new Date() }
                        ]);
                    } else {
                        console.error('[App] Recording result was null');
                    }
                    setIsRecording(false);
                }
            },
            // On error
            (error) => {
                console.error('Chat error:', error);
                setCurrentResponse('');
                setCurrentEmotion('sad');

                const errorMessage: Message = {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: `[sad] Oh no... I couldn't respond. ${error} (◞‸◟；)`,
                    timestamp: new Date(),
                    emotion: 'sad',
                };
                setMessages(prev => [...prev, errorMessage]);
            }
        );
    }, [messages, affection.level, settings, sendOllamaMessage, increaseAffection, speak]);

    // Clear chat history
    const handleClearHistory = () => {
        setMessages([]);
        setCurrentResponse('');
        setCurrentEmotion('neutral');
        stopSpeaking();
        setCurrentSubtitle('');
    };

    // Handle mic click
    const handleMicClick = () => {
        if (isListening) {
            stopListening();
        } else {
            resetTranscript();
            startListening();
        }
    };

    // Handle VRM load/error
    const handleVRMLoad = () => setVrmError(null);
    const handleVRMError = (error: string) => {
        setVrmError(error);
        if (vrmUrl !== SAMPLE_VRM_URL) {
            setVrmUrl(SAMPLE_VRM_URL);
        }
    };

    return (
        <div className="h-screen w-screen overflow-hidden">
            {/* Animated Stage Background */}
            {/* Fullscreen 3D Avatar */}
            <AvatarCanvas
                vrmUrl={vrmUrl}
                emotion={currentEmotion}
                mouthWeights={mouthWeights}
                isLoading={isLoading}
                onVRMLoad={handleVRMLoad}
                onError={handleVRMError}
                affectionLevel={affection.level}
                triggeredAnimation={triggeredAnimation}
                onAnimationComplete={() => setTriggeredAnimation(null)}
                stage={selectedStage}
            />

            {/* Top-left: Affection Meter */}
            <div className="fixed top-4 left-4 z-20">
                <AffectionMeter
                    points={affection.level}
                    totalMessages={affection.total_messages}
                    onClick={() => setIsStreaksOpen(true)}
                />
            </div>

            {/* Top-left: Close button (placeholder for window control) */}
            <button
                className="fixed top-4 left-4 z-10 p-2 text-white/40 hover:text-white transition-colors"
                style={{ display: 'none' }} // Hidden for now
            >
                <X size={20} />
            </button>

            {/* Ollama connection warning */}
            {!ollamaStatus.connected && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-30">
                    <div className="glass-card p-3 flex items-center gap-2 bg-red-500/10 border-red-500/30">
                        <AlertCircle size={18} className="text-red-400" />
                        <div>
                            <p className="text-sm text-red-400 font-medium">Ollama not connected</p>
                            <p className="text-xs text-red-400/60">Run `ollama serve` to start</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Subtitle Overlay */}
            {/* Subtitles - only show if enabled */}
            {(settings.captions_enabled !== false) && (
                <SubtitleOverlay
                    text={currentSubtitle || currentResponse}
                    isVisible={(isSpeaking && settings.voice_enabled) || !!currentResponse || !!currentSubtitle}
                />
            )}

            {/* Floating Menu (Right Side) */}
            <FloatingMenu
                streakCount={currentStreak}
                isVoiceEnabled={settings.voice_enabled}
                isExpanded={isMenuExpanded}
                onStreaksClick={() => setIsStreaksOpen(true)}
                onCaptureClick={() => {
                    // Capture last 2 messages (user + assistant)
                    const lastTwo = messages.slice(-2)
                        .filter(m => m.role === 'user' || m.role === 'assistant') as { role: 'user' | 'assistant'; content: string; timestamp: Date }[];

                    if (lastTwo.length > 0) {
                        setLastCaptureInteraction(lastTwo);
                    }
                    setIsCaptureOpen(true);
                }}
                onOutfitClick={() => setIsCustomizationOpen(true)}
                onEraseClick={handleClearHistory}
                onSpeakerClick={() => {
                    const newSettings = { ...settings, voice_enabled: !settings.voice_enabled };
                    handleSaveSettings(newSettings);
                }}
                onSettingsClick={() => setIsSettingsOpen(true)}
                onToggleExpand={() => setIsMenuExpanded(!isMenuExpanded)}
            />

            {/* Bottom Input Bar */}
            <BottomInputBar
                isListening={isListening}
                isLoading={isLoading}
                onSendMessage={handleSendMessage}
                onMicClick={handleMicClick}
                onCameraClick={() => console.log('Camera clicked')}
                transcript={transcript}
                interimTranscript={interimTranscript}
            />

            <StreaksPanel
                isOpen={isStreaksOpen}
                onClose={() => setIsStreaksOpen(false)}
                userName={settings.userName || 'You'}
                companionName="Suki"
                friendshipDays={friendshipDays}
                currentStreak={currentStreak}
                weeklyProgress={weeklyProgress}
                connectionLevel={affection.level}
                connectionMax={100}
            />

            {/* Customization Panel (Bottom Sheet) */}
            <CustomizationPanel
                isOpen={isCustomizationOpen}
                onClose={() => setIsCustomizationOpen(false)}
                selectedOutfit={selectedOutfit}
                selectedHair={selectedHair}
                selectedHairColor={selectedHairColor}
                selectedStage={selectedStage}
                affectionPoints={affection.level}
                onSelectOutfit={handleSelectOutfit}
                onSelectHair={(id) => {
                    setSelectedHair(id);
                    handleSaveSettings({ ...settings, selectedHair: id });
                }}
                onSelectHairColor={(color) => {
                    setSelectedHairColor(color);
                    handleSaveSettings({ ...settings, selectedHairColor: color });
                }}
                onSelectStage={(id) => {
                    setSelectedStage(id);
                    handleSaveSettings({ ...settings, selectedStage: id });
                }}
            />

            {/* Capture Panel (Full Screen Overlay) */}
            <CapturePanel
                isOpen={isCaptureOpen}
                onClose={() => setIsCaptureOpen(false)}
                lastInteraction={lastCaptureInteraction}
                videoBlob={captureVideoBlob}
            />

            {/* Settings Modal */}
            <Settings
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                settings={settings}
                onSave={handleSaveSettings}
                models={models}
                ollamaConnected={ollamaStatus.connected}
                onRefreshModels={fetchModels}
                onResetAffection={resetAffection}
                affectionPoints={affection.level}
            />

            {/* Onboarding (First Launch) */}
            {!settings.onboardingCompleted && (
                <Onboarding
                    onComplete={(onboardingSettings) => {
                        handleSaveSettings({
                            ...settings,
                            ...onboardingSettings,
                        });
                    }}
                />
            )}
        </div>
    );
}

