use serde::{Deserialize, Serialize};
use tauri::command;

const OLLAMA_BASE_URL: &str = "http://localhost:11434";

#[derive(Debug, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ChatRequest {
    pub model: String,
    pub messages: Vec<ChatMessage>,
    pub stream: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ChatResponse {
    pub model: String,
    pub message: ChatMessage,
    pub done: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OllamaModel {
    pub name: String,
    pub modified_at: String,
    pub size: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ModelsResponse {
    pub models: Vec<OllamaModel>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OllamaStatus {
    pub connected: bool,
    pub error: Option<String>,
}

/// Chat with Ollama using the specified model and messages
#[command]
pub async fn chat_with_ollama(
    model: String,
    messages: Vec<ChatMessage>,
    system_prompt: Option<String>,
) -> Result<String, String> {
    let client = reqwest::Client::new();
    
    // Build messages with optional system prompt
    let mut all_messages = Vec::new();
    
    if let Some(system) = system_prompt {
        all_messages.push(ChatMessage {
            role: "system".to_string(),
            content: system,
        });
    }
    
    all_messages.extend(messages);
    
    let request = ChatRequest {
        model,
        messages: all_messages,
        stream: false,
    };
    
    let response = client
        .post(format!("{}/api/chat", OLLAMA_BASE_URL))
        .json(&request)
        .send()
        .await
        .map_err(|e| format!("Failed to connect to Ollama: {}", e))?;
    
    if !response.status().is_success() {
        return Err(format!("Ollama error: {}", response.status()));
    }
    
    let chat_response: ChatResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse Ollama response: {}", e))?;
    
    Ok(chat_response.message.content)
}

/// List available Ollama models
#[command]
pub async fn list_ollama_models() -> Result<Vec<String>, String> {
    let client = reqwest::Client::new();
    
    let response = client
        .get(format!("{}/api/tags", OLLAMA_BASE_URL))
        .send()
        .await
        .map_err(|e| format!("Failed to connect to Ollama: {}", e))?;
    
    if !response.status().is_success() {
        return Err(format!("Ollama error: {}", response.status()));
    }
    
    let models_response: ModelsResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse models response: {}", e))?;
    
    Ok(models_response.models.into_iter().map(|m| m.name).collect())
}

/// Check if Ollama is running and accessible
#[command]
pub async fn check_ollama_status() -> OllamaStatus {
    let client = reqwest::Client::new();
    
    match client.get(format!("{}/api/tags", OLLAMA_BASE_URL)).send().await {
        Ok(response) => {
            if response.status().is_success() {
                OllamaStatus {
                    connected: true,
                    error: None,
                }
            } else {
                OllamaStatus {
                    connected: false,
                    error: Some(format!("Ollama returned status: {}", response.status())),
                }
            }
        }
        Err(e) => OllamaStatus {
            connected: false,
            error: Some(format!("Cannot connect to Ollama: {}", e)),
        },
    }
}
