use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::{command, AppHandle, Manager};

const AFFECTION_FILE: &str = "affection.json";
const SETTINGS_FILE: &str = "settings.json";

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AffectionData {
    pub level: u32,
    pub total_messages: u32,
    pub last_interaction: String,
    #[serde(default)]
    pub first_interaction: String,
    #[serde(default)]
    pub days_spoken: u32,
}

impl Default for AffectionData {
    fn default() -> Self {
        Self {
            level: 0,
            total_messages: 0,
            last_interaction: String::new(),
            first_interaction: String::new(),
            days_spoken: 0,
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppSettings {
    pub ollama_model: String,
    pub voice_id: String,
    pub voice_enabled: bool,
    pub vrm_model_path: Option<String>,
    pub nsfw_enabled: bool,
    #[serde(default, rename = "userName")]
    pub user_name: Option<String>,
    #[serde(default)]
    pub memories: Option<String>,
    #[serde(default, rename = "selectedOutfit")]
    pub selected_outfit: Option<String>,
    #[serde(default, rename = "selectedHair")]
    pub selected_hair: Option<String>,
    #[serde(default, rename = "selectedStage")]
    pub selected_stage: Option<String>,
    #[serde(default, rename = "selectedHairColor")]
    pub selected_hair_color: Option<String>,
    #[serde(default)]
    pub captions_enabled: Option<bool>,
    #[serde(default, rename = "affectionData")]
    pub affection_data: Option<AffectionData>,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            ollama_model: "llama3.2".to_string(),
            voice_id: "af_heart".to_string(),
            voice_enabled: true,
            vrm_model_path: None,
            nsfw_enabled: false,
            user_name: None,
            memories: None,
            selected_outfit: None,
            selected_hair: None,
            selected_stage: None,
            selected_hair_color: None,
            captions_enabled: Some(true),
            affection_data: None,
        }
    }
}

fn get_app_data_dir(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))
}

/// Get current affection level
#[command]
pub async fn get_affection(app: AppHandle) -> Result<AffectionData, String> {
    let data_dir = get_app_data_dir(&app)?;
    let file_path = data_dir.join(AFFECTION_FILE);

    if !file_path.exists() {
        return Ok(AffectionData::default());
    }

    let content = fs::read_to_string(&file_path)
        .map_err(|e| format!("Failed to read affection file: {}", e))?;

    serde_json::from_str(&content).map_err(|e| format!("Failed to parse affection data: {}", e))
}

/// Set affection level
#[command]
pub async fn set_affection(app: AppHandle, data: AffectionData) -> Result<(), String> {
    let data_dir = get_app_data_dir(&app)?;

    // Create directory if it doesn't exist
    if !data_dir.exists() {
        fs::create_dir_all(&data_dir)
            .map_err(|e| format!("Failed to create app data directory: {}", e))?;
    }

    let file_path = data_dir.join(AFFECTION_FILE);
    let content = serde_json::to_string_pretty(&data)
        .map_err(|e| format!("Failed to serialize affection data: {}", e))?;

    fs::write(&file_path, content).map_err(|e| format!("Failed to write affection file: {}", e))
}

/// Reset affection to default
#[command]
pub async fn reset_affection(app: AppHandle) -> Result<(), String> {
    set_affection(app, AffectionData::default()).await
}

/// Save app settings
#[command]
pub async fn save_settings(app: AppHandle, settings: AppSettings) -> Result<(), String> {
    let data_dir = get_app_data_dir(&app)?;

    if !data_dir.exists() {
        fs::create_dir_all(&data_dir)
            .map_err(|e| format!("Failed to create app data directory: {}", e))?;
    }

    let file_path = data_dir.join(SETTINGS_FILE);
    let content = serde_json::to_string_pretty(&settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;

    fs::write(&file_path, content).map_err(|e| format!("Failed to write settings file: {}", e))
}

/// Load app settings
#[command]
pub async fn load_settings(app: AppHandle) -> Result<AppSettings, String> {
    let data_dir = get_app_data_dir(&app)?;
    let file_path = data_dir.join(SETTINGS_FILE);

    if !file_path.exists() {
        return Ok(AppSettings::default());
    }

    let content = fs::read_to_string(&file_path)
        .map_err(|e| format!("Failed to read settings file: {}", e))?;

    serde_json::from_str(&content).map_err(|e| format!("Failed to parse settings: {}", e))
}
