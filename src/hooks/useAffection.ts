import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { AffectionData, getAffectionLevelKey, AFFECTION_LEVELS, calculateLevel, AFFECTION_CONFIG } from '../types';

export function useAffection(initialData?: AffectionData, onUpdate?: (data: AffectionData) => void) {
    const [affection, setAffection] = useState<AffectionData>(initialData || {
        level: 0, // Treated as points
        total_messages: 0,
        last_interaction: '',
        first_interaction: '',
        days_spoken: 0,
    });

    // Sync from props if they change (e.g. loaded from settings)
    useEffect(() => {
        if (initialData) {
            setAffection(initialData);
        }
    }, [initialData]);

    const updateAffectionData = useCallback((newData: AffectionData) => {
        setAffection(newData);
        if (onUpdate) {
            onUpdate(newData);
        }
    }, [onUpdate]);

    // Increase affection (called after each interaction)
    const increaseAffection = useCallback(async (amount: number = 10) => {
        const now = new Date();
        const nowStr = now.toISOString();
        const todayStr = now.toLocaleDateString();

        // Check if it's a new day for interaction
        const lastDate = affection.last_interaction ? new Date(affection.last_interaction).toLocaleDateString() : '';
        const isNewDay = lastDate !== todayStr;

        const maxPoints = AFFECTION_CONFIG.MAX_LEVEL * AFFECTION_CONFIG.POINTS_PER_LEVEL;

        const newData: AffectionData = {
            level: Math.min(maxPoints, affection.level + amount),
            total_messages: affection.total_messages + 1,
            last_interaction: nowStr,
            first_interaction: affection.first_interaction || nowStr,
            days_spoken: isNewDay ? (affection.days_spoken || 0) + 1 : (affection.days_spoken || 1),
        };
        updateAffectionData(newData);
    }, [affection, updateAffectionData]);

    // Decrease affection (for negative interactions)
    const decreaseAffection = useCallback(async (amount: number = 10) => {
        const newData: AffectionData = {
            ...affection,
            level: Math.max(0, affection.level - amount),
            last_interaction: new Date().toISOString(),
            first_interaction: affection.first_interaction,
            total_messages: affection.total_messages,
            days_spoken: affection.days_spoken
        };
        updateAffectionData(newData);
    }, [affection, updateAffectionData]);

    // Reset affection
    const resetAffection = useCallback(async () => {
        const resetData = {
            level: 0,
            total_messages: 0,
            last_interaction: '',
            first_interaction: '',
            days_spoken: 0,
        };
        updateAffectionData(resetData);
    }, [updateAffectionData]);

    // Get current level info
    const getCurrentLevelInfo = useCallback(() => {
        const levelKey = getAffectionLevelKey(affection.level);
        return AFFECTION_LEVELS[levelKey];
    }, [affection.level]);

    // Get friendship days
    const getFriendshipDays = useCallback(() => {
        return Math.max(1, affection.days_spoken || 0);
    }, [affection.days_spoken]);

    const currentLevel = calculateLevel(affection.level);

    return {
        affection,
        currentLevel,
        increaseAffection,
        decreaseAffection,
        resetAffection,
        getCurrentLevelInfo,
        levelKey: getAffectionLevelKey(affection.level),
        friendshipDays: getFriendshipDays(),
    };
}

