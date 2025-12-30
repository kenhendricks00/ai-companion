// Ani AI Companion - Main Library

pub mod commands;

use commands::{ollama, storage};

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            // Ollama commands
            ollama::chat_with_ollama,
            ollama::list_ollama_models,
            ollama::check_ollama_status,
            // Storage commands
            storage::get_affection,
            storage::set_affection,
            storage::reset_affection,
            storage::save_settings,
            storage::load_settings,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
