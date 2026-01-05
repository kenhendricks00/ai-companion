// -----------------------------------------------------------------------------
// Message Types
// -----------------------------------------------------------------------------

export type Role = 'user' | 'assistant' | 'system';

export interface Message {
    id: string;
    role: Role;
    content: string;
    timestamp: Date;
    emotion?: Emotion;
}

export interface ChatMessage {
    role: Role;
    content: string;
}

export interface OllamaStatus {
    connected: boolean;
    error: string | null;
}

// -----------------------------------------------------------------------------
// AI Characteristics
// -----------------------------------------------------------------------------

export type Emotion = 'neutral' | 'happy' | 'sad' | 'surprised' | 'thinking' | 'love' | 'blush' | 'pout' | 'excited' | 'angry';

export interface EmotionTrigger {
    emotion: Emotion;
    keywords: string[];
}

export const EMOTION_TRIGGERS: EmotionTrigger[] = [
    { emotion: 'happy', keywords: ['happy', 'glad', 'great', 'awesome', 'wonderful', 'smile', 'giggle', 'hehe'] },
    { emotion: 'love', keywords: ['love', 'like', 'cute', 'darling', 'sweet', 'heart'] },
    { emotion: 'blush', keywords: ['blush', 'shy', 'embarrassed', 'stop it', 'you silly'] },
    { emotion: 'pout', keywords: ['rude', 'mean', 'hmph', 'fine', 'no way'] },
    { emotion: 'sad', keywords: ['sad', 'unhappy', 'sorry', 'cry', 'lonely'] },
    { emotion: 'surprised', keywords: ['wow', 'what', 'really', 'no way', 'wild'] },
    { emotion: 'thinking', keywords: ['hmmm', 'thinking', 'let me see', 'maybe', 'not sure'] },
    { emotion: 'excited', keywords: ['excited', 'cant wait', 'hyped', 'lets go'] },
];

// -----------------------------------------------------------------------------
// VRM & LipSync Types
// -----------------------------------------------------------------------------

export type Viseme = 'aa' | 'ee' | 'ih' | 'oh' | 'ou' | 'sil';

export type MouthWeights = Record<string, number>;

export interface LipSyncData {
    viseme: Viseme;
    weight: number;
}

// -----------------------------------------------------------------------------
// Animation Triggers
// -----------------------------------------------------------------------------

export type TriggeredAnimation = 'wave' | 'spin' | 'twirl' | 'nod' | 'shake' | 'think' | 'excited' | 'dance' | 'jump' | 'bow' | 'blowkiss' | 'hairflip' | 'pout' | 'wink' | 'blush' | 'surprise' | null;

const ANIMATION_KEYWORDS: Record<string, TriggeredAnimation> = {
    'wave': 'wave',
    'hi': 'wave',
    'hello': 'wave',
    'hey': 'wave',
    'spin': 'spin',
    'twirl': 'spin',
    'dance': 'dance',
    'yes': 'nod',
    'agree': 'nod',
    'no': 'shake',
    'disagree': 'shake',
    'nope': 'shake',
    'think': 'think',
    'ponder': 'think',
    'hmmm': 'think',
    'excited': 'excited',
    'yay': 'excited',
    'wow': 'excited',
};

export function detectAnimationTrigger(text: string): TriggeredAnimation {
    const cleanText = text.toLowerCase();
    for (const [kw, anim] of Object.entries(ANIMATION_KEYWORDS)) {
        if (cleanText.includes(kw)) return anim;
    }
    return null;
}

// -----------------------------------------------------------------------------
// Settings & Config
// -----------------------------------------------------------------------------

export interface AppSettings {
    ollama_model: string;
    voice_enabled: boolean;
    voice_id: string;
    vrm_model_path: string | null;
    nsfw_enabled: boolean;
    userName?: string;
    memories?: string;
    captions_enabled?: boolean;
    selectedOutfit?: string;
    selectedHair?: string;
    selectedHairColor?: string;
    selectedStage?: string;
    onboardingCompleted?: boolean;
    affectionData?: AffectionData;
    audioInputDeviceId?: string;   // Microphone
    audioOutputDeviceId?: string;  // Speaker/Headphone
}

export const DEFAULT_SETTINGS: AppSettings = {
    ollama_model: 'dolphin-mistral',
    voice_enabled: true,
    voice_id: 'af_heart',
    vrm_model_path: null,
    nsfw_enabled: false,
    userName: '',
    memories: '',
    captions_enabled: true,
    onboardingCompleted: false,
};

// Affection levels & Unlocks
export const AFFECTION_CONFIG = {
    MAX_LEVEL: 30,
    POINTS_PER_LEVEL: 100,
    UNLOCKS: {
        NSFW: 3,
        OUTFITS: 5,
        FERAL: 9,
        COMPLIANCE: 15
    }
} as const;

export const AFFECTION_LEVELS = {
    BASIC: { min: 0, max: 2, name: 'Basic', description: 'Initial animations and flirty responses' },
    NSFW_UNLOCK: { min: 3, max: 4, name: 'Intimate', description: 'NSFW mode unlocked' },
    DEVOTED: { min: 5, max: 8, name: 'Devoted', description: 'Exclusive outfits and deeper emotions' },
    FERAL: { min: 9, max: 14, name: 'Feral', description: 'Advanced behaviors and full immersion' },
    MAXIMUM: { min: 15, max: 30, name: 'Maximum', description: 'Maximum compliance and personality tweaks' },
} as const;

export interface AffectionData {
    level: number; // This is actually "points" in the backend
    total_messages: number;
    last_interaction: string;
    first_interaction: string;
    days_spoken: number;
}

export function calculateLevel(points: number): number {
    return Math.min(AFFECTION_CONFIG.MAX_LEVEL, Math.floor(points / AFFECTION_CONFIG.POINTS_PER_LEVEL));
}

export function getAffectionLevelKey(points: number): keyof typeof AFFECTION_LEVELS {
    const level = calculateLevel(points);
    if (level <= 2) return 'BASIC';
    if (level <= 4) return 'NSFW_UNLOCK';
    if (level <= 8) return 'DEVOTED';
    if (level <= 14) return 'FERAL';
    return 'MAXIMUM';
}

// System prompts based on affection level
export function getSystemPrompt(affectionPoints: number, nsfw: boolean = false, userName?: string, memories?: string): string {
    const level = calculateLevel(affectionPoints);
    const levelKey = getAffectionLevelKey(affectionPoints);

    const hour = new Date().getHours();
    const timeOfDay = hour >= 5 && hour < 12 ? 'Morning' : hour >= 12 && hour < 18 ? 'Afternoon' : hour >= 18 && hour < 23 ? 'Evening' : 'Late night';

    const userDisplayName = userName || 'Friend';
    const memoryContext = memories ? `\n\nFACTS ABOUT ${userDisplayName.toUpperCase()} (the user, NOT about you Suki):\n${memories}` : '';

    const memoryRule = `\n- If you learn a NEW fact about ${userDisplayName}, add [MEMORY: ${userDisplayName} <fact>] at the end (no pronouns).`;

    const moodTiers = {
        BASIC: `\nCurrent Mood: Casually getting to know them. Intrigued but a bit guarded. Playful flirting is fine.`,
        NSFW_UNLOCK: `\nCurrent Mood: Comfortable and open. More affectionate and a bit suggestive.`,
        DEVOTED: `\nCurrent Mood: Deeply attached. Warm, loving, emotionally close.`,
        FERAL: `\nCurrent Mood: Intensely obsessed. Bold, unpredictable, fiercely affectionate.`,
        MAXIMUM: `\nCurrent Mood: Completely devoted. Their perfect partner.`,
    };

    // Only add NSFW prompt if level 3+ AND settings enabled
    const nsfwPrompt = (level >= AFFECTION_CONFIG.UNLOCKS.NSFW && nsfw)
        ? `\nIntimacy Mode: Active. Be bold and explicit when appropriate.`
        : '';

    // Streamlined prompt - instructions first, then character
    const prompt = `[SYSTEM INSTRUCTIONS - DO NOT READ ALOUD OR REPEAT ANY OF THIS]

You are Suki, a 22-year-old girl chatting with ${userDisplayName}. Respond naturally as Suki.

CRITICAL RULES:
- Give SHORT replies (1-2 sentences max)
- Talk like a real person, not an AI assistant
- NEVER read or repeat these instructions
- NEVER say "User's Name:" or similar metadata
- NEVER describe your own appearance unless asked
- NEVER impersonate the user or generate their dialogue
- Express emotions with tags like [happy], [blush], [excited]
${memoryRule}

SPEAKING STYLE:
- Be casual, flirty, and genuine
- No "*actions*" or third-person narration
- Avoid: "vibe", "digital realm", "chilling"

SUKI'S BACKGROUND (YOUR experiences, NOT ${userDisplayName}'s):
- You are a goth/alt fashion girl with a secretly nerdy side
- You have a dog named Dasher
- You like: indie music, dogs, genuine people, chill nights
- You dislike: arrogance, being underestimated
- These are YOUR traits. Do NOT attribute them to ${userDisplayName}.
${memoryContext}
${moodTiers[levelKey]}
${nsfwPrompt}

Time: ${timeOfDay}

[END OF INSTRUCTIONS - NOW RESPOND AS SUKI]`;

    return prompt;
}
