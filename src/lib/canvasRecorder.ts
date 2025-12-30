// Canvas recording service using MediaRecorder API
// Records the WebGL canvas stream

class CanvasRecorder {
    private mediaRecorder: MediaRecorder | null = null;
    private recordedChunks: Blob[] = [];
    private stream: MediaStream | null = null;
    private isRecording: boolean = false;

    async startRecording(canvas: HTMLCanvasElement, audioStream?: MediaStream | null): Promise<boolean> {
        try {
            // Get stream from canvas at 30fps
            const canvasStream = canvas.captureStream(30);

            // Create a NEW MediaStream to avoid modifying the original canvas stream
            const tracks = [...canvasStream.getVideoTracks()];

            // Add audio tracks if provided
            if (audioStream) {
                const audioTracks = audioStream.getAudioTracks();
                console.log(`[CanvasRecorder] Received audio stream with ${audioTracks.length} tracks`);

                audioTracks.forEach(track => {
                    console.log(`[CanvasRecorder] Adding audio track: ${track.label} (${track.id}), enabled: ${track.enabled}, state: ${track.readyState}`);
                    tracks.push(track);
                });

                if (audioTracks.length === 0) {
                    console.warn('[CanvasRecorder] Audio stream has no tracks at start of recording!');
                }
            }

            this.stream = new MediaStream(tracks);

            // Check for supported mime types - Try to find a good one with sound
            const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
                ? 'video/webm;codecs=vp8,opus'
                : MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
                    ? 'video/webm;codecs=vp8'
                    : 'video/webm';

            console.log(`[CanvasRecorder] Using mimeType: ${mimeType}`);

            this.mediaRecorder = new MediaRecorder(this.stream, {
                mimeType,
                videoBitsPerSecond: 2500000,
                audioBitsPerSecond: 128000,
            });

            this.recordedChunks = [];

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    console.log(`[CanvasRecorder] Data available: ${event.data.size} bytes`);
                    this.recordedChunks.push(event.data);
                } else {
                    console.warn('[CanvasRecorder] Empty chunk received');
                }
            };

            this.mediaRecorder.onstart = () => console.log('[CanvasRecorder] MediaRecorder started');
            this.mediaRecorder.onerror = (e) => console.error('[CanvasRecorder] MediaRecorder error:', e);

            this.mediaRecorder.start(1000); // Collect data every 1s
            this.isRecording = true;

            console.log('Canvas recording started with audio:', !!audioStream);
            if (audioStream) {
                console.log(`[CanvasRecorder] Audio tracks: ${audioStream.getAudioTracks().length}`);
            }
            return true;
        } catch (error) {
            console.error('Failed to start canvas recording:', error);
            return false;
        }
    }

    stopRecording(): Promise<Blob | null> {
        return new Promise((resolve) => {
            if (!this.mediaRecorder || !this.isRecording) {
                resolve(null);
                return;
            }

            this.mediaRecorder.onstop = () => {
                const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
                this.cleanup();
                console.log('Canvas recording stopped, blob size:', blob.size);
                resolve(blob);
            };

            this.mediaRecorder.stop();
            this.isRecording = false;
        });
    }

    cancelRecording(): void {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
        }
        this.cleanup();
    }

    private cleanup(): void {
        this.recordedChunks = [];
        this.mediaRecorder = null;
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        this.isRecording = false;
    }

    getIsRecording(): boolean {
        return this.isRecording;
    }
}

export const canvasRecorder = new CanvasRecorder();
