
import React, { createContext, useContext, useRef, useCallback, useState } from 'react';

interface SnapshotContextType {
    registerCapture: (fn: () => string | null) => void;
    captureSnapshot: () => string | null;
    isAvatarVisible: boolean;
    setAvatarVisible: (visible: boolean) => void;
}

const SnapshotContext = createContext<SnapshotContextType | null>(null);

export function SnapshotProvider({ children }: { children: React.ReactNode }) {
    const captureFnRef = useRef<(() => string | null) | null>(null);
    const [isAvatarVisible, setAvatarVisible] = useState(true);

    const registerCapture = useCallback((fn: () => string | null) => {
        captureFnRef.current = fn;
    }, []);

    const captureSnapshot = useCallback(() => {
        if (captureFnRef.current) {
            return captureFnRef.current();
        }
        return null;
    }, []);

    return (
        <SnapshotContext.Provider value={{ registerCapture, captureSnapshot, isAvatarVisible, setAvatarVisible }}>
            {children}
        </SnapshotContext.Provider>
    );
}

export function useSnapshot() {
    const context = useContext(SnapshotContext);
    if (!context) {
        throw new Error('useSnapshot must be used within a SnapshotProvider');
    }
    return context;
}
