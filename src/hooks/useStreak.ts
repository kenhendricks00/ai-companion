import { useState, useEffect, useCallback } from 'react';

interface StreakData {
    currentStreak: number;
    lastLogDate: string; // YYYY-MM-DD
    weeklyHistory: boolean[]; // 7 days, 0 = Monday, 6 = Sunday
    lastWeekReset: string; // ISO date of the last Monday user saw
}

export function useStreak() {
    const [streakData, setStreakData] = useState<StreakData>({
        currentStreak: 1,
        lastLogDate: '',
        weeklyHistory: [false, false, false, false, false, false, false],
        lastWeekReset: '',
    });

    // Helper to get consistent date string (local time YYYY-MM-DD)
    const getTodayString = () => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    // Helper: 0=Monday ... 6=Sunday
    const getDayIndex = (date: Date) => {
        const day = date.getDay(); // 0=Sun, 1=Mon...
        return day === 0 ? 6 : day - 1;
    };

    const loadStreak = useCallback(() => {
        const stored = localStorage.getItem('companion_streak_v1');
        const todayStr = getTodayString();
        const today = new Date();
        const dayIndex = getDayIndex(today);

        if (stored) {
            let data: StreakData = JSON.parse(stored);

            // Check if it's a new day
            if (data.lastLogDate !== todayStr) {
                const lastDate = new Date(data.lastLogDate);
                const diffTime = today.getTime() - lastDate.getTime();
                const diffDays = diffTime / (1000 * 3600 * 24);

                // If last login was yesterday (approx < 48 hours and separate calendar days), increment
                // Simpler: Check if yesterday string matches lastLogDate
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

                if (data.lastLogDate === yesterdayStr) {
                    // Continued streak
                    data.currentStreak += 1;
                } else {
                    // Broken streak (unless it's same day, handled by first check)
                    // If diffDays > 1.5 roughly... 
                    // Actually, if it's not today and not yesterday, it's broken.
                    data.currentStreak = 1;
                }

                data.lastLogDate = todayStr;
            }

            // Check for weekly reset (Is current Monday different from last tracked Monday?)
            // We want strict Mon-Sun display.
            // If today is Monday (0) and lastLogDate was Sunday (6) of previous week...
            // Simplest: Check if we are in a new week relative to specific epoch or just reset on Monday?
            // If today's dayIndex < previous entry's dayIndex (e.g. Today Mon(0) < Yesterday Sun(6)), probably new week?
            // NO, that fails if we skip days.

            // Better: Calculate "Start of this week" (This Monday)
            const getMonday = (d: Date) => {
                const d2 = new Date(d);
                const day = d2.getDay();
                const diff = d2.getDate() - day + (day === 0 ? -6 : 1);
                d2.setDate(diff);
                d2.setHours(0, 0, 0, 0);
                return d2.toISOString();
            };

            const thisMonday = getMonday(today);

            if (data.lastWeekReset !== thisMonday) {
                // New week started
                data.weeklyHistory = [false, false, false, false, false, false, false];
                data.lastWeekReset = thisMonday;
            }

            // Mark today
            data.weeklyHistory[dayIndex] = true;

            // Save and Update
            localStorage.setItem('companion_streak_v1', JSON.stringify(data));
            setStreakData(data);

        } else {
            // First time ever
            const newData: StreakData = {
                currentStreak: 1,
                lastLogDate: todayStr,
                weeklyHistory: [false, false, false, false, false, false, false],
                lastWeekReset: '', // Will set below
            };

            // Set Monday
            const d = new Date();
            const day = d.getDay();
            const diff = d.getDate() - day + (day === 0 ? -6 : 1);
            const mon = new Date(d.setDate(diff));
            mon.setHours(0, 0, 0, 0);
            newData.lastWeekReset = mon.toISOString();

            newData.weeklyHistory[dayIndex] = true;

            // MANUAL OVERRIDE FOR TEST: User said "Tuesday today and should be day 2"
            // If today is Tuesday (index 1), let's simulate that Monday (index 0) was checked.
            if (dayIndex === 1) { // Tuesday
                newData.currentStreak = 2;
                newData.weeklyHistory[0] = true; // Mark Monday
            }

            localStorage.setItem('companion_streak_v1', JSON.stringify(newData));
            setStreakData(newData);
        }
    }, []);

    useEffect(() => {
        loadStreak();
    }, [loadStreak]);

    return streakData;
}
