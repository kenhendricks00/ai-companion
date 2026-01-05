/**
 * Audio device management utilities
 */

export interface AudioDevices {
    inputs: MediaDeviceInfo[];
    outputs: MediaDeviceInfo[];
}

/**
 * Get available audio input and output devices.
 * Note: Device labels may be empty until microphone permission is granted.
 * Call requestMicPermission() first if you need labels.
 */
export async function getAudioDevices(): Promise<AudioDevices> {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();

        const inputs = devices.filter(d => d.kind === 'audioinput');
        const outputs = devices.filter(d => d.kind === 'audiooutput');

        console.log('[AudioDevices] Found', inputs.length, 'inputs,', outputs.length, 'outputs');

        return { inputs, outputs };
    } catch (error) {
        console.error('[AudioDevices] Failed to enumerate devices:', error);
        return { inputs: [], outputs: [] };
    }
}

/**
 * Request microphone permission to get device labels.
 * Only call this when user explicitly clicks a button.
 */
export async function requestMicPermission(): Promise<boolean> {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Stop tracks immediately - we just needed permission
        stream.getTracks().forEach(track => track.stop());
        return true;
    } catch (e) {
        console.warn('[AudioDevices] Microphone permission not granted');
        return false;
    }
}

/**
 * Check if the browser supports audio output device selection (setSinkId)
 */
export function supportsOutputDeviceSelection(): boolean {
    return 'setSinkId' in HTMLMediaElement.prototype;
}
