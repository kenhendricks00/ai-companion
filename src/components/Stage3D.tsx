import React, { useRef, useMemo } from 'react';
import { Grid, Environment, Float, Sparkles, Stars, Instance, Instances, GradientTexture } from '@react-three/drei';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface Stage3DProps {
    stage: string;
}

// Custom Halftone Background
function HalftoneEffect() {
    const meshRef = useRef<THREE.Mesh>(null);
    const materialRef = useRef<THREE.ShaderMaterial>(null);

    useFrame((state) => {
        if (materialRef.current) {
            materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
        }
    });

    const uniforms = useMemo(() => ({
        uTime: { value: 0 },
        uColor: { value: new THREE.Color('#ff00ff') }, // Hot Magenta
        uBgColor: { value: new THREE.Color('#000000') }
    }), []);

    const vertexShader = `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `;

    const fragmentShader = `
        uniform float uTime;
        uniform vec3 uColor;
        uniform vec3 uBgColor;
        varying vec2 vUv;

        void main() {
            // Resolution - Adjusted for 6x4 aspect ratio to ensure circles
            float resY = 30.0; 
            float resX = resY * 1.5; // Matches mesh scale of 6:4
            
            vec2 grid = fract(vUv * vec2(resX, resY));
            vec2 id = floor(vUv * vec2(resX, resY));
            
            float d = distance(grid, vec2(0.5));
            
            // Calculate size based on distance from center X (vertical band)
            float distFromCenterX = abs(vUv.x - 0.5) * 2.2;
            float distFromCenterY = abs(vUv.y - 0.5) * 1.2;
            
            // Falloff for dot size
            float sizeFalloff = 1.0 - (distFromCenterX + distFromCenterY * 0.5);
            sizeFalloff = clamp(sizeFalloff, 0.0, 1.0);
            sizeFalloff = pow(sizeFalloff, 2.5); // Sharpen the band
            
            // Vertical flowing wave (moving up)
            float flow = sin((id.y * 0.5) - (uTime * 3.0)); 
            float flow2 = sin((id.y * 1.5) - (uTime * 5.0) + (id.x * 0.5));
            
            // Combine flows
            float pattern = (flow + flow2 * 0.5) * 0.5 + 0.5;
            
            float size = 0.45 * sizeFalloff * (0.6 + pattern * 0.4);
            
            // Draw dot
            float dot = 1.0 - smoothstep(size - 0.05, size + 0.05, d);
            
            vec3 finalColor = mix(uBgColor, uColor, dot);
            
            // Final opacity falloff
            float alpha = dot * sizeFalloff;
            
            gl_FragColor = vec4(finalColor, alpha);
        }
    `;

    return (
        <mesh ref={meshRef} position={[0, 1, -2.5]} scale={[6, 4, 1]}>
            <planeGeometry />
            <shaderMaterial
                ref={materialRef}
                vertexShader={vertexShader}
                fragmentShader={fragmentShader}
                uniforms={uniforms}
                transparent
                depthWrite={false}
            />
        </mesh>
    );
}

// Tunnel Grid Effect
function TunnelGridEffect() {
    const groupRef = useRef<THREE.Group>(null);
    const count = 15;
    const spacing = 2.5;
    const totalDist = count * spacing;

    useFrame((state) => {
        if (groupRef.current) {
            const t = state.clock.elapsedTime;

            // Continuous spin
            groupRef.current.rotation.z = t * 0.1;

            const tMove = t * 1.2;

            groupRef.current.children.forEach((child, i) => {
                // Initial Z based on index
                let z = -i * spacing;
                // Add movement
                z += (tMove % totalDist);
                // Wrap around to start of tunnel
                if (z > 2.5) z -= totalDist;

                child.position.z = z;

                // Scale based on distance to look like a tunnel
                // Farthest squares are smallest, closest are largest
                const dist = Math.abs(z);
                const scale = 1 + dist * 0.15;
                child.scale.set(scale, scale, 1);

                // Fade out as they get too close to camera or too far into fog
                const opacity = THREE.MathUtils.smoothstep(z, -totalDist + 5, -totalDist + 15) *
                    (1 - THREE.MathUtils.smoothstep(z, 0, 2.5));

                child.traverse((node: any) => {
                    if (node.isMesh && node.material.transparent) {
                        node.material.opacity = node.material.userData.baseOpacity * opacity;
                    }
                });
            });
        }
    });

    const squares = useMemo(() => {
        return Array.from({ length: count }).map((_, i) => {
            // Alternate between Diamond (45deg) and Box (0deg/90deg)
            const rotation = i % 2 === 0 ? Math.PI / 4 : 0;

            return (
                <group key={i} rotation={[0, 0, rotation]}>
                    {/* Main Square Wireframe */}
                    <mesh>
                        <torusGeometry args={[2.0, 0.012, 4, 4]} />
                        <meshBasicMaterial color="#ffffff" toneMapped={false} />
                    </mesh>
                    {/* Inner Glow Square */}
                    <mesh>
                        <torusGeometry args={[2.0, 0.045, 4, 4]} />
                        <meshBasicMaterial
                            color="#ff00ff"
                            transparent
                            opacity={0.12}
                            userData={{ baseOpacity: 0.12 }}
                        />
                    </mesh>
                    {/* Outer Edge Glow */}
                    <mesh position={[0, 0, -0.05]}>
                        <torusGeometry args={[2.05, 0.01, 4, 4]} />
                        <meshBasicMaterial
                            color="#ffffff"
                            transparent
                            opacity={0.25}
                            userData={{ baseOpacity: 0.25 }}
                        />
                    </mesh>
                </group>
            );
        });
    }, []);

    return (
        <group>
            <group ref={groupRef}>
                {squares}
            </group>
            {/* Background fog to hide end of tunnel */}
            <mesh position={[0, 0, -35]}>
                <planeGeometry args={[100, 100]} />
                <meshBasicMaterial color="#000000" />
            </mesh>
        </group>
    );
}

// Wave Grid Effect (Cyber Landscape)
function WaveGridEffect() {
    const meshRef = useRef<THREE.Points>(null);

    const { vertexShader, fragmentShader, uniforms } = useMemo(() => {
        return {
            uniforms: {
                uTime: { value: 0 },
                uColor: { value: new THREE.Color('#0066ff') },
            },
            vertexShader: `
                uniform float uTime;
                varying float vElevation;
                varying vec2 vUv;

                void main() {
                    vUv = uv;
                    vec4 modelPosition = modelMatrix * vec4(position, 1.0);

                    // Wave displacement
                    float elevation = sin(modelPosition.x * 0.3 + uTime) * 0.5;
                    elevation += sin(modelPosition.z * 0.2 + uTime * 0.8) * 0.4;
                    
                    modelPosition.y += elevation;
                    vElevation = elevation;

                    vec4 viewPosition = viewMatrix * modelPosition;
                    vec4 projectionPosition = projectionMatrix * viewPosition;
                    gl_Position = projectionPosition;

                    // Point size based on distance
                    gl_PointSize = 2.0 * (10.0 / -viewPosition.z);
                }
            `,
            fragmentShader: `
                uniform vec3 uColor;
                varying float vElevation;
                varying vec2 vUv;

                void main() {
                    float mask = distance(gl_PointCoord, vec2(0.5));
                    if(mask > 0.5) discard;

                    vec3 color = mix(uColor, vec3(1.0), vElevation * 0.5 + 0.5);
                    gl_FragColor = vec4(color, 1.0);
                }
            `
        };
    }, []);

    useFrame((state) => {
        if (meshRef.current) {
            (meshRef.current.material as THREE.ShaderMaterial).uniforms.uTime.value = state.clock.elapsedTime;
        }
    });

    return (
        <points ref={meshRef} rotation={[-Math.PI * 0.4, 0, 0]} position={[0, -1.5, -5]}>
            <planeGeometry args={[30, 30, 100, 100]} />
            <shaderMaterial
                vertexShader={vertexShader}
                fragmentShader={fragmentShader}
                uniforms={uniforms}
                transparent
            />
        </points>
    );
}

// Moving Grid Component for animation
function MovingGrid({ sectionColor, cellColor, speed = 1, ...props }: any) {
    const gridRef = useRef<any>(null);
    useFrame((state) => {
        if (gridRef.current) {
            // Move grid by adjusting position or custom uniform if possible, 
            // but for simple movement we'll just offset the position and wrap it
            gridRef.current.position.z = (state.clock.elapsedTime * speed) % 1;
        }
    });
    return <Grid ref={gridRef} {...props} sectionColor={sectionColor} cellColor={cellColor} infiniteGrid />;
}

// Default Stage (Mimics vibrant purple gradient from user request)
function DefaultStage() {
    return (
        <mesh position={[0, 0.5, -20]} scale={[250, 150, 1]}>
            <planeGeometry />
            <meshBasicMaterial depthWrite={false}>
                <GradientTexture
                    stops={[0, 0.3, 0.5, 0.7, 1]}
                    colors={['#020104', '#120516', '#350a3d', '#120516', '#020104']}
                    size={1024}
                />
            </meshBasicMaterial>
        </mesh>
    );
}

export default function Stage3D({ stage }: Stage3DProps) {
    return (
        <group>
            {/* Common background for all stages - ensures consistency and capture support */}
            <color attach="background" args={['#020104']} />
            <DefaultStage />

            {/* Stage-specific effects */}
            {stage === 'grid' && (
                <group>
                    <WaveGridEffect />
                    <Stars radius={100} depth={50} count={2000} factor={4} saturation={0} fade speed={1} />
                    <Environment preset="city" />
                </group>
            )}

            {stage === 'neon' && (
                <group>
                    <MovingGrid
                        speed={1.2}
                        fadeDistance={30}
                        sectionColor="#ff00ff"
                        cellColor="#00ffff"
                        position={[0, -0.9, 0]}
                    />
                    <Sparkles count={50} scale={10} size={2} speed={0.4} opacity={0.5} />
                    <Environment preset="night" />
                </group>
            )}

            {stage === 'halftone' && (
                <group>
                    <HalftoneEffect />
                    <Environment preset="studio" />
                </group>
            )}

            {stage === 'tunnelgrid' && (
                <group>
                    <TunnelGridEffect />
                    <Environment preset="city" />
                </group>
            )}

            {stage === 'default' && (
                <group>
                    <Environment preset="studio" />
                </group>
            )}
        </group>
    );
}
