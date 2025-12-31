import { invoke } from '@tauri-apps/api/core';
import { ChatMessage } from '../types';

const OLLAMA_BASE_URL = 'http://localhost:11434';

// Check if Ollama is running
export async function checkOllamaStatus(): Promise<{ connected: boolean; error: string | null }> {
    try {
        return await invoke('check_ollama_status');
    } catch (error) {
        return { connected: false, error: String(error) };
    }
}

// List available models
export async function listModels(): Promise<string[]> {
    try {
        return await invoke('list_ollama_models');
    } catch (error) {
        console.error('Failed to list models:', error);
        return [];
    }
}

// Chat with Ollama (non-streaming for simplicity)
export async function chatWithOllama(
    model: string,
    messages: ChatMessage[],
    systemPrompt?: string
): Promise<string> {
    try {
        const response = await invoke<string>('chat_with_ollama', {
            model,
            messages: messages.map(m => ({ role: m.role, content: m.content })),
            systemPrompt,
        });
        return response;
    } catch (error) {
        throw new Error(`Ollama chat failed: ${error}`);
    }
}

// Streaming chat using fetch (bypasses Tauri for streaming)
export async function* streamChatWithOllama(
    model: string,
    messages: ChatMessage[],
    systemPrompt?: string,
    options?: Record<string, any>
): AsyncGenerator<string, void, unknown> {
    const allMessages = systemPrompt
        ? [{ role: 'system', content: systemPrompt }, ...messages]
        : messages;

    const requestBody = {
        model,
        messages: allMessages.map(m => ({ role: m.role, content: m.content })),
        stream: true,
        options // Pass options including stop tokens
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

    try {
        const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`Ollama error: ${response.status} ${response.statusText}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response body');


        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (line.trim()) {
                    try {
                        const json = JSON.parse(line);
                        if (json.message?.content) {
                            yield json.message.content;
                        }
                    } catch (e) {
                        // Skip invalid JSON
                    }
                }
            }
        }
    } catch (error: any) {
        if (error.name === 'AbortError') {
            throw new Error('Ollama request timed out (60s)');
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
}
