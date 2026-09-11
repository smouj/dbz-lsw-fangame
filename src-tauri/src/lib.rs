#[cfg(feature = "devhub")]
mod devhub;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default();

    #[cfg(feature = "devhub")]
    let builder = builder.invoke_handler(tauri::generate_handler![
        devhub::devhub_probe,
        devhub::devhub_action,
    ]);

    builder
        .run(tauri::generate_context!())
        .expect("error while running DBZ LSW Fangame");
}
