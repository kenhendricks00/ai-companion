import React, { useState, useEffect } from 'react';
import { X, RefreshCw, Folder, AlertCircle, CheckCircle, Lock } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { AppSettings, calculateLevel, AFFECTION_CONFIG } from '../types';
import { KOKORO_VOICES } from '../lib/kokoro';

interface SettingsProps {
    isOpen: boolean;
    onClose: () => void;
    settings: AppSettings;
    onSave: (settings: AppSettings) => void;
    models: string[];
    ollamaConnected: boolean;
    onRefreshModels: () => void;
    onResetAffection: () => void;
    affectionPoints: number;
}

export default function Settings({
    isOpen,
    onClose,
    settings,
    onSave,
    models,
    ollamaConnected,
    onRefreshModels,
    onResetAffection,
    affectionPoints,
}: SettingsProps) {
    const [localSettings, setLocalSettings] = useState(settings);
    const [showResetConfirm, setShowResetConfirm] = useState(false);

    const currentLevel = calculateLevel(affectionPoints);
    const isNSFWLocked = currentLevel < AFFECTION_CONFIG.UNLOCKS.NSFW;

    useEffect(() => {
        setLocalSettings(settings);
    }, [settings]);

    if (!isOpen) return null;

    const handleSave = () => {
        // If locked, ensure it stays off
        const finalSettings = isNSFWLocked
            ? { ...localSettings, nsfw_enabled: false }
            : localSettings;
        onSave(finalSettings);
        onClose();
    };

    const handleResetAffection = () => {
        onResetAffection();
        setShowResetConfirm(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="glass-card w-full max-w-md mx-4 max-h-[80vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                    <h2 className="text-lg font-display font-semibold text-white">Settings</h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/60 hover:text-white"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Profile Section */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-medium text-white/80">My Profile</h3>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs text-white/40 block mb-1">Your Name</label>
                                <input
                                    type="text"
                                    value={localSettings.userName || ''}
                                    onChange={(e) => setLocalSettings({ ...localSettings, userName: e.target.value })}
                                    placeholder="what should she call you?"
                                    className="input-field w-full text-sm"
                                />
                            </div>
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="text-xs text-white/40">Suki's Memory of You</label>
                                    <span className="text-[10px] text-white/30">Auto-updates</span>
                                </div>
                                <textarea
                                    value={localSettings.memories || ''}
                                    onChange={(e) => setLocalSettings({ ...localSettings, memories: e.target.value })}
                                    placeholder="- Likes sci-fi movies&#10;- Has a dog named Spot"
                                    className="input-field w-full text-sm min-h-[80px] font-mono text-white/70"
                                />
                                <p className="text-[10px] text-white/30 mt-1">
                                    Suki will remember things you tell her. You can edit this list anytime.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="w-full h-px bg-white/10" />

                    {/* Ollama Status */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-medium text-white/80">Ollama Connection</h3>
                        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${ollamaConnected ? 'bg-green-500/10' : 'bg-red-500/10'
                            }`}>
                            {ollamaConnected ? (
                                <>
                                    <CheckCircle size={16} className="text-green-400" />
                                    <span className="text-sm text-green-400">Connected to localhost:11434</span>
                                </>
                            ) : (
                                <>
                                    <AlertCircle size={16} className="text-red-400" />
                                    <span className="text-sm text-red-400">Not connected</span>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Model Selection */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium text-white/80">AI Model</h3>
                            <button
                                onClick={onRefreshModels}
                                className="p-1.5 rounded hover:bg-white/10 transition-colors text-white/50 hover:text-white"
                                title="Refresh models"
                            >
                                <RefreshCw size={14} />
                            </button>
                        </div>
                        <select
                            value={localSettings.ollama_model}
                            onChange={(e) => setLocalSettings({ ...localSettings, ollama_model: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white/80 text-sm focus:outline-none focus:border-ani-primary/50"
                            disabled={models.length === 0}
                        >
                            {models.length === 0 ? (
                                <option value="">No models found</option>
                            ) : (
                                models.map((model) => (
                                    <option key={model} value={model} className="bg-gothic-charcoal">
                                        {model}
                                    </option>
                                ))
                            )}
                        </select>
                        <p className="text-xs text-white/40">
                            Run `ollama pull dolphin-mistral` to download models
                        </p>
                    </div>

                    {/* Voice Selection */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-medium text-white/80">Voice</h3>
                        <select
                            value={localSettings.voice_id}
                            onChange={(e) => setLocalSettings({ ...localSettings, voice_id: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white/80 text-sm focus:outline-none focus:border-ani-primary/50"
                        >
                            {KOKORO_VOICES.map((voice) => (
                                <option key={voice.id} value={voice.id} className="bg-gothic-charcoal">
                                    {voice.name} ({voice.lang})
                                </option>
                            ))}
                        </select>

                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={localSettings.voice_enabled}
                                onChange={(e) => setLocalSettings({ ...localSettings, voice_enabled: e.target.checked })}
                                className="w-4 h-4 rounded border-white/20 bg-white/5 text-ani-primary focus:ring-ani-primary/50"
                            />
                            <span className="text-sm text-white/70">Enable voice responses</span>
                        </label>

                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={localSettings.captions_enabled !== false}
                                onChange={(e) => setLocalSettings({ ...localSettings, captions_enabled: e.target.checked })}
                                className="w-4 h-4 rounded border-white/20 bg-white/5 text-ani-primary focus:ring-ani-primary/50"
                            />
                            <span className="text-sm text-white/70">Show captions/subtitles</span>
                        </label>
                    </div>

                    {/* VRM Model Path */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-medium text-white/80">Custom VRM Model</h3>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={localSettings.vrm_model_path || ''}
                                onChange={(e) => setLocalSettings({ ...localSettings, vrm_model_path: e.target.value || null })}
                                placeholder="/models/my_avatar.vrm"
                                className="input-field flex-1 text-sm"
                            />
                            <button
                                className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-white/60"
                                title="Browse (Coming Soon)"
                            >
                                <Folder size={18} />
                            </button>
                        </div>
                        <p className="text-xs text-white/40">
                            Put .vrm files in <code>public/models</code> folder. Then type <code>/models/filename.vrm</code> here.
                        </p>
                    </div>

                    {/* NSFW Toggle */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium text-white/80">Content</h3>
                            {isNSFWLocked && (
                                <span className="text-[10px] text-ani-primary flex items-center gap-1 font-medium bg-ani-primary/10 px-2 py-0.5 rounded-full">
                                    <Lock size={10} /> Requires Lv. {AFFECTION_CONFIG.UNLOCKS.NSFW}
                                </span>
                            )}
                        </div>
                        <label className={`flex items-center gap-3 ${isNSFWLocked ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
                            <input
                                type="checkbox"
                                checked={!isNSFWLocked && localSettings.nsfw_enabled}
                                onChange={(e) => !isNSFWLocked && setLocalSettings({ ...localSettings, nsfw_enabled: e.target.checked })}
                                disabled={isNSFWLocked}
                                className="w-4 h-4 rounded border-white/20 bg-white/5 text-ani-primary focus:ring-ani-primary/50 disabled:opacity-50"
                            />
                            <span className="text-sm text-white/70">Enable mature content (requires uncensored model)</span>
                        </label>
                    </div>

                    {/* Reset Affection */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-medium text-white/80">Affection</h3>
                        {showResetConfirm ? (
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-white/60">Are you sure?</span>
                                <button
                                    onClick={handleResetAffection}
                                    className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-sm hover:bg-red-500/30 transition-colors"
                                >
                                    Yes, reset
                                </button>
                                <button
                                    onClick={() => setShowResetConfirm(false)}
                                    className="px-3 py-1.5 rounded-lg bg-white/5 text-white/60 text-sm hover:bg-white/10 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowResetConfirm(true)}
                                className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white/60 text-sm hover:bg-white/10 transition-colors"
                            >
                                Reset Affection Level
                            </button>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-white/10 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="glow-button px-6 py-2"
                    >
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}
