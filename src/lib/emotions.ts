import { Emotion } from '../types';

// Emotion patterns to detect in AI responses
const EMOTION_PATTERNS: Record<Emotion, RegExp[]> = {
    happy: [/\[happy\]/gi, /\[joy\]/gi, /😊|😄|😃|🥰|✨/g],
    sad: [/\[sad\]/gi, /\[crying\]/gi, /😢|😭|🥺/g],
    angry: [/\[angry\]/gi, /\[mad\]/gi, /😠|😤|💢/g],
    surprised: [/\[surprised\]/gi, /\[shocked\]/gi, /😲|😱|!!/g],
    blush: [/\[blush\]/gi, /\[embarrassed\]/gi, /😳|💕|\/\/\/\//g],
    excited: [/\[excited\]/gi, /\[thrilled\]/gi, /🎉|✨|💫/g],
    pout: [/\[pout\]/gi, /\[hmph\]/gi, /😤|😾/g],
    love: [/\[love\]/gi, /\[heart\]/gi, /💗|💕|♡|💓|😍/g],
    thinking: [/\[thinking\]/gi, /\[hmm\]/gi, /🤔|💭/g],
    neutral: [],
};

// Map emotion to VRM blendshape names
export const EMOTION_TO_BLENDSHAPE: Record<Emotion, string[]> = {
    neutral: ['neutral'],
    happy: ['happy', 'joy'],
    sad: ['sad', 'sorrow'],
    angry: ['angry'],
    surprised: ['surprised'],
    blush: ['relaxed', 'happy'], // Blush is usually a texture change + slight smile
    excited: ['happy', 'aa'], // Open mouth excitement
    pout: ['angry', 'ou'], // Pout lips
    love: ['relaxed', 'happy'], // Dreamy look
    thinking: ['neutral'], // Usually just eye movement
};

// Detect primary emotion from text
export function detectEmotion(text: string): Emotion {
    const emotionScores: Record<Emotion, number> = {
        neutral: 0,
        happy: 0,
        sad: 0,
        angry: 0,
        surprised: 0,
        blush: 0,
        excited: 0,
        pout: 0,
        love: 0,
        thinking: 0,
    };

    // Check each pattern
    for (const [emotion, patterns] of Object.entries(EMOTION_PATTERNS)) {
        for (const pattern of patterns) {
            const matches = text.match(pattern);
            if (matches) {
                emotionScores[emotion as Emotion] += matches.length * 10;
            }
        }
    }

    // Find emotion with highest score
    let maxEmotion: Emotion = 'neutral';
    let maxScore = 0;

    for (const [emotion, score] of Object.entries(emotionScores)) {
        if (score > maxScore) {
            maxScore = score;
            maxEmotion = emotion as Emotion;
        }
    }

    return maxEmotion;
}

// Remove emotion tags from text for display
export function cleanEmotionTags(text: string): string {
    return text
        .replace(/\[(happy|sad|angry|surprised|blush|excited|pout|love|thinking|joy|crying|mad|shocked|embarrassed|thrilled|hmph|heart|hmm)\]/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
}

// Get emotion intensity modifier based on affection
export function getEmotionIntensity(emotion: Emotion, affectionLevel: number): number {
    const baseIntensity = 0.7;
    const affectionBonus = (affectionLevel / 100) * 0.3;

    // Some emotions are more intense at higher affection
    const emotionMultipliers: Record<Emotion, number> = {
        neutral: 1.0,
        happy: 1.0 + (affectionLevel / 100) * 0.5,
        sad: 1.0,
        angry: 0.8,
        surprised: 1.0,
        blush: 1.0 + (affectionLevel / 100) * 0.8, // More blushing at high affection
        excited: 1.0 + (affectionLevel / 100) * 0.6,
        pout: 1.0,
        love: 0.5 + (affectionLevel / 100) * 1.0, // Love barely shows at low affection
        thinking: 1.0,
    };

    return Math.min(1.0, (baseIntensity + affectionBonus) * emotionMultipliers[emotion]);
}
