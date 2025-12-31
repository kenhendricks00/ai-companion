import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Camera, MessageCircle } from 'lucide-react';

interface BottomInputBarProps {
    isListening: boolean;
    isLoading: boolean;
    onSendMessage: (message: string) => void;
    onMicClick: () => void;
    onCameraClick?: () => void;
    transcript?: string;
    interimTranscript?: string;
}

export default function BottomInputBar({
    isListening,
    isLoading,
    onSendMessage,
    onMicClick,
    onCameraClick,
    transcript = '',
    interimTranscript = '',
}: BottomInputBarProps) {
    const [input, setInput] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    // Update input when transcript changes (syncs both voice input and clearing)
    useEffect(() => {
        if (typeof transcript === 'string') {
            setInput(transcript);
        }
    }, [transcript]);

    const handleSubmit = () => {
        const textToSend = input.trim();
        if (textToSend && !isLoading) {
            onSendMessage(textToSend);
            setInput('');
            // Keep focus for continuous typing
            inputRef.current?.focus();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const displayText = input || interimTranscript;

    return (
        <div className="bottom-input-bar">
            {/* Mic Button */}
            <button
                onClick={onMicClick}
                className={`bottom-input-button ${isListening ? 'bg-ani-primary/30 border-ani-primary text-ani-primary' : ''}`}
                title={isListening ? 'Stop listening' : 'Start voice input'}
            >
                {isListening ? <MicOff size={20} /> : <Mic size={20} />}
            </button>

            {/* Camera Button */}
            <button
                onClick={onCameraClick}
                className="bottom-input-button"
                title="Camera (Coming soon)"
            >
                <Camera size={20} />
            </button>

            {/* Text Input */}
            <input
                ref={inputRef}
                type="text"
                autoFocus
                value={displayText}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask Anything"
                className="bottom-input-field"
            // Don't disable input while loading, allow typing ahead
            // disabled={isLoading} 
            />

            {/* Send/Text Button */}
            <button
                onClick={handleSubmit}
                disabled={!input.trim() || isLoading}
                className={`bottom-send-button ${!input.trim() || isLoading ? 'opacity-50' : ''}`}
            >
                <MessageCircle size={16} />
                <span>Text</span>
            </button>
        </div>
    );
}
