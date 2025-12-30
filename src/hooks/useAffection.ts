import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { AffectionData, getAffectionLevelKey, AFFECTION_LEVELS, calculateLevel, AFFECTION_CONFIG } from '../types';

export function useAffection() {
    const [affection, setAffection] = useState<AffectionData>({
        level: 0, // Treated as points
        total_messages: 0,
        last_interaction: '',
        first_interaction: '',
        days_spoken: 0,
    });
    const [isLoading, setIsLoading] = useState(true);

    // Load affection data from storage
    const loadAffection = useCallback(async () => {
        try {
            const data = await invoke<AffectionData>('get_affection');
            // Handle legacy data without first_interaction
            if (!data.first_interaction && data.last_interaction) {
                data.first_interaction = data.last_interaction;
            }
            setAffection(data);
        } catch (error) {
            console.error('Failed to load affection:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Save affection data
    const saveAffection = useCallback(async (data: AffectionData) => {
        try {
            await invoke('set_affection', { data });
            setAffection(data);
        } catch (error) {
            console.error('Failed to save affection:', error);
        }
    }, []);

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
        await saveAffection(newData);
    }, [affection, saveAffection]);

    // Decrease affection (for negative interactions)
    const decreaseAffection = useCallback(async (amount: number = 10) => {
        const newData: AffectionData = {
            ...affection,
            level: Math.max(0, affection.level - amount),
            last_interaction: new Date().toISOString(),
        };
        await saveAffection(newData);
    }, [affection, saveAffection]);

    // Reset affection
    const resetAffection = useCallback(async () => {
        try {
            await invoke('reset_affection');
            setAffection({
                level: 0,
                total_messages: 0,
                last_interaction: '',
                first_interaction: '',
                days_spoken: 0,
            });
        } catch (error) {
            console.error('Failed to reset affection:', error);
        }
    }, []);

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
        isLoading,
        currentLevel,
        increaseAffection,
        decreaseAffection,
        resetAffection,
        getCurrentLevelInfo,
        levelKey: getAffectionLevelKey(affection.level),
        friendshipDays: getFriendshipDays(),
    };
}

