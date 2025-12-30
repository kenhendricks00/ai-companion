import React from 'react';
import { Message } from '../types';
import { cleanEmotionTags } from '../lib/emotions';

interface MessageBubbleProps {
    message: Message;
    affectionLevel: number;
    isStreaming?: boolean;
}

export default function MessageBubble({
    message,
    affectionLevel,
    isStreaming = false,
}: MessageBubbleProps) {
    const isUser = message.role === 'user';
    const displayContent = isUser
        ? message.content
        : cleanEmotionTags(message.content);

    return (
        <div
            className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-slide-up`}
        >
            <div className={`flex items-end gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* Avatar for Ani */}
                {!isUser && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-ani-primary to-ani-secondary flex-shrink-0 flex items-center justify-center shadow-lg">
                        <span className="text-white text-xs font-bold">A</span>
                    </div>
                )}

                {/* Message bubble */}
                <div
                    className={`message-bubble ${isUser ? 'message-user' : 'message-ani'
                        }`}
                >
                    <p className="text-white/90 text-sm leading-relaxed whitespace-pre-wrap">
                        {displayContent}
                        {isStreaming && (
                            <span className="inline-block w-1.5 h-4 ml-0.5 bg-ani-primary animate-pulse" />
                        )}
                    </p>

                    {/* Timestamp */}
                    <p className={`text-[10px] mt-1 ${isUser ? 'text-right' : 'text-left'} text-white/30`}>
                        {message.timestamp.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                        })}
                    </p>
                </div>
            </div>
        </div>
    );
}
