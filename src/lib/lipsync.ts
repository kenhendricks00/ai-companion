import { Viseme } from '../types';

// Phoneme to viseme mapping (simplified)
const PHONEME_TO_VISEME: Record<string, Viseme> = {
    // Vowels
    'a': 'aa',
    'e': 'ee',
    'i': 'ih',
    'o': 'oh',
    'u': 'ou',
    // Consonants that show mouth movement
    'b': 'aa',
    'm': 'aa',
    'p': 'aa',
    'f': 'ih',
    'v': 'ih',
    'th': 'ih',
    's': 'ee',
    'z': 'ee',
    'sh': 'ou',
    'ch': 'ee',
    'j': 'ee',
    'l': 'oh',
    'r': 'oh',
    'w': 'ou',
    'y': 'ee',
    'n': 'aa',
    'd': 'aa',
    't': 'aa',
    'k': 'oh',
    'g': 'oh',
};

// Simple text to viseme sequence generator
export function textToVisemes(text: string, durationMs: number): Array<{ viseme: Viseme; time: number }> {
    const visemes: Array<{ viseme: Viseme; time: number }> = [];
    const cleanText = text.toLowerCase().replace(/[^a-z\s]/g, '');
    const words = cleanText.split(/\s+/).filter(w => w.length > 0);

    if (words.length === 0) return visemes;

    const timePerWord = durationMs / words.length;
    let currentTime = 0;

    for (const word of words) {
        const vowels = word.match(/[aeiou]/g) || ['a'];
        const timePerVowel = timePerWord / vowels.length;

        for (const vowel of vowels) {
            const viseme = PHONEME_TO_VISEME[vowel] || 'aa';
            visemes.push({ viseme, time: currentTime });
            currentTime += timePerVowel * 0.3; // Mouth open
            visemes.push({ viseme: 'sil', time: currentTime });
            currentTime += timePerVowel * 0.7; // Between syllables
        }
    }

    // End with silence
    visemes.push({ viseme: 'sil', time: durationMs });

    return visemes;
}

// VRM mouth blendshape weights for each viseme
export const VISEME_BLENDSHAPES: Record<Viseme, Record<string, number>> = {
    aa: { aa: 0.8, oh: 0.2 },
    ee: { ee: 0.9, ih: 0.1 },
    ih: { ih: 0.7, ee: 0.3 },
    oh: { oh: 0.8, ou: 0.2 },
    ou: { ou: 0.9, oh: 0.1 },
    sil: { aa: 0, ee: 0, ih: 0, oh: 0, ou: 0 },
};

// Lip sync controller class
export class LipSyncController {
    private visemeSequence: Array<{ viseme: Viseme; time: number }> = [];
    private startTime: number = 0;
    private isPlaying: boolean = false;
    private onVisemeChange?: (viseme: Viseme, weights: Record<string, number>) => void;
    private animationFrame?: number;

    constructor(onVisemeChange?: (viseme: Viseme, weights: Record<string, number>) => void) {
        this.onVisemeChange = onVisemeChange;
    }

    start(text: string, durationMs: number) {
        this.visemeSequence = textToVisemes(text, durationMs);
        this.startTime = performance.now();
        this.isPlaying = true;
        this.animate();
    }

    stop() {
        this.isPlaying = false;
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        this.onVisemeChange?.('sil', VISEME_BLENDSHAPES['sil']);
    }

    private animate = () => {
        if (!this.isPlaying) return;

        const elapsed = performance.now() - this.startTime;

        // Find current viseme
        let currentViseme: Viseme = 'sil';
        for (let i = 0; i < this.visemeSequence.length; i++) {
            if (this.visemeSequence[i].time <= elapsed) {
                currentViseme = this.visemeSequence[i].viseme;
            } else {
                break;
            }
        }

        this.onVisemeChange?.(currentViseme, VISEME_BLENDSHAPES[currentViseme]);

        // Check if done
        const lastViseme = this.visemeSequence[this.visemeSequence.length - 1];
        if (lastViseme && elapsed >= lastViseme.time) {
            this.stop();
            return;
        }

        this.animationFrame = requestAnimationFrame(this.animate);
    };

    destroy() {
        this.stop();
    }
}
