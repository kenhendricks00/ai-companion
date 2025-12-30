import React, { useRef, useEffect, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { VRM, VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';
import { Emotion, TriggeredAnimation } from '../types';
import { EMOTION_TO_BLENDSHAPE, getEmotionIntensity } from '../lib/emotions';

interface VRMModelProps {
    url: string;
    emotion?: Emotion;
    mouthWeights?: Record<string, number>;
    onLoad?: () => void;
    onError?: (error: string) => void;
    affectionLevel?: number;
    triggeredAnimation?: TriggeredAnimation;
    onAnimationComplete?: () => void;
    yOffset?: number; // negative = move down, positive = up
}

export default function VRMModel({
    url,
    emotion = 'neutral',
    mouthWeights,
    onLoad,
    onError,
    affectionLevel = 0,
    triggeredAnimation = null,
    onAnimationComplete,
    yOffset = -0.75,
}: VRMModelProps) {
    const vrmRef = useRef<VRM | null>(null);
    const groupRef = useRef<THREE.Group>(null);
    const mixerRef = useRef<THREE.AnimationMixer | null>(null);
    const clockRef = useRef(new THREE.Clock());
    const loadedUrlRef = useRef<string | null>(null);

    // Animation state
    const breathPhaseRef = useRef(0);
    const swayPhaseRef = useRef(0);
    const blinkTimerRef = useRef(0); // used for microexpressions talk phase
    const lastEmotionRef = useRef<Emotion>('neutral');
    const emotionTransitionRef = useRef(0);
    const jumpPhaseRef = useRef(0);
    const spinPhaseRef = useRef(0);
    const bouncePhaseRef = useRef(0);
    const excitementBlendRef = useRef(0);
    const armPhaseRef = useRef(0);

    // Triggered animation state
    const triggeredAnimRef = useRef<TriggeredAnimation>(null);
    const triggeredProgressRef = useRef(0); // 0 to 1 progress
    const triggeredActiveRef = useRef(false);

    // Smoothed animation values for transitions
    const smoothedAnimRef = useRef({
        spinAngle: 0,
        jumpHeight: 0,
        armWave: 0,
        bow: 0,
        blowKiss: 0,
        hairFlip: 0,
        dance: 0,
        kneeBend: 0,
        spinJiggle: 0,
    });

    // Base pose capture to avoid drift and animate as offsets
    const basePoseRef = useRef<
        Record<string, { r: THREE.Euler; p: THREE.Vector3 }>
    >({});

    // Natural blink and gaze
    const blinkCooldownRef = useRef(THREE.MathUtils.randFloat(2.5, 5.0));
    const blinkPhaseRef = useRef(0);
    const blinkWeightRef = useRef(0);
    const isBlinkingRef = useRef(false);
    const lookTargetRef = useRef(new THREE.Vector2(0, 0));
    const lookCurrentRef = useRef(new THREE.Vector2(0, 0));
    const nextLookTimerRef = useRef(THREE.MathUtils.randFloat(0.8, 2.0));

    // Smoothed lip sync
    const smoothedMouthRef = useRef<Record<string, number>>({
        aa: 0,
        ee: 0,
        ih: 0,
        oh: 0,
        ou: 0,
    });

    // Helpers: damping
    const damp = THREE.MathUtils.damp;
    const dampAngle = (
        current: number,
        target: number,
        lambda: number,
        dt: number
    ) => {
        const twoPi = Math.PI * 2;
        const wrap = (a: number) =>
            THREE.MathUtils.euclideanModulo(a + Math.PI, twoPi) - Math.PI;
        const diff = wrap(target - current);
        const step = diff * (1 - Math.exp(-lambda * dt));
        return current + step;
    };

    const setEulerDamped = (
        bone: THREE.Object3D,
        target: { x?: number; y?: number; z?: number },
        lambda: number,
        dt: number
    ) => {
        const r = bone.rotation;
        if (target.x !== undefined) r.x = dampAngle(r.x, target.x, lambda, dt);
        if (target.y !== undefined) r.y = dampAngle(r.y, target.y, lambda, dt);
        if (target.z !== undefined) r.z = dampAngle(r.z, target.z, lambda, dt);
    };

    const captureBasePose = (vrm: VRM) => {
        const names = [
            'chest',
            'spine',
            'hips',
            'head',
            'leftUpperArm',
            'rightUpperArm',
            'leftLowerArm',
            'rightLowerArm',
            'leftUpperLeg',
            'rightUpperLeg',
            'leftLowerLeg',
            'rightLowerLeg',
        ] as const;

        basePoseRef.current = {};
        names.forEach((n) => {
            const b = vrm.humanoid?.getNormalizedBoneNode(n as any);
            if (b) {
                basePoseRef.current[n as string] = {
                    r: b.rotation.clone(),
                    p: b.position.clone(),
                };
            }
        });
    };

    // Load VRM model
    useEffect(() => {
        if (!url || url === loadedUrlRef.current) return;

        const loader = new GLTFLoader();
        loader.register((parser) => new VRMLoaderPlugin(parser));

        loader.load(
            url,
            (gltf) => {
                const vrm = gltf.userData.vrm as VRM;

                if (vrm) {
                    // Cleanup old model
                    if (vrmRef.current) {
                        VRMUtils.deepDispose(vrmRef.current.scene);
                        if (groupRef.current) {
                            groupRef.current.remove(vrmRef.current.scene);
                        }
                    }

                    // Setup new model
                    VRMUtils.removeUnnecessaryJoints(vrm.scene);
                    VRMUtils.removeUnnecessaryVertices(vrm.scene);

                    // Fix for missing face/meshes
                    vrm.scene.traverse((obj) => {
                        if ((obj as THREE.Mesh).isMesh) {
                            obj.frustumCulled = false;
                            (obj as THREE.Mesh).castShadow = true;
                            (obj as THREE.Mesh).receiveShadow = true;

                            const material = (obj as THREE.Mesh).material;
                            if (material) {
                                (material as THREE.Material).side = THREE.DoubleSide;
                                (material as THREE.Material).depthWrite = true;
                            }
                        }
                    });

                    // Initial placement (per-frame update will also apply yOffset)
                    vrm.scene.position.y = 0.3 + yOffset;

                    // A-pose
                    if (vrm.humanoid) {
                        const leftArm = vrm.humanoid.getNormalizedBoneNode(
                            'leftUpperArm'
                        );
                        const rightArm = vrm.humanoid.getNormalizedBoneNode(
                            'rightUpperArm'
                        );

                        if (leftArm) {
                            leftArm.rotation.z = -Math.PI / 2.5;
                            leftArm.rotation.y = 0.1;
                        }
                        if (rightArm) {
                            rightArm.rotation.z = Math.PI / 2.5;
                            rightArm.rotation.y = -0.1;
                        }
                    }

                    vrmRef.current = vrm;
                    loadedUrlRef.current = url;

                    if (groupRef.current) {
                        groupRef.current.add(vrm.scene);
                    }

                    mixerRef.current = new THREE.AnimationMixer(vrm.scene);

                    // Capture base pose after A-pose adjustments
                    captureBasePose(vrm);

                    onLoad?.();
                } else {
                    onError?.('Invalid VRM file');
                }
            },
            undefined,
            (error) => {
                onError?.(String(error));
            }
        );

        return () => {
            if (vrmRef.current) {
                VRMUtils.deepDispose(vrmRef.current.scene);
            }
        };
    }, [url, onLoad, onError, yOffset]);

    // Apply expression
    const applyExpression = useCallback(
        (targetEmotion: Emotion, weight: number) => {
            const vrm = vrmRef.current;
            if (!vrm?.expressionManager) return;

            const intensity =
                getEmotionIntensity(targetEmotion, affectionLevel) * weight;
            const blendshapes = EMOTION_TO_BLENDSHAPE[targetEmotion];

            for (const blendshape of blendshapes) {
                try {
                    vrm.expressionManager.setValue(blendshape, intensity);
                } catch (e) { }
            }
        },
        [affectionLevel]
    );

    // Animation frame
    useFrame((_, delta) => {
        const vrm = vrmRef.current;
        if (!vrm) return;

        // Update VRM
        vrm.update(delta);

        // === TRIGGERED ANIMATION HANDLING ===
        if (
            triggeredAnimation &&
            triggeredAnimation !== triggeredAnimRef.current &&
            !triggeredActiveRef.current
        ) {
            triggeredAnimRef.current = triggeredAnimation;
            triggeredProgressRef.current = 0;
            triggeredActiveRef.current = true;
        }

        // Process active triggered animation
        let triggeredSpinAngle = 0;
        let triggeredJumpHeight = 0;
        let triggeredArmWave = 0;
        let triggeredBow = 0;
        let triggeredBlowKiss = 0;
        let triggeredHairFlip = 0;
        let triggeredDance = 0;
        let triggeredKneeBend = 0;
        let triggeredSpinJiggle = 0;
        let triggeredExpressionOverride: string | null = null;
        let triggeredExpressionIntensity = 0;

        if (triggeredActiveRef.current && triggeredAnimRef.current) {
            const isLongAnim = triggeredAnimRef.current === 'dance' || triggeredAnimRef.current === 'spin' || triggeredAnimRef.current === 'twirl';
            const animSpeed = isLongAnim ? 0.8 : 1.2; // Slower for dance/spin
            triggeredProgressRef.current += delta * animSpeed;
            const progress = Math.min(triggeredProgressRef.current, 1);

            const easeInOut = (t: number) =>
                t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
            const easedProgress = easeInOut(progress);

            switch (triggeredAnimRef.current) {
                case 'spin':
                case 'twirl':
                    triggeredSpinAngle = easedProgress * Math.PI * 2;
                    triggeredJumpHeight = Math.sin(progress * Math.PI) * 0.08;
                    // Centrifugal jiggle: oscillates during spin to drive physics
                    triggeredSpinJiggle = Math.sin(progress * Math.PI * 4) * 0.08;
                    triggeredExpressionOverride = 'happy';
                    triggeredExpressionIntensity = 0.7;
                    break;
                case 'jump':
                    // Natural jump: deep knee bend for anticipation & landing
                    triggeredJumpHeight = Math.sin(progress * Math.PI) * 0.3;
                    // Knee bend: larger amplitude for visible squat
                    triggeredKneeBend = Math.pow(Math.cos(progress * Math.PI), 2) * 0.65;
                    // Eyes closed with excitement at peak of jump
                    triggeredExpressionOverride = 'excited';
                    triggeredExpressionIntensity = Math.sin(progress * Math.PI) * 0.9;
                    break;
                case 'wave':
                    // Natural wave: slower, enthusiastic motion
                    triggeredArmWave = Math.sin(progress * Math.PI * 3) * 0.6;
                    triggeredExpressionOverride = 'happy';
                    triggeredExpressionIntensity = 0.8;
                    break;
                case 'dance':
                    // Multi-layered dance: slower, more rhythmic swaying
                    triggeredSpinAngle = Math.sin(progress * Math.PI * 2) * 0.2;
                    triggeredJumpHeight = Math.abs(Math.sin(progress * Math.PI * 3)) * 0.06;
                    triggeredDance = Math.sin(progress * Math.PI * 3); // Slower rhythmic driver
                    triggeredExpressionOverride = 'happy';
                    triggeredExpressionIntensity = 0.8;
                    break;
                case 'bow':
                    triggeredBow = Math.sin(progress * Math.PI) * 0.4;
                    break;
                case 'blowkiss':
                    triggeredBlowKiss = easedProgress;
                    triggeredExpressionOverride = progress < 0.35 ? 'happy' : 'love';
                    triggeredExpressionIntensity = Math.sin(progress * Math.PI);
                    break;
                case 'hairflip':
                    triggeredHairFlip = Math.sin(progress * Math.PI);
                    triggeredExpressionOverride = 'happy';
                    triggeredExpressionIntensity = 0.5;
                    break;
                case 'pout':
                    triggeredExpressionOverride = 'pout';
                    triggeredExpressionIntensity = Math.sin(progress * Math.PI);
                    break;
                case 'wink':
                    triggeredExpressionOverride = 'wink';
                    triggeredExpressionIntensity = Math.sin(progress * Math.PI);
                    break;
                case 'blush':
                    triggeredExpressionOverride = 'blush';
                    triggeredExpressionIntensity = Math.sin(progress * Math.PI);
                    break;
                case 'surprise':
                    triggeredExpressionOverride = 'surprised';
                    triggeredExpressionIntensity = Math.sin(progress * Math.PI);
                    triggeredJumpHeight = Math.sin(progress * Math.PI) * 0.08;
                    // Quick startle jiggle for physics response (amplitude: 0.02, frequency: 4)
                    triggeredSpinJiggle = Math.sin(progress * Math.PI * 4) * 0.02 * (1 - progress);
                    break;
            }

            if (progress >= 1) {
                triggeredActiveRef.current = false;
                triggeredAnimRef.current = null;
                triggeredProgressRef.current = 0;
                onAnimationComplete?.();
            }
        }

        // Smooth all animation values for gradual transitions
        const smoothLambda = 12; // Higher = faster transition
        const sa = smoothedAnimRef.current;
        // Don't smooth spin angle - causes reverse rotation when going from 2π to 0
        if (triggeredSpinAngle === 0) sa.spinAngle = 0; // Reset immediately when done
        else sa.spinAngle = triggeredSpinAngle; // Use directly
        sa.jumpHeight = damp(sa.jumpHeight, triggeredJumpHeight, smoothLambda, delta);
        sa.armWave = damp(sa.armWave, triggeredArmWave, smoothLambda, delta);
        sa.bow = damp(sa.bow, triggeredBow, smoothLambda, delta);
        sa.blowKiss = damp(sa.blowKiss, triggeredBlowKiss, smoothLambda, delta);
        sa.hairFlip = damp(sa.hairFlip, triggeredHairFlip, smoothLambda, delta);
        sa.dance = damp(sa.dance, triggeredDance, smoothLambda, delta);
        sa.kneeBend = damp(sa.kneeBend, triggeredKneeBend, smoothLambda, delta);
        sa.spinJiggle = damp(sa.spinJiggle, triggeredSpinJiggle, smoothLambda, delta);

        // Use smoothed values for all animations
        triggeredSpinAngle = sa.spinAngle;
        triggeredJumpHeight = sa.jumpHeight;
        triggeredArmWave = sa.armWave;
        triggeredBow = sa.bow;
        triggeredBlowKiss = sa.blowKiss;
        triggeredHairFlip = sa.hairFlip;
        triggeredDance = sa.dance;
        triggeredKneeBend = sa.kneeBend;
        triggeredSpinJiggle = sa.spinJiggle;

        // Breathing animation - subtle chest/spine rotation
        breathPhaseRef.current += delta * 1.5;
        const breath = Math.sin(breathPhaseRef.current);
        const breathChestRot = breath * 0.025;
        const breathY = breath * 0.003;

        if (vrm.humanoid) {
            const chest = vrm.humanoid.getNormalizedBoneNode('chest');
            const spine = vrm.humanoid.getNormalizedBoneNode('spine');
            if (spine) {
                const baseSpineY = basePoseRef.current.spine?.p.y || spine.position.y;
                spine.position.y = baseSpineY + breathY;

                const targetBow =
                    triggeredBow > 0
                        ? triggeredBow
                        : basePoseRef.current.spine?.r.x || 0;
                setEulerDamped(spine, { x: targetBow }, 10, delta);
            }
        }

        // Emotion-based intensity
        const isExcited =
            emotion === 'excited' || emotion === 'happy' || emotion === 'love';
        const targetBlend = isExcited ? 1.0 : 0.0;
        excitementBlendRef.current +=
            (targetBlend - excitementBlendRef.current) * delta * 3.0;
        const blend = excitementBlendRef.current;

        // Jump animation
        jumpPhaseRef.current += delta * (4.0 * blend);
        const jumpHeight = Math.abs(Math.sin(jumpPhaseRef.current)) * 0.05 * blend;

        // Spin animation
        spinPhaseRef.current += delta * 0.5 * blend;
        const spinAngle = Math.sin(spinPhaseRef.current) * (0.1 * blend);

        // Chest bounce
        bouncePhaseRef.current += delta * (2 + 6 * blend);
        const chestBounce =
            Math.sin(bouncePhaseRef.current) * (0.005 + 0.025 * blend);

        // Ground compensation: lower scene when hips drop (squat/crouch) to keep feet planted
        const groundCompensation = (triggeredKneeBend * 0.12) + (chestBounce * 0.5);

        // Apply scene pose (now with yOffset and grounding)
        if (vrm.scene) {
            const baseY = 0.3 + yOffset;
            // Subtract groundCompensation to keep feet on floor during squats
            vrm.scene.position.y = baseY + jumpHeight + triggeredJumpHeight - groundCompensation;
            vrm.scene.rotation.y = spinAngle + triggeredSpinAngle;
        }

        // Body sway
        swayPhaseRef.current += delta * (0.8 + 1.2 * blend);
        const swayZ = Math.sin(swayPhaseRef.current) * (0.02 + 0.03 * blend);
        const swayX =
            Math.sin(swayPhaseRef.current * 0.7) * (0.01 + 0.02 * blend);

        if (vrm.humanoid) {
            const hips = vrm.humanoid.getNormalizedBoneNode('hips');
            if (hips) {
                const baseHip = basePoseRef.current.hips;
                const baseHipR = baseHip?.r || hips.rotation;
                const baseHipP = baseHip?.p || hips.position;

                // Rotational jiggle (Hip sway/tilt)
                setEulerDamped(
                    hips,
                    {
                        z: baseHipR.z + swayZ + triggeredDance * 0.18, // Amplified dance sway
                        x: baseHipR.x + swayX + (triggeredJumpHeight * 0.15) + (triggeredKneeBend * 0.2), // Forward tilt on crouch/jump
                    },
                    10,
                    delta
                );

                // Positional jiggle: Secondary translations to drive spring bones (hair, clothing)
                // Note: Scene Y handles grounding, so hip Y is for relative jiggle only
                const vertJiggle = chestBounce + (Math.abs(triggeredDance) * 0.04) + (Math.abs(triggeredSpinJiggle) * 0.15);
                const latJiggleX = (triggeredDance * 0.06) + (swayX * 0.3) + (triggeredKneeBend * 0.02) + triggeredSpinJiggle;

                hips.position.y = baseHipP.y + vertJiggle;
                hips.position.x = baseHipP.x + latJiggleX;
            }

            // Chest counter-sway and rhythmic bounce
            const chest = vrm.humanoid.getNormalizedBoneNode('chest');
            if (chest) {
                const baseChestR = basePoseRef.current.chest?.r || chest.rotation;
                const dynamicChestX = breathChestRot + (triggeredDance * 0.05) - (triggeredJumpHeight * 0.1);
                const counterSwayZ = -swayX * 0.4;

                setEulerDamped(
                    chest,
                    {
                        x: baseChestR.x + dynamicChestX,
                        z: baseChestR.z + counterSwayZ,
                    },
                    8,
                    delta
                );
            }

            // Head look around with hair flip additions
            const head = vrm.humanoid.getNormalizedBoneNode('head');
            if (head) {
                const headX = Math.sin(swayPhaseRef.current * 0.3) * 0.05;
                const headY = Math.sin(swayPhaseRef.current * 0.5) * 0.08;
                const addZ = triggeredHairFlip > 0 ? 0.3 * triggeredHairFlip : 0;
                const addY = triggeredHairFlip > 0 ? 0.2 * triggeredHairFlip : 0;
                setEulerDamped(
                    head,
                    {
                        x: (basePoseRef.current.head?.r.x || 0) + headX,
                        y: (basePoseRef.current.head?.r.y || 0) + headY + addY,
                        z: (basePoseRef.current.head?.r.z || 0) + addZ,
                    },
                    10,
                    delta
                );
            }

            // Arms
            const leftUpperArm =
                vrm.humanoid.getNormalizedBoneNode('leftUpperArm');
            const rightUpperArm =
                vrm.humanoid.getNormalizedBoneNode('rightUpperArm');
            const leftLowerArm =
                vrm.humanoid.getNormalizedBoneNode('leftLowerArm');
            const rightLowerArm =
                vrm.humanoid.getNormalizedBoneNode('rightLowerArm');

            const baseArmZLeft =
                basePoseRef.current.leftUpperArm?.r.z ?? -Math.PI / 2.5;
            const baseArmZRight =
                basePoseRef.current.rightUpperArm?.r.z ?? Math.PI / 2.5;

            const armSpeed = 1.5 + 4.5 * blend;
            armPhaseRef.current += delta * armSpeed;
            const armAnimAmount = 0.03 + 0.12 * blend;

            const armWave = Math.sin(armPhaseRef.current) * armAnimAmount;
            const armBounce =
                Math.abs(Math.sin(armPhaseRef.current * 2)) * (0.1 * blend);

            if (leftUpperArm) {
                setEulerDamped(
                    leftUpperArm,
                    {
                        z: baseArmZLeft + armWave + triggeredDance * 0.2, // Left arm swing
                        x: (basePoseRef.current.leftUpperArm?.r.x || 0) + armBounce,
                    },
                    12,
                    delta
                );
            }

            if (rightUpperArm) {
                let tZ = baseArmZRight - armWave;
                let tX =
                    (basePoseRef.current.rightUpperArm?.r.x || 0) + armBounce;
                let tY = basePoseRef.current.rightUpperArm?.r.y || 0;

                if (Math.abs(triggeredArmWave) > 0.01) {
                    // Wave: arm raised high, palm facing forward
                    tZ = 0.2 + (triggeredArmWave * 0.25); // Raised up, pivoting side-to-side
                    tX = -0.9; // Forward and up
                    tY = 0.5; // Palm facing outward (toward viewer)
                } else if (triggeredBlowKiss > 0) {
                    const pTotal = triggeredBlowKiss;
                    if (pTotal < 0.4) {
                        // Phase 1: Bring hand to mouth
                        const p = pTotal / 0.4;
                        tZ = baseArmZRight - p * 0.8; // Raise arm up
                        tX = -0.3 - p * 1.2; // Bring forward and across
                        tY = 0.5 * p; // Rotate inward toward face
                    } else if (pTotal < 0.6) {
                        // Phase 2: Hold at mouth (kiss)
                        tZ = baseArmZRight - 0.8;
                        tX = -1.5;
                        tY = 0.5;
                    } else {
                        // Phase 3: Extend outward (blow)
                        const p = (pTotal - 0.6) / 0.4;
                        tZ = baseArmZRight - 0.8 + p * 0.5; // Arm out
                        tX = -1.5 + p * 1.0; // Forward
                        tY = 0.5 - p * 0.3; // Open up
                    }
                } else if (triggeredHairFlip > 0) {
                    // Hair flip: raise arm up and back behind head
                    tZ = baseArmZRight - (Math.PI * 0.4 * triggeredHairFlip); // Raise up
                    tX = 0.3 * triggeredHairFlip; // Reach back behind head
                    tY = -0.4 * triggeredHairFlip; // Elbow outward
                } else if (triggeredDance !== 0) {
                    tZ = baseArmZRight - armWave + triggeredDance * 0.2; // Right arm swing
                    tX = (basePoseRef.current.rightUpperArm?.r.x || 0) + armBounce; // Keep bounce
                    tY = triggeredDance * 0.1; // Slight twist
                }

                setEulerDamped(rightUpperArm, { z: tZ, x: tX, y: tY }, 12, delta);
            }

            // Lower arm with delay
            const lowerArmWave =
                Math.sin(armPhaseRef.current - 0.3) * (0.02 + 0.18 * blend);
            if (leftLowerArm) {
                setEulerDamped(
                    leftLowerArm,
                    {
                        z: (basePoseRef.current.leftLowerArm?.r.z || 0) + lowerArmWave + triggeredDance * 0.1
                    },
                    14,
                    delta
                );
            }

            if (rightLowerArm) {
                if (Math.abs(triggeredArmWave) > 0.01) {
                    // Wave: forearm bent 90 degrees, wrist pivots for wave
                    setEulerDamped(
                        rightLowerArm,
                        {
                            z: -1.4, // 80 degree elbow bend
                            x: triggeredArmWave * 0.4, // Side-to-side wrist wave
                            y: -0.2 // Palm facing more toward body
                        },
                        14,
                        delta
                    );
                } else if (triggeredBlowKiss > 0) {
                    const pTotal = triggeredBlowKiss;
                    if (pTotal < 0.4) {
                        // Phase 1: Forearm bends tightly, hand to mouth
                        const p = pTotal / 0.4;
                        setEulerDamped(
                            rightLowerArm,
                            { z: -2.0 * p, y: -0.3 * p, x: 0.2 * p },
                            14,
                            delta
                        );
                    } else if (pTotal < 0.6) {
                        // Phase 2: Hold at mouth
                        setEulerDamped(rightLowerArm, { z: -2.0, y: -0.3, x: 0.2 }, 14, delta);
                    } else {
                        // Phase 3: Open up for blow
                        const p = (pTotal - 0.6) / 0.4;
                        setEulerDamped(
                            rightLowerArm,
                            { z: -2.0 + p * 1.5, y: -0.3 + p * 0.3, x: 0.2 - p * 0.2 },
                            14,
                            delta
                        );
                    }
                } else if (triggeredHairFlip > 0) {
                    // Hair flip: forearm bends tightly to reach back of head
                    setEulerDamped(
                        rightLowerArm,
                        {
                            z: -2.2 * triggeredHairFlip, // Tighter bend to reach head
                            x: -0.4 * triggeredHairFlip, // Wrist angle
                        },
                        14,
                        delta
                    );
                } else {
                    setEulerDamped(
                        rightLowerArm,
                        {
                            z:
                                (basePoseRef.current.rightLowerArm?.r.z || 0) -
                                lowerArmWave + triggeredDance * 0.1,
                        },
                        14,
                        delta
                    );
                }
            }

            // Legs
            const leftUpperLeg =
                vrm.humanoid.getNormalizedBoneNode('leftUpperLeg');
            const rightUpperLeg =
                vrm.humanoid.getNormalizedBoneNode('rightUpperLeg');
            const leftLowerLeg =
                vrm.humanoid.getNormalizedBoneNode('leftLowerLeg');
            const rightLowerLeg =
                vrm.humanoid.getNormalizedBoneNode('rightLowerLeg');

            const legKick = Math.sin(jumpPhaseRef.current * 2) * (0.2 * blend);
            const idleKneeBend =
                Math.abs(Math.sin(jumpPhaseRef.current)) * (0.3 * blend);

            // Total knee/hip bend including jump anticipation/landing
            const totalKneeX = idleKneeBend + (triggeredKneeBend * 1.2); // Amplified for visible squat

            if (leftUpperLeg)
                setEulerDamped(
                    leftUpperLeg,
                    { x: (basePoseRef.current.leftUpperLeg?.r.x || 0) + legKick + (triggeredKneeBend * 0.7) },
                    10,
                    delta
                );
            if (rightUpperLeg)
                setEulerDamped(
                    rightUpperLeg,
                    { x: (basePoseRef.current.rightUpperLeg?.r.x || 0) - legKick + (triggeredKneeBend * 0.7) },
                    10,
                    delta
                );
            if (leftLowerLeg)
                setEulerDamped(
                    leftLowerLeg,
                    { x: (basePoseRef.current.leftLowerLeg?.r.x || 0) + totalKneeX },
                    12,
                    delta
                );
            if (rightLowerLeg)
                setEulerDamped(
                    rightLowerLeg,
                    { x: (basePoseRef.current.rightLowerLeg?.r.x || 0) + totalKneeX },
                    12,
                    delta
                );
        }

        // Timers for microexpressions
        blinkTimerRef.current += delta;

        // Speaking detection
        const isSpeaking =
            mouthWeights && Object.values(mouthWeights).some((w) => w > 0.1);

        if (vrm.expressionManager) {
            // Natural blink
            const winkActive =
                triggeredExpressionOverride === 'wink' &&
                triggeredExpressionIntensity > 0;

            if (!winkActive) {
                blinkCooldownRef.current -= delta * (isSpeaking ? 1.5 : 1.0);
                if (!isBlinkingRef.current && blinkCooldownRef.current <= 0) {
                    isBlinkingRef.current = true;
                    blinkPhaseRef.current = 0;
                }
                if (isBlinkingRef.current) {
                    blinkPhaseRef.current += delta / 0.12; // ~120ms
                    const ph = THREE.MathUtils.clamp(blinkPhaseRef.current, 0, 1);
                    const w = Math.sin(ph * Math.PI); // 0->1->0
                    blinkWeightRef.current = w;
                    if (blinkPhaseRef.current >= 1) {
                        isBlinkingRef.current = false;
                        blinkCooldownRef.current = THREE.MathUtils.randFloat(2.5, 5.5);
                    }
                } else {
                    blinkWeightRef.current = damp(
                        blinkWeightRef.current,
                        0,
                        12,
                        delta
                    );
                }
                try {
                    vrm.expressionManager.setValue('blink', blinkWeightRef.current);
                } catch (e) { }
            }

            // Talking microexpressions
            if (isSpeaking) {
                const talkPhase = blinkTimerRef.current * 2;

                const browRaise = Math.sin(talkPhase * 1.5) * 0.15 + 0.1;
                const browFurrow = Math.max(
                    0,
                    Math.sin(talkPhase * 0.8 + 1) * 0.1
                );
                try {
                    vrm.expressionManager.setValue('browInnerUp', browRaise);
                } catch (e) { }
                try {
                    vrm.expressionManager.setValue('browDown', browFurrow);
                } catch (e) { }

                const eyeSquint = Math.abs(Math.sin(talkPhase * 1.2)) * 0.15;
                try {
                    vrm.expressionManager.setValue('eyeSquintLeft', eyeSquint);
                    vrm.expressionManager.setValue('eyeSquintRight', eyeSquint);
                } catch (e) { }

                const smileVariation = Math.sin(talkPhase * 0.7) * 0.1 + 0.15;
                try {
                    vrm.expressionManager.setValue(
                        'happy',
                        smileVariation * emotionTransitionRef.current
                    );
                } catch (e) { }
            }

            // Eye saccades
            nextLookTimerRef.current -=
                delta / (0.7 + excitementBlendRef.current * 0.6);
            if (nextLookTimerRef.current <= 0) {
                const ampX = 0.3 + 0.1 * excitementBlendRef.current;
                const ampY = 0.2 + 0.08 * excitementBlendRef.current;
                lookTargetRef.current.set(
                    THREE.MathUtils.randFloatSpread(ampX * 2),
                    THREE.MathUtils.randFloatSpread(ampY * 2)
                );
                nextLookTimerRef.current = THREE.MathUtils.randFloat(0.8, 1.6);
            }
            lookCurrentRef.current.x = damp(
                lookCurrentRef.current.x,
                lookTargetRef.current.x,
                6,
                delta
            );
            lookCurrentRef.current.y = damp(
                lookCurrentRef.current.y,
                lookTargetRef.current.y,
                6,
                delta
            );

            try {
                const lx = lookCurrentRef.current.x;
                const ly = lookCurrentRef.current.y;
                vrm.expressionManager.setValue('lookLeft', Math.max(0, lx));
                vrm.expressionManager.setValue('lookRight', Math.max(0, -lx));
                vrm.expressionManager.setValue('lookUp', Math.max(0, ly));
                vrm.expressionManager.setValue('lookDown', Math.max(0, -ly));
            } catch (e) { }
        }

        // Emotion transition
        if (emotion !== lastEmotionRef.current) {
            emotionTransitionRef.current = 0;
            lastEmotionRef.current = emotion;
        }
        emotionTransitionRef.current = Math.min(
            1,
            emotionTransitionRef.current + delta * 3
        );

        // Reset certain expressions each frame (before applying active ones)
        if (vrm.expressionManager) {
            const resetExpressions = [
                'sad',
                'angry',
                'surprised',
                'relaxed',
                'neutral',
                'blinkLeft',
                'blinkRight',
                'blink',
                'happy',
                'pout',
                'blush',
            ];
            for (const expr of resetExpressions) {
                try {
                    vrm.expressionManager.setValue(expr, 0);
                } catch (e) { }
            }
        }

        // Apply triggered or current emotion
        if (
            triggeredExpressionOverride &&
            triggeredExpressionIntensity > 0 &&
            vrm.expressionManager
        ) {
            if (triggeredExpressionOverride === 'wink') {
                try {
                    vrm.expressionManager.setValue(
                        'blinkLeft',
                        triggeredExpressionIntensity
                    );
                    vrm.expressionManager.setValue('blinkRight', 0);
                } catch (e) {
                    vrm.expressionManager.setValue(
                        'blink',
                        triggeredExpressionIntensity * 0.5
                    );
                }
                applyExpression('happy', triggeredExpressionIntensity * 0.6);
            } else if (triggeredExpressionOverride === 'pout') {
                applyExpression('pout', triggeredExpressionIntensity);
            } else if (triggeredExpressionOverride === 'blush') {
                applyExpression('blush', triggeredExpressionIntensity);
            } else if (triggeredExpressionOverride === 'surprised') {
                applyExpression('surprised', triggeredExpressionIntensity);
            } else if (triggeredExpressionOverride === 'excited') {
                // Happy with eyes closed for excitement
                applyExpression('happy', triggeredExpressionIntensity);
                try {
                    vrm.expressionManager.setValue('blink', triggeredExpressionIntensity * 0.8);
                } catch (e) { }
            } else {
                applyExpression(
                    triggeredExpressionOverride as any,
                    triggeredExpressionIntensity
                );
            }
        } else {
            applyExpression(emotion, emotionTransitionRef.current);
        }

        // Smoothed lip sync with coarticulation (top-2)
        if (mouthWeights && vrm.expressionManager) {
            const mouthShapes = ['aa', 'ee', 'ih', 'oh', 'ou'] as const;
            const current = smoothedMouthRef.current;

            for (const shape of mouthShapes) {
                const target = mouthWeights[shape] || 0;
                current[shape] = damp(current[shape], target, 15, delta);
            }

            const sorted = mouthShapes
                .map((s) => [s, current[s]] as const)
                .sort((a, b) => b[1] - a[1]);
            const active = new Set(sorted.slice(0, 2).map(([s]) => s));

            for (const shape of mouthShapes) {
                const val = active.has(shape)
                    ? current[shape]
                    : damp(current[shape], 0, 20, delta);
                try {
                    vrm.expressionManager.setValue(shape, val);
                } catch (e) { }
                current[shape] = val;
            }
        }

        if (mixerRef.current) {
            mixerRef.current.update(delta);
        }
    });

    return <group ref={groupRef} />;
}