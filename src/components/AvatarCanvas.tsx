import React, { useRef, Suspense, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Html } from '@react-three/drei';
import * as THREE from 'three';
import VRMModel from './VRMModel';
import Stage3D from './Stage3D';
import { Emotion, TriggeredAnimation } from '../types';
import { Viseme } from '../types';
import { useSnapshot } from '../contexts/SnapshotContext';

interface AvatarCanvasProps {
    vrmUrl?: string;
    emotion?: Emotion;
    mouthWeights?: Record<string, number>;
    isLoading?: boolean;
    onVRMLoad?: () => void;
    onError?: (error: string) => void;
    affectionLevel?: number;
    triggeredAnimation?: TriggeredAnimation;
    onAnimationComplete?: () => void;
    stage?: string;
}

// Camera controller for subtle movement
function CameraController() {
    const { camera } = useThree();
    const targetRef = useRef(new THREE.Vector3(0, 0.5, 0)); // Look at face/chest level
    const timeRef = useRef(0);

    useFrame((_, delta) => {
        timeRef.current += delta;

        // Subtle camera sway
        const swayX = Math.sin(timeRef.current * 0.2) * 0.02;
        const swayY = Math.cos(timeRef.current * 0.15) * 0.01;

        // Set all camera position axes explicitly - closer and higher
        camera.position.set(swayX, 0.5 + swayY, 2.0);
        camera.lookAt(targetRef.current);
    });

    return null;
}

// Snapshot handler to capture canvas
function SnapshotHandler() {
    const { gl } = useThree();
    const { registerCapture, isAvatarVisible } = useSnapshot();

    useEffect(() => {
        registerCapture(() => {
            return gl.domElement.toDataURL('image/png');
        });
    }, [gl, registerCapture]);

    return null;
}

// Loading screen
function LoadingScreen() {
    return (
        <Html center>
            <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 border-4 border-ani-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-white/80 font-cute text-lg">Loading Suki...</p>
            </div>
        </Html>
    );
}

export default function AvatarCanvas({
    vrmUrl,
    emotion = 'neutral',
    mouthWeights,
    isLoading = false,
    onVRMLoad,
    onError,
    affectionLevel = 0,
    triggeredAnimation = null,
    onAnimationComplete,
    stage = 'default',
}: AvatarCanvasProps) {
    const { isAvatarVisible } = useSnapshot();

    return (
        <div className="canvas-container w-full h-full relative">
            <Canvas
                camera={{
                    position: [0, 0.5, 2.0], // Match CameraController - closer portrait view
                    fov: 35,
                    near: 0.1,
                    far: 100,
                }}
                gl={{
                    antialias: true,
                    alpha: true,
                    powerPreference: 'high-performance',
                    preserveDrawingBuffer: true,
                }}
                dpr={[1, 2]}
            >
                {/* Lighting */}
                <ambientLight intensity={0.6} color="#ffe4f0" />
                {/* Frontal Face Light - Essential for anime look */}
                <directionalLight
                    position={[0, 0, 1]}
                    intensity={1.2}
                    color="#ffffff"
                    castShadow={false}
                />

                <directionalLight
                    position={[5, 5, 5]}
                    intensity={0.5}
                    color="#ffffff"
                    castShadow
                />
                <directionalLight
                    position={[-3, 3, -3]}
                    intensity={0.3}
                    color="#ffd4e5"
                />

                {/* Rim light for anime effect */}
                <pointLight
                    position={[0, 2, -2]}
                    intensity={0.5}
                    color="#ff9ff3"
                />

                {/* Environment for reflections */}
                <Environment preset="studio" />

                {/* Camera animation */}
                <CameraController />
                <SnapshotHandler />

                {/* Stage Effects */}
                <Stage3D stage={stage} />

                {/* Ground shadow */}
                <ContactShadows
                    position={[0, -0.9, 0]}
                    opacity={0.4}
                    scale={10}
                    blur={2.5}
                    far={4}
                    color="#2d1b3d"
                />

                {/* VRM Model */}
                <Suspense fallback={<LoadingScreen />}>
                    {vrmUrl && isAvatarVisible ? (
                        <VRMModel
                            url={vrmUrl}
                            emotion={emotion}
                            mouthWeights={mouthWeights}
                            onLoad={onVRMLoad}
                            onError={onError}
                            affectionLevel={affectionLevel}
                            triggeredAnimation={triggeredAnimation}
                            onAnimationComplete={onAnimationComplete}
                        />
                    ) : (
                        isAvatarVisible ? <LoadingScreen /> : null
                    )}
                </Suspense>

                {/* OrbitControls removed to use custom cinematic camera */}
            </Canvas>

            {/* Thinking indicator - subtle, doesn't block view */}
            {isLoading && (
                <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-10">
                    <div className="glass-card px-6 py-3 flex items-center gap-3">
                        <div className="w-5 h-5 border-2 border-ani-primary border-t-transparent rounded-full animate-spin" />
                        <p className="text-white/80 text-sm">Suki is thinking...</p>
                    </div>
                </div>
            )}
        </div>
    );
}
