import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, MicOff, Settings, Trash2 } from 'lucide-react';
import { Message } from '../types';
import MessageBubble from './MessageBubble';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

interface ChatInterfaceProps {
    messages: Message[];
    isLoading: boolean;
    onSendMessage: (message: string) => void;
    onClearHistory: () => void;
    onOpenSettings: () => void;
    currentResponse?: string;
    affectionLevel: number;
}

export default function ChatInterface({
    messages,
    isLoading,
    onSendMessage,
    onClearHistory,
    onOpenSettings,
    currentResponse,
    affectionLevel,
}: ChatInterfaceProps) {
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Speech recognition
    const {
        isListening,
        isSupported: speechSupported,
        transcript,
        interimTranscript,
        startListening,
        stopListening,
        resetTranscript,
    } = useSpeechRecognition();

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, currentResponse]);

    // Update input when transcript changes
    useEffect(() => {
        if (transcript) {
            setInput(transcript);
        }
    }, [transcript]);

    // Auto-send when listening stops (conversation mode)
    useEffect(() => {
        // When we stop listening and have a transcript, auto-send after a brief delay
        if (!isListening && transcript.trim() && !isLoading) {
            const timer = setTimeout(() => {
                onSendMessage(transcript.trim());
                setInput('');
                resetTranscript();
            }, 500); // Short delay to allow for manual edits if needed

            return () => clearTimeout(timer);
        }
    }, [isListening, transcript, isLoading, onSendMessage, resetTranscript]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const textToSend = input.trim() || transcript.trim();
        if (textToSend && !isLoading) {
            onSendMessage(textToSend);
            setInput('');
            resetTranscript();
            if (isListening) {
                stopListening();
            }
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            handleSubmit(e);
        }
    };

    const handleMicClick = () => {
        if (isListening) {
            stopListening();
        } else {
            resetTranscript();
            setInput('');
            startListening();
        }
    };

    // Display text: prefer input, then transcript + interim
    const displayText = input || transcript + (interimTranscript ? interimTranscript : '');

    return (
        <div className="flex flex-col h-full glass-card-dark">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-ani-primary to-ani-secondary flex items-center justify-center">
                        <span className="text-white font-bold">A</span>
                    </div>
                    <div>
                        <h2 className="font-display font-semibold text-white">Ani</h2>
                        <p className="text-xs text-white/50">
                            {isLoading ? 'Typing...' : 'Online'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={onClearHistory}
                        className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/60 hover:text-white"
                        title="Clear history"
                    >
                        <Trash2 size={18} />
                    </button>
                    <button
                        onClick={onOpenSettings}
                        className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/60 hover:text-white"
                        title="Settings"
                    >
                        <Settings size={18} />
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center px-4">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-ani-primary/30 to-ani-secondary/30 flex items-center justify-center mb-4">
                            <span className="text-4xl">💕</span>
                        </div>
                        <h3 className="font-display text-xl text-white mb-2">
                            Hi there! I'm Ani~ ✨
                        </h3>
                        <p className="text-white/60 text-sm max-w-[280px]">
                            Your cute AI companion! Send me a message and let's chat!
                            (◕‿◕✿)
                        </p>
                        {speechSupported && (
                            <p className="text-white/40 text-xs mt-3">
                                🎤 Click the mic button to talk to me!
                            </p>
                        )}
                    </div>
                ) : (
                    <>
                        {messages.map((message) => (
                            <MessageBubble
                                key={message.id}
                                message={message}
                                affectionLevel={affectionLevel}
                            />
                        ))}

                        {/* Streaming response */}
                        {currentResponse && (
                            <MessageBubble
                                message={{
                                    id: 'streaming',
                                    role: 'assistant',
                                    content: currentResponse,
                                    timestamp: new Date(),
                                }}
                                affectionLevel={affectionLevel}
                                isStreaming
                            />
                        )}

                        {/* Loading indicator */}
                        {isLoading && !currentResponse && (
                            <div className="flex items-center gap-2 text-white/60">
                                <div className="flex gap-1">
                                    <span className="typing-dot w-2 h-2 bg-ani-primary rounded-full" />
                                    <span className="typing-dot w-2 h-2 bg-ani-primary rounded-full" />
                                    <span className="typing-dot w-2 h-2 bg-ani-primary rounded-full" />
                                </div>
                                <span className="text-sm">Ani is typing...</span>
                            </div>
                        )}
                    </>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Listening indicator */}
            {isListening && (
                <div className="px-4 py-2 bg-ani-primary/20 border-t border-ani-primary/30">
                    <div className="flex items-center gap-2 text-ani-primary">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-sm font-medium">Listening...</span>
                        {interimTranscript && (
                            <span className="text-white/60 text-sm italic truncate flex-1">
                                {interimTranscript}
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-4 border-t border-white/10">
                <div className="flex items-center gap-3">
                    <input
                        ref={inputRef}
                        type="text"
                        value={displayText}
                        onChange={(e) => {
                            setInput(e.target.value);
                            if (transcript) resetTranscript();
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder={isListening ? "Speak now..." : "Say something to Ani..."}
                        className="input-field flex-1"
                        disabled={isLoading}
                    />

                    {/* Microphone button */}
                    {speechSupported && (
                        <button
                            type="button"
                            onClick={handleMicClick}
                            disabled={isLoading}
                            className={`w-12 h-12 flex items-center justify-center rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed ${isListening
                                ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                                : 'bg-white/10 hover:bg-white/20'
                                }`}
                            title={isListening ? "Stop listening" : "Start voice input"}
                        >
                            {isListening ? (
                                <MicOff size={20} className="text-white" />
                            ) : (
                                <Mic size={20} className="text-white/80" />
                            )}
                        </button>
                    )}

                    {/* Send button */}
                    <button
                        type="submit"
                        disabled={(!input.trim() && !transcript.trim()) || isLoading}
                        className="glow-button w-12 h-12 flex items-center justify-center rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Send size={20} className="text-white" />
                    </button>
                </div>
            </form>
        </div>
    );
}
