import { useState, useEffect, useCallback } from 'react';
import { checkOllamaStatus, listModels, streamChatWithOllama } from '../lib/ollama';
import { ChatMessage, OllamaStatus } from '../types';

export function useOllama() {
    const [status, setStatus] = useState<OllamaStatus>({ connected: false, error: null });
    const [models, setModels] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [currentModel, setCurrentModel] = useState('dolphin-mistral');

    // Check connection status
    const checkStatus = useCallback(async () => {
        const result = await checkOllamaStatus();
        setStatus(result);
        return result.connected;
    }, []);

    // Fetch available models
    const fetchModels = useCallback(async () => {
        const modelList = await listModels();
        setModels(modelList);
        if (modelList.length > 0 && !modelList.includes(currentModel)) {
            setCurrentModel(modelList[0]);
        }
        return modelList;
    }, [currentModel]);

    // Send message and get streaming response
    const sendMessage = useCallback(async (
        messages: ChatMessage[],
        systemPrompt: string,
        onChunk: (chunk: string) => void,
        onComplete: (fullResponse: string) => void,
        onError: (error: string) => void
    ) => {
        setIsLoading(true);
        let fullResponse = '';

        try {
            const stream = streamChatWithOllama(currentModel, messages, systemPrompt);

            for await (const chunk of stream) {
                fullResponse += chunk;
                onChunk(chunk);
            }

            onComplete(fullResponse);
        } catch (error) {
            onError(String(error));
        } finally {
            setIsLoading(false);
        }
    }, [currentModel]);

    // Initial check on mount
    useEffect(() => {
        checkStatus().then(connected => {
            if (connected) {
                fetchModels();
            }
        });
    }, [checkStatus, fetchModels]);

    return {
        status,
        models,
        isLoading,
        currentModel,
        setCurrentModel,
        checkStatus,
        fetchModels,
        sendMessage,
    };
}
