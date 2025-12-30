import React, { useState, useRef, useEffect } from 'react';
import { Lock, Camera } from 'lucide-react';
import { useSnapshot } from '../contexts/SnapshotContext';
import { calculateLevel, AFFECTION_CONFIG } from '../types';

type TabType = 'outfit' | 'hair' | 'stage';

// Dev tools toggle - set to true to show thumbnail capture buttons
const SHOW_DEV_TOOLS = false;

interface CustomizationItem {
    id: string;
    name: string;
    thumbnail?: string;
    isLocked?: boolean;
    unlockCondition?: string;
    minLevel?: number; // Minimum level (0-30) required
}

interface CustomizationPanelProps {
    isOpen: boolean;
    onClose: () => void;
    selectedOutfit: string;
    selectedHair: string;
    selectedHairColor: string;
    selectedStage: string;
    affectionPoints: number; // Current raw affection score
    onSelectOutfit: (id: string) => void;
    onSelectHair: (id: string) => void;
    onSelectHairColor: (color: string) => void;
    onSelectStage: (id: string) => void;
}

// Outfit data with VRM paths
interface OutfitItem extends CustomizationItem {
    vrmPath?: string;
}

export const OUTFITS: OutfitItem[] = [
    { id: 'classic', name: 'Classic', vrmPath: '/models/Suki.vrm', thumbnail: '/thumbnails/thumb_outfit_classic.png' },
    { id: 'sunny', name: 'Sunny (Bikini)', vrmPath: '/models/Suki%20-%20Bikini.vrm', thumbnail: '/thumbnails/thumb_outfit_bikini.png', minLevel: AFFECTION_CONFIG.UNLOCKS.OUTFITS, unlockCondition: `Requires Lv. ${AFFECTION_CONFIG.UNLOCKS.OUTFITS}` },
    { id: 'schoolgirl', name: 'Schoolgirl', vrmPath: '/models/Suki%20-%20Schoolgirl.vrm', thumbnail: '/thumbnails/thumb_outfit_schoolgirl.png' },
    { id: 'formal', name: 'Formal', vrmPath: '/models/Suki%20-%20Formal.vrm', thumbnail: '/thumbnails/thumb_outfit_formal.png' },
    { id: 'adventurer', name: 'Adventurer', vrmPath: '/models/Suki%20-%20Adventurer.vrm', thumbnail: '/thumbnails/thumb_outfit_adventurer.png' },
    { id: 'christmas', name: 'Christmas', isLocked: true, unlockCondition: 'Coming soon', thumbnail: '/thumbnails/thumb_outfit_christmas.png' },
    { id: 'bff', name: 'BFF', isLocked: true, unlockCondition: 'Hit 7-day streak', thumbnail: '/thumbnails/thumb_outfit_bff.png' },
    { id: 'summer', name: 'Summer', isLocked: true, unlockCondition: 'Hit 30-day streak', thumbnail: '/thumbnails/thumb_outfit_summer.png' },
];

const HAIRSTYLES: CustomizationItem[] = [
    { id: 'twin-tails', name: 'Twin Tails', thumbnail: '/thumbnails/thumb_hair_twin-tails.png' },
    { id: 'halloween', name: 'Halloween', isLocked: true, unlockCondition: 'Coming soon', thumbnail: '/thumbnails/thumb_hair_halloween.png' },
    { id: 'double-bun', name: 'Double Bun', isLocked: true, unlockCondition: 'Coming soon', thumbnail: '/thumbnails/thumb_hair_double-bun.png' },
    { id: 'ponytail', name: 'Ponytail', isLocked: true, unlockCondition: 'Coming soon', thumbnail: '/thumbnails/thumb_hair_ponytail.png' },
    { id: 'braids', name: 'Braids', isLocked: true, unlockCondition: 'Coming soon', thumbnail: '/thumbnails/thumb_hair_braids.png' },
];

const HAIR_COLORS = [
    '#F5DEB3', // Blonde
    '#D2691E', // Brown
    '#8B4513', // Dark Brown
    '#FF6347', // Red
    '#FF69B4', // Pink
    '#FFD700', // Gold
    '#C0C0C0', // Silver
    '#87CEEB', // Light Blue
    '#9370DB', // Purple
];

const STAGES: CustomizationItem[] = [
    { id: 'default', name: 'Default', thumbnail: '/thumbnails/thumb_stage_default.png' },
    { id: 'halftone', name: 'Halftone', thumbnail: '/thumbnails/thumb_stage_halftone.png' },
    { id: 'grid', name: 'Grid', thumbnail: '/thumbnails/thumb_stage_grid.png' },
    { id: 'tunnelgrid', name: 'Tunnelgrid', thumbnail: '/thumbnails/thumb_stage_tunnelgrid.png' },
    { id: 'neon', name: 'Neon', thumbnail: '/thumbnails/thumb_stage_neon.png' },
];

export default function CustomizationPanel({
    isOpen,
    onClose,
    selectedOutfit,
    selectedHair,
    selectedHairColor,
    selectedStage,
    affectionPoints,
    onSelectOutfit,
    onSelectHair,
    onSelectHairColor,
    onSelectStage,
}: CustomizationPanelProps) {
    const [activeTab, setActiveTab] = useState<TabType>('outfit');

    // Drag-to-resize logic
    const panelRef = useRef<HTMLDivElement>(null);
    const dragInfo = useRef({
        isDragging: false,
        startY: 0,
        startHeight: 0
    });

    useEffect(() => {
        const handleMove = (e: MouseEvent | TouchEvent) => {
            if (!dragInfo.current.isDragging || !panelRef.current) return;

            const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
            const deltaY = dragInfo.current.startY - clientY;
            const newHeight = dragInfo.current.startHeight + deltaY;

            // Constraints
            const maxHeight = window.innerHeight * 0.9; // 90vh
            const minHeight = 100; // Close threshold

            // Update style directly for performance
            if (newHeight >= minHeight && newHeight <= maxHeight) {
                panelRef.current.style.height = `${newHeight}px`;
            }
        };

        const handleUp = () => {
            if (!dragInfo.current.isDragging) return;
            dragInfo.current.isDragging = false;

            // Check close threshold
            if (panelRef.current && panelRef.current.offsetHeight < 150) {
                onClose();
            }

            // Remove global listeners
            document.removeEventListener('mousemove', handleMove);
            document.removeEventListener('mouseup', handleUp);
            document.removeEventListener('touchmove', handleMove);
            document.removeEventListener('touchend', handleUp);
        };

        if (dragInfo.current.isDragging) {
            document.addEventListener('mousemove', handleMove, { passive: false });
            document.addEventListener('mouseup', handleUp);
            document.addEventListener('touchmove', handleMove, { passive: false });
            document.addEventListener('touchend', handleUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMove);
            document.removeEventListener('mouseup', handleUp);
            document.removeEventListener('touchmove', handleMove);
            document.removeEventListener('touchend', handleUp);
        };
    }, [onClose]);

    const startDrag = (e: React.MouseEvent | React.TouchEvent) => {
        // Prevent default only if needed, but allow interaction
        // e.preventDefault(); 
        if (!panelRef.current) return;

        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        dragInfo.current = {
            isDragging: true,
            startY: clientY,
            startHeight: panelRef.current.offsetHeight
        };

        // Attach listeners manually here to ensure instant response, 
        // though the useEffect handles the cleanup and persistent listeners
        const handleMove = (e: MouseEvent | TouchEvent) => {
            if (!dragInfo.current.isDragging || !panelRef.current) return;
            e.preventDefault(); // Prevent scrolling while dragging

            const currentY = 'touches' in e ? e.touches[0].clientY : e.clientY;
            const deltaY = dragInfo.current.startY - currentY;
            const newHeight = dragInfo.current.startHeight + deltaY;

            const maxHeight = window.innerHeight * 0.9;
            const minHeight = 100;

            if (newHeight > 0 && newHeight <= maxHeight) {
                panelRef.current.style.height = `${newHeight}px`;
            }
        };

        const handleUp = () => {
            dragInfo.current.isDragging = false;

            // Snap to close if too small
            if (panelRef.current && panelRef.current.offsetHeight < 200) {
                onClose();
            }

            document.removeEventListener('mousemove', handleMove);
            document.removeEventListener('mouseup', handleUp);
            document.removeEventListener('touchmove', handleMove);
            document.removeEventListener('touchend', handleUp);
        };

        document.addEventListener('mousemove', handleMove, { passive: false });
        document.addEventListener('mouseup', handleUp);
        document.addEventListener('touchmove', handleMove, { passive: false });
        document.addEventListener('touchend', handleUp);
    };

    const { captureSnapshot, setAvatarVisible } = useSnapshot();

    const handleCapture = async (e: React.MouseEvent, id: string, type: string) => {
        e.stopPropagation();

        // If capturing stage, hide avatar first
        if (type === 'stage') {
            setAvatarVisible(false);
            // Small delay to let React render the change
            await new Promise(resolve => setTimeout(resolve, 50));
        }

        const dataUrl = captureSnapshot();

        // Restore avatar visibility immediately
        if (type === 'stage') {
            setAvatarVisible(true);
        }

        if (dataUrl) {
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = `thumb_${type}_${id}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    if (!isOpen) return null;

    // Helper to calculate level from score (same as App.tsx)
    const currentLevel = calculateLevel(affectionPoints);

    const renderTabContent = () => {
        switch (activeTab) {
            case 'outfit':
                return (
                    <div className="grid grid-cols-3 gap-3 p-4">
                        {OUTFITS.map((item) => {
                            // Check lock status
                            let isLocked = item.isLocked;
                            if (item.minLevel && currentLevel < item.minLevel) {
                                isLocked = true;
                            }

                            return (
                                <button
                                    key={item.id}
                                    onClick={() => !isLocked && onSelectOutfit(item.id)}
                                    className={`customization-item flex-col gap-1 p-2 relative group ${selectedOutfit === item.id ? 'customization-item-selected' : ''
                                        } ${isLocked ? 'customization-item-locked' : ''}`}
                                    disabled={isLocked}
                                >
                                    {/* Capture Button (Dev Tool) */}
                                    {SHOW_DEV_TOOLS && (
                                        <div
                                            className="absolute top-1 right-1 p-1.5 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-ani-primary z-10"
                                            onClick={(e) => handleCapture(e, item.id, 'outfit')}
                                            title="Capture Thumbnail"
                                        >
                                            <Camera size={12} className="text-white" />
                                        </div>
                                    )}

                                    <div className="w-full aspect-square bg-white/5 rounded-lg flex items-center justify-center relative overflow-hidden">
                                        {isLocked ? (
                                            <div className="flex flex-col items-center gap-1 z-10">
                                                <Lock size={20} className="text-white/40" />
                                                <span className="text-[10px] text-white/40 text-center">
                                                    {item.unlockCondition}
                                                </span>
                                            </div>
                                        ) : (
                                            <>
                                                {item.thumbnail && (
                                                    <img
                                                        src={item.thumbnail}
                                                        alt={item.name}
                                                        className="w-full h-full object-cover absolute inset-0"
                                                        onError={(e) => {
                                                            e.currentTarget.style.display = 'none';
                                                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                                        }}
                                                    />
                                                )}
                                                <span className={`text-2xl ${item.thumbnail ? 'hidden' : ''}`}>
                                                    {activeTab === 'outfit' ? '👗' : activeTab === 'hair' ? '💇' : '🎭'}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                    <span className="text-xs text-white/60">{item.name}</span>
                                </button>
                            );
                        })}
                    </div>
                );

            case 'hair':
                return (
                    <div className="flex flex-col gap-6 p-4">
                        {/* Color swatches */}
                        <div className="flex flex-col gap-2">
                            <span className="text-xs text-white/40 uppercase tracking-wider font-medium">Hair Color (Coming Soon)</span>
                            <div className="flex gap-2 pb-2 overflow-x-auto no-scrollbar opacity-50 grayscale pointer-events-none select-none">
                                {HAIR_COLORS.map((color) => (
                                    <button
                                        key={color}
                                        disabled
                                        className={`w-8 h-8 rounded-full border-2 transition-all flex-none border-transparent`}
                                        style={{ backgroundColor: color }}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Hairstyles */}
                        <div className="grid grid-cols-3 gap-3">
                            {HAIRSTYLES.map((item) => {
                                const isLocked = item.isLocked; // Simplified since we removed minLevel for now

                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => !isLocked && onSelectHair(item.id)}
                                        disabled={isLocked}
                                        className={`customization-item flex-col gap-1 p-2 relative group ${selectedHair === item.id ? 'customization-item-selected' : ''
                                            } ${isLocked ? 'customization-item-locked' : ''}`}
                                    >
                                        {/* Capture Button (Dev Tool) */}
                                        {SHOW_DEV_TOOLS && (
                                            <div
                                                className="absolute top-1 right-1 p-1.5 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-ani-primary z-10"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleCapture(e, item.id, 'hair');
                                                }}
                                                title="Capture Thumbnail"
                                            >
                                                <Camera size={12} className="text-white" />
                                            </div>
                                        )}

                                        <div className="w-full aspect-square bg-white/5 rounded-lg flex items-center justify-center relative overflow-hidden">
                                            {isLocked ? (
                                                <div className="flex flex-col items-center gap-1 z-10">
                                                    <Lock size={20} className="text-white/40" />
                                                    <span className="text-[10px] text-white/40 text-center">
                                                        {item.unlockCondition}
                                                    </span>
                                                </div>
                                            ) : (
                                                <>
                                                    {item.thumbnail && (
                                                        <img
                                                            src={item.thumbnail}
                                                            alt={item.name}
                                                            className="w-full h-full object-cover absolute inset-0"
                                                            onError={(e) => {
                                                                e.currentTarget.style.display = 'none';
                                                                e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                                            }}
                                                        />
                                                    )}
                                                    <span className={`text-2xl ${item.thumbnail ? 'hidden' : ''}`}>
                                                        💇
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                        <span className="text-xs text-white/60">{item.name}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                );

            case 'stage':
                return (
                    <div className="grid grid-cols-3 gap-3 p-4">
                        {STAGES.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => onSelectStage(item.id)}
                                className={`customization-item flex-col gap-1 p-2 relative group ${selectedStage === item.id ? 'customization-item-selected' : ''
                                    }`}
                            >
                                {/* Capture Button (Dev Tool) */}
                                {SHOW_DEV_TOOLS && (
                                    <div
                                        className="absolute top-1 right-1 p-1.5 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-ani-primary z-10"
                                        onClick={(e) => handleCapture(e, item.id, 'stage')}
                                        title="Capture Thumbnail"
                                    >
                                        <Camera size={12} className="text-white" />
                                    </div>
                                )}
                                <div className="w-full aspect-square bg-white/5 rounded-lg flex items-center justify-center relative overflow-hidden">
                                    {item.thumbnail ? (
                                        <>
                                            <img
                                                src={item.thumbnail}
                                                alt={item.name}
                                                className="w-full h-full object-cover absolute inset-0"
                                                onError={(e) => {
                                                    e.currentTarget.style.display = 'none';
                                                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                                }}
                                            />
                                            <span className="text-2xl hidden">🎭</span>
                                        </>
                                    ) : (
                                        <span className="text-2xl">🎭</span>
                                    )}
                                </div>
                                <span className="text-xs text-white/60">{item.name}</span>
                            </button>
                        ))}
                    </div>
                );
        }
    };

    return (
        <div
            ref={panelRef}
            className="bottom-sheet animate-slide-in-bottom flex flex-col"
            style={{ height: '50vh', maxHeight: '90vh' }}
        >
            {/* Drag Handle Container - increased hit area, logic for resizing */}
            <div
                className="w-full h-8 flex items-center justify-center cursor-ns-resize flex-none"
                onMouseDown={startDrag}
                onTouchStart={startDrag}
            >
                <div className="bottom-sheet-handle pointer-events-none" />
            </div>

            {/* Header with Cancel/Done */}
            <div className="flex justify-between items-center px-6 pb-4 flex-none">
                <button
                    onClick={onClose}
                    className="glass-pill hover:bg-white/10"
                >
                    Cancel
                </button>
                <button
                    onClick={onClose}
                    className="glass-pill bg-white text-black hover:bg-white/90"
                >
                    Done
                </button>
            </div>

            {/* Tabs */}
            <div className="flex justify-center gap-6 border-b border-white/10 flex-none">
                {(['outfit', 'hair', 'stage'] as TabType[]).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`customization-tab ${activeTab === tab ? 'customization-tab-active' : ''
                            }`}
                    >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                ))}
            </div>

            {/* Tab Content - Grows to fill remaining space */}
            <div className="flex-1 overflow-y-auto min-h-0">
                {renderTabContent()}
            </div>
        </div>
    );
}
