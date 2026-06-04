import { appendLogRequestPayload, addModelInteractionLog, completeModelInteractionLog } from '../../services/logService';
import { ModelResponseError } from '../../types';
import { OPENAI_API_BASE_URL, CHATGPT_MODEL } from './constants';

export type ChatGptCallOptions = {
    temperature?: number;
    useSearch?: boolean;
    enforceJson?: boolean;
    model?: string;
    metadata?: Record<string, any>;
};

/**
 * Helper function to call the ChatGPT API.
 * It enforces JSON output for more reliable parsing.
 */
export const callChatGptAPI = async (
    apiKey: string,
    messages: Array<{ role: string; content: string }>,
    logId: string,
    sessionId: string,
    options: ChatGptCallOptions = {}
): Promise<string> => {
    const {
        temperature,
        useSearch = false,
        enforceJson = true,
        model = CHATGPT_MODEL,
        metadata,
    } = options;

    const prompt = messages.map((m) => `### ${m.role}\n${m.content}`).join('\n\n');
    appendLogRequestPayload(sessionId, logId, { prompt });

    const requestBody: any = {
        model,
        messages,
    };

    if (enforceJson) {
        requestBody.response_format = { type: 'json_object' };
    }

    if (typeof temperature === 'number' && !useSearch) {
        requestBody.temperature = temperature;
    }

    if (useSearch) {
        // requestBody.web_search_options = {}; // Not supported by standard API
    }

    const requestDetails = {
        url: `${OPENAI_API_BASE_URL}/chat/completions`,
        method: 'POST',
        body: requestBody,
    };

    const interactionId = addModelInteractionLog(sessionId, logId, {
        provider: 'OpenAI',
        model,
        operation: 'chat.completions',
        requestPayload: requestDetails,
        metadata: { useSearch, enforceJson, ...(metadata || {}) },
    });

    let responseSnapshot: any;
    let capturedError: any;

    try {
        const response = await fetch(requestDetails.url, {
            method: requestDetails.method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify(requestDetails.body),
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorJson;
            try {
                errorJson = JSON.parse(errorText);
            } catch (e) {
                // ignore
            }

            if (response.status === 429 || (errorJson?.error?.code === 'rate_limit_exceeded')) {
                let message = errorJson?.error?.message || 'Rate limit exceeded. Please try again later.';

                // Make the message user-friendly if it contains technical details
                if (message.includes('Rate limit reached')) {
                    const waitTimeMatch = message.match(/(?:Please try again in|Please wait|try again in)\s*([0-9]+(?:\.[0-9]+)?)\s*(?:s|seconds?)/i);
                    if (waitTimeMatch) {
                        message = `OpenAI rate limit reached. Please wait ${waitTimeMatch[1]} seconds before trying again.`;
                    } else {
                        message = 'OpenAI rate limit reached. Please try again later.';
                    }
                }

                const apiError = new ModelResponseError(message);
                capturedError = apiError;
                throw apiError;
            }

            const apiError = new Error(`ChatGPT API request failed: ${response.status} ${response.statusText}. ${errorText}`);
            (apiError as any).rawResponse = { status: response.status, statusText: response.statusText, body: errorText };
            (apiError as any).name = 'ChatGptApiError';
            capturedError = apiError;
            throw apiError;
        }

        const data = await response.json();
        responseSnapshot = { status: response.status, body: data };

        if (!data.choices || data.choices.length === 0) {
            throw new Error("ChatGPT API returned no response choices.");
        }

        const content = data.choices[0].message?.content;
        if (!content) {
            console.warn("ChatGPT response did not contain message content. Full message:", data.choices[0].message);
            throw new Error("ChatGPT API returned empty content.");
        }

        return content;
    } catch (error) {
        if (!capturedError) {
            capturedError = error;
        }
        throw error;
    } finally {
        completeModelInteractionLog(sessionId, logId, interactionId, responseSnapshot, capturedError);
    }
};

export const generateContent = async (
    apiKey: string,
    params: {
        model: string;
        prompt: string;
        temperature?: number;
        metadata?: Record<string, any>;
        logId?: string;
        sessionId?: string;
    }
): Promise<string> => {
    if (!apiKey) throw new Error("OpenAI API key is missing.");

    const { model, prompt, temperature, metadata, logId, sessionId } = params;

    if (sessionId && logId) {
        appendLogRequestPayload(sessionId, logId, { prompt });
    }

    const requestBody: any = {
        model: model || CHATGPT_MODEL,
        messages: [{ role: 'user', content: prompt }],
    };

    if (typeof temperature === 'number') {
        requestBody.temperature = temperature;
    }

    const requestDetails = {
        url: `${OPENAI_API_BASE_URL}/chat/completions`,
        method: 'POST',
        body: requestBody,
    };

    const interactionId = sessionId && logId
        ? addModelInteractionLog(sessionId, logId, {
            provider: 'OpenAI',
            model: requestBody.model,
            operation: 'chat.completions',
            requestPayload: requestDetails,
            metadata,
        })
        : null;

    let responseSnapshot: any;
    let capturedError: any;

    try {
        const response = await fetch(requestDetails.url, {
            method: requestDetails.method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify(requestDetails.body),
        });

        if (!response.ok) {
            const errorText = await response.text();
            const apiError = new Error(`ChatGPT API request failed: ${response.status} ${response.statusText}. ${errorText}`);
            (apiError as any).rawResponse = { status: response.status, statusText: response.statusText, body: errorText };
            (apiError as any).name = 'ChatGptApiError';
            capturedError = apiError;
            throw apiError;
        }

        const data = await response.json();
        responseSnapshot = { status: response.status, body: data };

        if (!data.choices || data.choices.length === 0) {
            throw new Error("ChatGPT API returned no response choices.");
        }

        const content = data.choices[0].message?.content;
        if (!content) {
            console.warn("ChatGPT response did not contain message content. Full message:", data.choices[0].message);
            throw new Error("ChatGPT API returned empty content.");
        }

        return content;
    } catch (error) {
        if (!capturedError) {
            capturedError = error;
        }
        throw error;
    } finally {
        if (interactionId && sessionId && logId) {
            completeModelInteractionLog(sessionId, logId, interactionId, responseSnapshot, capturedError);
        }
    }
};
