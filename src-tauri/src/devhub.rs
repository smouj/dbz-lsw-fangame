use std::{env, net::{SocketAddr, TcpStream}, path::{Path, PathBuf}, process::Command, time::Duration};
use tauri::Emitter;

const DEV_SERVER: &str = "127.0.0.1:5178";
const GITHUB_URL: &str = "https://github.com/smouj/dbz-lsw-fangame";

fn output(program: &str, args: &[&str], cwd: Option<&Path>) -> String {
    let mut command = Command::new(program);
    command.args(args);
    if let Some(dir) = cwd {
        command.current_dir(dir);
    }
    match command.output() {
        Ok(result) => {
            let text = if result.status.success() { result.stdout } else { result.stderr };
            String::from_utf8_lossy(&text).trim().to_string()
        }
        Err(_) => String::new(),
    }
}

fn valid_repo(path: &Path) -> bool {
    if !path.join(".git").exists() || !path.join("package.json").is_file() {
        return false;
    }
    std::fs::read_to_string(path.join("package.json"))
        .map(|content| {
            content.contains("\"name\": \"dbz-lsw-fangame\"")
                || content.contains("\"name\": \"dbz-lsw-fangame\"")
        })
        .unwrap_or(false)
}

fn resolve_repo(requested: Option<String>) -> Result<PathBuf, String> {
    if let Some(value) = requested {
        let value = value.trim();
        if !value.is_empty() {
            let path = PathBuf::from(value);
            if valid_repo(&path) {
                return Ok(path);
            }
            return Err(format!("La ruta no parece ser el repo dbz-lsw-fangame: {}", path.display()));
        }
    }

    if let Ok(value) = env::var("DBZLSW_REPO") {
        let path = PathBuf::from(value);
        if valid_repo(&path) {
            return Ok(path);
        }
    }

    if let Ok(current) = env::current_dir() {
        for ancestor in current.ancestors() {
            if valid_repo(ancestor) {
                return Ok(ancestor.to_path_buf());
            }
        }
    }

    let mut candidates = vec![
        PathBuf::from(r"D:\CodexProjects\dbz-lsw-fangame"),
        PathBuf::from(r"C:\CodexProjects\dbz-lsw-fangame"),
        PathBuf::from(r"D:\CodexProjects\dbz-lsw-fangame"),
        PathBuf::from(r"C:\CodexProjects\dbz-lsw-fangame"),
    ];
    if let Ok(home) = env::var("USERPROFILE").or_else(|_| env::var("HOME")) {
        let home = PathBuf::from(home);
        candidates.push(home.join("CodexProjects").join("dbz-lsw-fangame"));
        candidates.push(home.join("workspace").join("dbz-lsw-fangame"));
        candidates.push(home.join("Documents").join("dbz-lsw-fangame"));
        candidates.push(home.join("Documents").join("Playground").join("dbz-lsw-fangame"));
        candidates.push(home.join("CodexProjects").join("dbz-lsw-fangame"));
        candidates.push(home.join("workspace").join("dbz-lsw-fangame"));
        candidates.push(home.join("Documents").join("dbz-lsw-fangame"));
    }

    candidates
        .into_iter()
        .find(|path| valid_repo(path))
        .ok_or_else(|| "No se encontró dbz-lsw-fangame. Indica la ruta del repo en System Hub o define DBZLSW_REPO.".to_string())
}

fn git(repo: &Path, args: &[&str]) -> String {
    output("git", args, Some(repo))
}

fn tool_version(program: &str, args: &[&str]) -> String {
    let value = output(program, args, None);
    if value.is_empty() { "not-found".to_string() } else { value.lines().next().unwrap_or("unknown").to_string() }
}

fn server_online() -> bool {
    DEV_SERVER
        .parse::<SocketAddr>()
        .ok()
        .and_then(|addr| TcpStream::connect_timeout(&addr, Duration::from_millis(250)).ok())
        .is_some()
}

#[cfg(target_os = "windows")]
fn open_path(path: &Path) -> Result<(), String> {
    Command::new("explorer.exe")
        .arg(path)
        .spawn()
        .map(|_| ())
        .map_err(|error| format!("No se pudo abrir Explorer: {error}"))
}

#[cfg(target_os = "macos")]
fn open_path(path: &Path) -> Result<(), String> {
    Command::new("open").arg(path).spawn().map(|_| ()).map_err(|e| e.to_string())
}

#[cfg(all(unix, not(target_os = "macos")))]
fn open_path(path: &Path) -> Result<(), String> {
    Command::new("xdg-open").arg(path).spawn().map(|_| ()).map_err(|e| e.to_string())
}

#[cfg(target_os = "windows")]
fn open_url(url: &str) -> Result<(), String> {
    Command::new("cmd.exe")
        .args(["/C", "start", "", url])
        .spawn()
        .map(|_| ())
        .map_err(|error| format!("No se pudo abrir el navegador: {error}"))
}

#[cfg(target_os = "macos")]
fn open_url(url: &str) -> Result<(), String> {
    Command::new("open").arg(url).spawn().map(|_| ()).map_err(|e| e.to_string())
}

#[cfg(all(unix, not(target_os = "macos")))]
fn open_url(url: &str) -> Result<(), String> {
    Command::new("xdg-open").arg(url).spawn().map(|_| ()).map_err(|e| e.to_string())
}

#[cfg(target_os = "windows")]
fn launch_terminal(repo: &Path, command: &str, title: &str) -> Result<(), String> {
    use std::os::windows::process::CommandExt;
    const CREATE_NEW_CONSOLE: u32 = 0x00000010;
    let path = repo.to_string_lossy().replace("'", "''");
    let title = title.replace("'", "''");
    let script = format!(
        "$Host.UI.RawUI.WindowTitle='{title}'; Set-Location -LiteralPath '{path}'; {command}"
    );
    let mut process = Command::new("powershell.exe");
    process.args(["-NoExit", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", &script]);
    process.creation_flags(CREATE_NEW_CONSOLE);
    process
        .spawn()
        .map(|_| ())
        .map_err(|error| format!("No se pudo abrir PowerShell: {error}"))
}

#[cfg(not(target_os = "windows"))]
fn launch_terminal(_repo: &Path, _command: &str, _title: &str) -> Result<(), String> {
    Err("Las acciones de terminal del Dev Hub están preparadas para Windows.".to_string())
}

#[cfg(target_os = "windows")]
fn launch_wsl() -> Result<(), String> {
    use std::os::windows::process::CommandExt;
    const CREATE_NEW_CONSOLE: u32 = 0x00000010;
    let mut process = Command::new("wsl.exe");
    process.args([
        "-e", "bash", "-lc",
        "cd ~/workspace/dbz-lsw-fangame 2>/dev/null || cd ~/dbz-lsw-fangame 2>/dev/null || cd ~/workspace/dbz-lsw-fangame 2>/dev/null || cd ~/dbz-lsw-fangame 2>/dev/null || cd ~; exec bash",
    ]);
    process.creation_flags(CREATE_NEW_CONSOLE);
    process.spawn().map(|_| ()).map_err(|error| format!("No se pudo abrir WSL: {error}"))
}

#[cfg(not(target_os = "windows"))]
fn launch_wsl() -> Result<(), String> {
    Err("WSL solo está disponible desde Windows.".to_string())
}

fn open_repo_child(repo: &Path, relative: &str) -> Result<(), String> {
    let target = repo.join(relative);
    if !target.exists() {
        return Err(format!("No existe todavía: {}", target.display()));
    }
    open_path(&target)
}

#[tauri::command]
pub fn devhub_probe(repo_path: Option<String>) -> Result<Vec<String>, String> {
    let repo = resolve_repo(repo_path)?;
    let status = git(&repo, &["status", "--porcelain"]);
    let divergence = git(&repo, &["rev-list", "--left-right", "--count", "HEAD...origin/main"]);
    let remote = git(&repo, &["remote", "get-url", "origin"]);
    let wsl = if cfg!(target_os = "windows") {
        let value = output("wsl.exe", &["--status"], None);
        if value.is_empty() { "not-found" } else { "available" }
    } else {
        "n/a"
    };

    Ok(vec![
        format!("repo={}", repo.display()),
        format!("branch={}", git(&repo, &["branch", "--show-current"])),
        format!("head={}", git(&repo, &["rev-parse", "--short=8", "HEAD"])),
        format!("originHead={}", git(&repo, &["rev-parse", "--short=8", "origin/main"])),
        format!("divergence={}", divergence.replace('\t', " / ")),
        format!("workingTree={}", if status.is_empty() { "clean" } else { "dirty" }),
        format!("remote={remote}"),
        format!("node={}", tool_version("node", &["--version"])),
        format!("npm={}", tool_version("npm", &["--version"])),
        format!("rustc={}", tool_version("rustc", &["--version"])),
        format!("cargo={}", tool_version("cargo", &["--version"])),
        format!("wsl={wsl}"),
        format!("devServer={}", if server_online() { "online" } else { "offline" }),
        format!("romResearch={}", repo.join("tools/rom-research").exists()),
        format!("traces={}", repo.join("fixtures/rom-trace").exists()),
        format!("tauri={}", repo.join("src-tauri").exists()),
    ])
}

#[tauri::command]
pub fn devhub_action(action: String, repo_path: Option<String>) -> Result<String, String> {
    match action.as_str() {
        "open-github" => {
            open_url(GITHUB_URL)?;
            return Ok("GitHub abierto".to_string());
        }
        "open-devstudio" => {
            open_url("http://localhost:5178/#dev/dashboard")?;
            return Ok("Dev Studio abierto en el navegador".to_string());
        }
        "open-game" => {
            open_url("http://localhost:5178/")?;
            return Ok("Juego local abierto en el navegador".to_string());
        }
        "open-wsl" => {
            launch_wsl()?;
            return Ok("Terminal WSL abierta".to_string());
        }
        _ => {}
    }

    let repo = resolve_repo(repo_path)?;
    match action.as_str() {
        "open-repo" => open_path(&repo)?,
        "open-rom-research" => open_repo_child(&repo, "tools/rom-research")?,
        "open-traces" => open_repo_child(&repo, "fixtures/rom-trace")?,
        "open-docs" => open_repo_child(&repo, "docs/rom")?,
        "open-scripts" => open_repo_child(&repo, "scripts")?,
        "open-memory" => open_repo_child(&repo, "memory")?,
        "open-builds" => {
            let nsis = repo.join("src-tauri/target/release/bundle/nsis");
            if nsis.exists() { open_path(&nsis)?; } else { open_repo_child(&repo, "src-tauri")?; }
        }
        "open-terminal" => launch_terminal(&repo, "", "DBZ LSW — Repo")?,
        "open-vscode" => launch_terminal(&repo, "code .", "DBZ LSW — VS Code")?,
        "start-dev" => launch_terminal(&repo, "npm run dev", "DBZ LSW — Dev Server :5178")?,
        "typecheck" => launch_terminal(&repo, "npm run typecheck", "DBZ LSW — TypeScript")?,
        "tests" => launch_terminal(&repo, "npm test", "DBZ LSW — Tests")?,
        "build" => launch_terminal(&repo, "npm run build", "DBZ LSW — Build")?,
        "verify-ci" => launch_terminal(&repo, "npm run verify:ci", "DBZ LSW — Verify CI")?,
        "verify-presentation" => launch_terminal(&repo, "npm run verify:presentation", "DBZ LSW — Presentation")?,
        "verify-full-battle" => launch_terminal(&repo, "npm run verify:full-battle-e2e", "DBZ LSW — Full Battle E2E")?,
        "verify-physical" => launch_terminal(&repo, "npm run verify:rom-physical-corpus", "DBZ LSW — Physical Corpus")?,
        "verify-beam" => launch_terminal(&repo, "npm run verify:beam-scanline-trace", "DBZ LSW — Beam Trace")?,
        "git-status" => launch_terminal(&repo, "git status -sb; git log --oneline --decorate -12", "DBZ LSW — Git Status")?,
        "git-fetch" => launch_terminal(&repo, "git fetch origin; git status -sb", "DBZ LSW — Git Fetch")?,
        _ => return Err(format!("Acción Dev Hub no permitida: {action}")),
    }

    Ok(format!("Acción iniciada: {action}"))
}

#[derive(Clone, serde::Serialize)]
struct UpdateProgress {
    label: String,
    detail: String,
}

/// Auto-update: git pull + npm run build, then signal the frontend to reload.
#[tauri::command]
pub async fn devhub_update(app: tauri::AppHandle, repo_path: Option<String>) -> Result<Vec<String>, String> {
    let repo = resolve_repo(repo_path)?;
    let mut log = Vec::new();

    let emit_progress = |label: &str, detail: &str| {
        let _ = app.emit("devhub-update-progress", UpdateProgress { label: label.to_string(), detail: detail.to_string() });
    };

    // 1. git stash (por si hay cambios locales que bloquean pull)
    emit_progress("stash", "Guardando cambios locales...");
    let stash = git(&repo, &["stash", "--include-untracked"]);
    let had_stash = !stash.is_empty() && !stash.contains("No local changes to save");
    log.push(format!("stash={}", if had_stash { "saved" } else { "clean" }));

    // 2. git pull origin main
    emit_progress("pull", "Descargando cambios...");
    let pull = git(&repo, &["pull", "origin", "main"]);
    if pull.contains("CONFLICT") || pull.contains("error:") {
        if had_stash { let _ = git(&repo, &["stash", "pop"]); }
        log.push(format!("pull=FAILED: {}", pull.lines().next().unwrap_or("unknown error")));
        return Err(format!("git pull falló: {}", pull.lines().take(3).collect::<Vec<_>>().join(" · ")));
    }
    log.push(format!("pull={}", pull.lines().next().unwrap_or("ok")));

    // 3. Restaurar stash si lo había
    if had_stash {
        emit_progress("stash-pop", "Restaurando cambios locales...");
        let _ = git(&repo, &["stash", "pop"]);
        log.push("stash-pop=restored".to_string());
    }

    // 4. npm run build -- --mode devhub
    emit_progress("build", "Compilando frontend...");
    let build = output("npm", &["run", "build", "--", "--mode", "devhub"], Some(&repo));
    if build.contains("error") && !build.contains("warning") {
        log.push("build=FAILED".to_string());
        return Err("npm build falló. Verifica en una terminal.".to_string());
    }
    log.push("build=ok".to_string());

    // 5. Signal frontend to reload
    emit_progress("reload", "Actualización lista. Recargando...");
    log.push("done=ready".to_string());

    Ok(log)
}
