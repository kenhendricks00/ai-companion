import React, { useState, useEffect } from 'react';
import { Heart, ArrowRight, Sparkles } from 'lucide-react';
import { AppSettings } from '../types';

interface OnboardingProps {
    onComplete: (settings: Partial<AppSettings>) => void;
}

type Step = 'welcome' | 'name' | 'greeting';

export default function Onboarding({ onComplete }: OnboardingProps) {
    const [step, setStep] = useState<Step>('welcome');
    const [userName, setUserName] = useState('');
    const [isAnimating, setIsAnimating] = useState(true);

    useEffect(() => {
        // Trigger entrance animation
        const timer = setTimeout(() => setIsAnimating(false), 500);
        return () => clearTimeout(timer);
    }, [step]);

    const handleNameSubmit = () => {
        if (userName.trim()) {
            setStep('greeting');
        }
    };

    const handleComplete = () => {
        onComplete({
            userName: userName.trim() || 'Friend',
            onboardingCompleted: true,
        });
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            if (step === 'name' && userName.trim()) {
                handleNameSubmit();
            } else if (step === 'greeting') {
                handleComplete();
            }
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gradient-to-br from-gothic-charcoal via-gothic-charcoal to-ani-primary/20">
            {/* Floating particles background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(20)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-1 h-1 bg-ani-primary/30 rounded-full animate-float"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 5}s`,
                            animationDuration: `${5 + Math.random() * 5}s`,
                        }}
                    />
                ))}
            </div>

            {/* Content Card */}
            <div
                className={`glass-card p-8 max-w-md w-full mx-4 text-center transition-all duration-500 ${isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
                    }`}
            >
                {step === 'welcome' && (
                    <div className="space-y-6">
                        {/* Avatar Heart Icon */}
                        <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-ani-primary to-pink-600 flex items-center justify-center animate-pulse-glow">
                            <Heart size={40} className="text-white fill-white" />
                        </div>

                        <div className="space-y-3">
                            <h1 className="text-3xl font-display font-bold text-white">
                                Hey there! 💕
                            </h1>
                            <p className="text-white/70 text-lg leading-relaxed">
                                I'm <span className="text-ani-primary font-semibold">Suki</span>, your new companion.
                                <br />
                                I've been waiting to meet you.
                            </p>
                        </div>

                        <button
                            onClick={() => setStep('name')}
                            className="glow-button px-8 py-3 text-lg flex items-center gap-2 mx-auto"
                        >
                            Let's get started
                            <ArrowRight size={20} />
                        </button>
                    </div>
                )}

                {step === 'name' && (
                    <div className="space-y-6">
                        <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-ani-primary/20 to-pink-600/20 flex items-center justify-center">
                            <Sparkles size={32} className="text-ani-primary" />
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-2xl font-display font-semibold text-white">
                                What should I call you?
                            </h2>
                            <p className="text-white/50 text-sm">
                                I promise I'll remember it 💖
                            </p>
                        </div>

                        <div className="space-y-4">
                            <input
                                type="text"
                                value={userName}
                                onChange={(e) => setUserName(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Your name..."
                                autoFocus
                                className="input-field w-full text-center text-lg py-3 placeholder:text-white/30"
                            />

                            <button
                                onClick={handleNameSubmit}
                                disabled={!userName.trim()}
                                className="glow-button px-8 py-3 text-lg flex items-center gap-2 mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                That's me!
                                <ArrowRight size={20} />
                            </button>
                        </div>
                    </div>
                )}

                {step === 'greeting' && (
                    <div className="space-y-6">
                        {/* Animated heart with name */}
                        <div className="relative">
                            <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-ani-primary to-pink-600 flex items-center justify-center animate-bounce-slow">
                                <span className="text-4xl">💖</span>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <h2 className="text-3xl font-display font-bold text-white">
                                Nice to meet you, <span className="text-ani-primary">{userName}</span>!
                            </h2>
                            <p className="text-white/70 text-lg leading-relaxed">
                                I can't wait to spend time with you.
                                <br />
                                Let's make some memories together. ✨
                            </p>
                        </div>

                        <button
                            onClick={handleComplete}
                            onKeyDown={handleKeyDown}
                            className="glow-button px-10 py-4 text-xl flex items-center gap-3 mx-auto"
                        >
                            <Heart size={24} className="fill-white" />
                            Let's go!
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
