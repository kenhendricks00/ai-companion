import { useState, useEffect, useCallback, useRef } from 'react';
import { VRM, VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';
import { Emotion } from '../types';
import { EMOTION_TO_BLENDSHAPE, getEmotionIntensity } from '../lib/emotions';

export function useVRM(affectionLevel: number = 0) {
    const [vrm, setVRM] = useState<VRM | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentEmotion, setCurrentEmotion] = useState<Emotion>('neutral');

    const animationMixerRef = useRef<THREE.AnimationMixer | null>(null);
    const clockRef = useRef(new THREE.Clock());

    // Load VRM model
    const loadVRM = useCallback(async (url: string) => {
        setIsLoading(true);
        setError(null);

        try {
            const loader = new GLTFLoader();
            loader.register((parser) => new VRMLoaderPlugin(parser));

            const gltf = await loader.loadAsync(url);
            const loadedVRM = gltf.userData.vrm as VRM;

            if (!loadedVRM) {
                throw new Error('Failed to load VRM from file');
            }

            // Optimize the VRM
            VRMUtils.removeUnnecessaryJoints(loadedVRM.scene);
            VRMUtils.removeUnnecessaryVertices(loadedVRM.scene);

            // Rotate to face camera
            loadedVRM.scene.rotation.y = Math.PI;

            setVRM(loadedVRM);
            animationMixerRef.current = new THREE.AnimationMixer(loadedVRM.scene);

            return loadedVRM;
        } catch (e) {
            setError(String(e));
            return null;
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Set expression/emotion
    const setExpression = useCallback((emotion: Emotion, instant: boolean = false) => {
        if (!vrm) return;

        setCurrentEmotion(emotion);
        const intensity = getEmotionIntensity(emotion, affectionLevel);
        const blendshapes = EMOTION_TO_BLENDSHAPE[emotion];

        // Reset all expressions first
        if (vrm.expressionManager) {
            const expressionNames = vrm.expressionManager.expressions.map(e => e.expressionName);
            for (const name of expressionNames) {
                if (name) {
                    vrm.expressionManager.setValue(name, 0);
                }
            }

            // Set target expressions
            for (const blendshape of blendshapes) {
                try {
                    vrm.expressionManager.setValue(blendshape, intensity);
                } catch (e) {
                    // Expression might not exist on this model
                }
            }
        }
    }, [vrm, affectionLevel]);

    // Set mouth shape for lip sync
    const setMouthShape = useCallback((weights: Record<string, number>) => {
        if (!vrm || !vrm.expressionManager) return;

        // VRM standard mouth shapes
        const mouthShapes = ['aa', 'ee', 'ih', 'oh', 'ou'];

        for (const shape of mouthShapes) {
            const weight = weights[shape] || 0;
            try {
                vrm.expressionManager.setValue(shape, weight);
            } catch (e) {
                // Shape might not exist
            }
        }
    }, [vrm]);

    // Blink animation
    const blink = useCallback(() => {
        if (!vrm || !vrm.expressionManager) return;

        // Quick blink
        vrm.expressionManager.setValue('blink', 1);
        setTimeout(() => {
            vrm.expressionManager?.setValue('blink', 0);
        }, 150);
    }, [vrm]);

    // Update loop for VRM
    const update = useCallback((delta: number) => {
        if (!vrm) return;

        // Update VRM
        vrm.update(delta);

        // Update animation mixer
        if (animationMixerRef.current) {
            animationMixerRef.current.update(delta);
        }
    }, [vrm]);

    // Random blink interval
    useEffect(() => {
        if (!vrm) return;

        const blinkInterval = setInterval(() => {
            // Random chance to blink
            if (Math.random() < 0.3) {
                blink();
            }
        }, 2000);

        return () => clearInterval(blinkInterval);
    }, [vrm, blink]);

    // Cleanup
    useEffect(() => {
        return () => {
            if (vrm) {
                VRMUtils.deepDispose(vrm.scene);
            }
        };
    }, [vrm]);

    return {
        vrm,
        isLoading,
        error,
        currentEmotion,
        loadVRM,
        setExpression,
        setMouthShape,
        blink,
        update,
    };
}
