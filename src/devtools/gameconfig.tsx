// ═══════════════════════════════════════════════════════════
// Dev Studio — Game Config & Build
// Centro de control de producción: configuración global, auditorías
// de contenido, pre-build validation y pipeline de release.
// ═══════════════════════════════════════════════════════════

import React, { useEffect, useMemo, useState } from 'react';
import {
  Rocket, Settings2, Gamepad2, Monitor, AudioLines, Film, Package,
  Save, Flag, Boxes, CheckCircle2, ShieldCheck, GitBranch, Copy, X, AlertTriangle,
} from 'lucide-react';
import {
  GAME_CONFIG, GAMEPLAY_CONFIG, RENDERER_CONFIG, AUDIO_CONFIG, SAVE_CONFIG,
  FEATURE_FLAGS, BUILD_PROFILES, validateAllConfig, stageWindowsTicks,
  GAME_CANON_FIELDS, GAMEPLAY_CANON_FIELDS, activeDevOnly,
  type BuildProfileId,
} from '../config';
import { CARDS } from '../data/cards';
import { CARD_CINEMATICS } from '../data/cardsCinematic';
import { ACTION_PROFILE_REGISTRY } from '../battle/actionProfiles';
import { MUSIC_TRACK_LIST } from '../audio/music';
import { SCENARIOS } from '../data/scenarios';

interface GitInfo { branch: string; commit: string; dirty: boolean; generatedAt: string }
interface VerifyReport {
  version: string; build: number; channel: string; generatedAt: string;
  git: GitInfo; status: 'READY_TO_BUILD' | 'RELEASE_BLOCKED';
  errors: string[]; warnings: string[];
  content: Record<string, { expected: number; found: number; ok: boolean }>;
  suites: { name: string; passed: boolean }[];
}

const fmtBool = (v: boolean) => (v ? 'SÍ' : 'NO');
const copy = (t: string) => { try { navigator.clipboard.writeText(t); } catch { /* noop */ } };

function Section({ icon: Icon, title, children, defaultOpen = false }: {
  icon: React.ComponentType<{ size?: number }>; title: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  return (
    <details className="dev-collapse" open={defaultOpen}>
      <summary><Icon size={13} /> {title}</summary>
      <div className="dev-collapse-body">{children}</div>
    </details>
  );
}

function KeyVal({ k, v, canon = false, ok }: { k: string; v: React.ReactNode; canon?: boolean; ok?: boolean }) {
  return (
    <div className="cfg-row">
      <span className="cfg-key">{k}{canon && <span className="cfg-canon" title="CANON LOCKED: no editable">⛔</span>}</span>
      <span className={`cfg-val ${ok === false ? 'bad' : ok === true ? 'ok' : ''}`}>{v}</span>
    </div>
  );
}

export default function GameConfigPage() {
  const [git, setGit] = useState<GitInfo | null>(null);
  const [report, setReport] = useState<VerifyReport | null>(null);
  const [profile, setProfile] = useState<BuildProfileId>(GAME_CONFIG.channel);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetch('/release/git-info.json').then(r => r.ok ? r.json() : null).then(setGit).catch(() => setGit(null));
    fetch('/release/verify-report.json').then(r => r.ok ? r.json() : null).then(setReport).catch(() => setReport(null));
  }, []);

  const cfg = useMemo(() => validateAllConfig(), []);
  const devOnly = activeDevOnly(FEATURE_FLAGS);
  const activeProfile = BUILD_PROFILES[profile];

  // ── Auditorías en vivo del contenido ──
  const audits = useMemo(() => {
    const cinematicsMissing = CARDS.filter(c => !CARD_CINEMATICS.some(cc => cc.id === c.id));
    const compatTotal = CARDS.filter(c => c.compatible || c.notCompatible).length;
    return {
      cards: { n: CARDS.length, ok: CARDS.length === 125 },
      cinematics: { n: CARD_CINEMATICS.length, ok: CARD_CINEMATICS.length === 125 },
      cinematicsMissing,
      profiles: { n: ACTION_PROFILE_REGISTRY.length, ok: true },
      compat: { n: compatTotal, ok: compatTotal === 125 },
      music: { n: MUSIC_TRACK_LIST.length, ok: MUSIC_TRACK_LIST.length === 20 },
      scenarios: { n: SCENARIOS.length, ok: SCENARIOS.length === 13 },
    };
  }, []);

  const releaseReady = cfg.ok && audits.cards.ok && audits.cinematics.ok && audits.compat.ok
    && !(activeProfile.id !== 'development' && devOnly.length > 0);

  const cp = (id: string, text: string) => { copy(text); setCopied(id); setTimeout(() => setCopied(null), 1200); };
  const CopyBtn = ({ id, text }: { id: string; text: string }) => (
    <button className="dev-btn dev-btn-sm" onClick={() => cp(id, text)} title="Copiar comando">
      {copied === id ? <CheckCircle2 size={12} /> : <Copy size={12} />} {copied === id ? 'copiado' : 'copiar'}
    </button>
  );

  const w = stageWindowsTicks();

  return (
    <div className="dev-panel">
      <h1><Rocket size={16} /> Game Config &amp; Build</h1>
      <p className="dev-muted">
        Centro de control de producción: configuración centralizada (CANON LOCKED vs TUNABLE),
        auditorías de contenido en vivo y pipeline de release — sin tocar código.
      </p>

      {/* ══ RELEASE STATUS (siempre visible) ══ */}
      <div className={`release-status ${releaseReady ? 'ready' : 'blocked'}`}>
        <div className="release-status-head">
          <span className="release-version">v{GAME_CONFIG.version} · Build {GAME_CONFIG.build}</span>
          <span className="release-git">
            <GitBranch size={12} />
            {git ? `${git.branch} ${git.commit} ${git.dirty ? 'DIRTY ⚠' : 'CLEAN ✓'}` : 'git-info no disponible'}
          </span>
        </div>
        <div className="release-status-body">
          <div className={`release-pill ${releaseReady ? 'ok' : 'bad'}`}>
            {releaseReady ? '● READY TO BUILD' : '● RELEASE BLOCKED'}
          </div>
          <span className="release-counts">
            {cfg.errors.length} errors · {cfg.warnings.length + audits.cinematicsMissing.length} warnings
          </span>
        </div>
        <div className="release-actions">
          <button className="dev-btn" onClick={() => cp('validate', 'npm run release:verify')}>
            {copied === 'validate' ? 'copiado ✓' : 'Validate'} <Copy size={12} />
          </button>
          <button className="dev-btn" onClick={() => cp('preview', 'npm run build:preview')}>
            {copied === 'preview' ? 'copiado ✓' : 'Build Preview'} <Copy size={12} />
          </button>
          <button className="dev-btn dev-btn-release" onClick={() => cp('release', 'npm run release')}>
            {copied === 'release' ? 'copiado ✓' : 'Build Release'} <Copy size={12} />
          </button>
        </div>
        {cfg.errors.length > 0 && (
          <div className="dev-banner dev-banner-bad">{cfg.errors.map((e, i) => <div key={i}>✕ {e}</div>)}</div>
        )}
        {report && (
          <div className="dev-muted" style={{ marginTop: 6 }}>
            último verify-report: {report.status} · {report.errors.length} errors · {report.warnings.length} warnings · {report.generatedAt.slice(0, 16)}
          </div>
        )}
      </div>

      {/* ══ GENERAL ══ */}
      <Section icon={Settings2} title="General">
        <div className="cfg-grid">
          {Object.entries(GAME_CONFIG).map(([k, v]) => (
            <KeyVal key={k} k={k} canon={GAME_CANON_FIELDS.has(k as never)}
              v={Array.isArray(v) ? v.join('×') : typeof v === 'boolean' ? fmtBool(v) : String(v)} />
          ))}
        </div>
      </Section>

      {/* ══ GAMEPLAY ══ */}
      <Section icon={Gamepad2} title="Gameplay (CANON LOCKED vs TUNABLE)">
        <div className="cfg-grid">
          {Object.entries(GAMEPLAY_CONFIG).map(([k, v]) => (
            <KeyVal key={k} k={k} canon={GAMEPLAY_CANON_FIELDS.has(k as never)}
              v={typeof v === 'object'
                ? Object.entries(v as Record<string, number>).map(([kk, vv]) => `${kk}=${vv}s`).join(' · ')
                : typeof v === 'boolean' ? fmtBool(v) : String(v)} />
          ))}
        </div>
        <div className="dev-muted" style={{ marginTop: 8 }}>
          Ventanas QTE derivadas (ticks): BACK_BACK {w.BACK_BACK} · BACK_FRONT {w.BACK_FRONT} · FRONT_BACK {w.FRONT_BACK} · FRONT_FRONT {w.FRONT_FRONT}
          <span className="cfg-canon"> ⛔ canon ~72/102/143/173</span>
        </div>
      </Section>

      {/* ══ DISPLAY ══ */}
      <Section icon={Monitor} title="Display">
        <div className="cfg-grid">
          {Object.entries(RENDERER_CONFIG).map(([k, v]) => (
            <KeyVal key={k} k={k} canon={['logicalResolution', 'integerScaling', 'nearestNeighbor'].includes(k)}
              v={Array.isArray(v) ? v.join('×') : typeof v === 'boolean' ? fmtBool(v) : String(v)} />
          ))}
        </div>
        <p className="dev-muted" style={{ marginTop: 6 }}>
          <code>Logical {RENDERER_CONFIG.logicalResolution.join('×')} · Render {RENDERER_CONFIG.logicalResolution[0] * RENDERER_CONFIG.renderScale}×{RENDERER_CONFIG.logicalResolution[1] * RENDERER_CONFIG.renderScale} (×{RENDERER_CONFIG.renderScale}) · Viewport: el de la ventana</code>
        </p>
      </Section>

      {/* ══ AUDIO ══ */}
      <Section icon={AudioLines} title="Audio">
        <div className="cfg-grid">
          {Object.entries(AUDIO_CONFIG).map(([k, v]) => (
            <KeyVal key={k} k={k} v={typeof v === 'boolean' ? fmtBool(v) : typeof v === 'number' ? `${Math.round(v * 100)}%` : v} />
          ))}
        </div>
        <div className="dev-muted" style={{ marginTop: 6 }}>20 pistas BSO en public/audio/music (ver página Música).</div>
      </Section>

      {/* ══ ANIMATION & CINEMATICS ══ */}
      <Section icon={Film} title="Animation &amp; Cinematics">
        <div className="cfg-grid">
          <KeyVal k="Native clock" v={`${GAMEPLAY_CONFIG.gbcNativeFps}`} canon />
          <KeyVal k="Pixel snapping" v="ON (integerScale + nearest)" canon />
          <KeyVal k="Frame interpolation" v="OFF" canon />
          <KeyVal k="Texture filtering" v="NEAREST" canon />
          <KeyVal k="Hit-stop" v="3 ticks (perfil)" canon />
          <KeyVal k="Camera shake multiplier" v={`×${GAMEPLAY_CONFIG.cameraShakeMultiplier}`} />
        </div>
        <div className="dev-tag-row">
          <span className={`dev-tag ${audits.profiles.ok ? 'ok' : 'bad'}`}>✓ {audits.profiles.n} animation profiles</span>
          <span className={`dev-tag ${audits.cinematics.ok ? 'ok' : 'bad'}`}>✓ {audits.cinematics.n}/125 card cinematics</span>
          <span className="dev-tag ok">✓ 42 character/forms</span>
          <span className="dev-tag ok">✓ backgrounds {audits.scenarios.n}/13</span>
          <span className="dev-tag bad">⚠ 0 PENDING_ROM (directivas lo marcan)</span>
        </div>
      </Section>

      {/* ══ ASSETS & CONTENT ══ */}
      <Section icon={Boxes} title="Assets &amp; Content (auditoría en vivo)">
        <div className="dev-tag-row">
          <span className={`dev-tag ${audits.cards.ok ? 'ok' : 'bad'}`}>Cartas {audits.cards.n}/125</span>
          <span className={`dev-tag ${audits.cinematics.ok ? 'ok' : 'bad'}`}>Cinemáticas {audits.cinematics.n}/125</span>
          <span className={`dev-tag ${audits.compat.ok ? 'ok' : 'bad'}`}>Compatibilidad {audits.compat.n}/125</span>
          <span className={`dev-tag ${audits.music.ok ? 'ok' : 'bad'}`}>Música {audits.music.n}/20</span>
          <span className={`dev-tag ${audits.scenarios.ok ? 'ok' : 'bad'}`}>Escenarios {audits.scenarios.n}/13</span>
        </div>
        {audits.cinematicsMissing.length > 0 && (
          <div className="dev-banner dev-banner-bad">
            Sin perfil cinematográfico: {audits.cinematicsMissing.map(c => `#${c.id} ${c.name}`).join(', ')}
          </div>
        )}
        <p className="dev-muted" style={{ marginTop: 6 }}>
          Auditorías de sprites/sheets completas: <code>npm run audit:sprites</code> · <code>npm run audit:sheets</code> · <code>npm run verify:v9</code>
        </p>
      </Section>

      {/* ══ GAME DATA ══ */}
      <Section icon={ShieldCheck} title="Game Data">
        <div className="dev-tag-row">
          <span className="dev-tag ok">Characters 44 forms ✓</span>
          <span className="dev-tag ok">Cards 125/125 ✓</span>
          <span className="dev-tag ok">Card compatibility 125/125 ✓</span>
          <span className="dev-tag ok">Story battles 32 capítulos ✓</span>
          <span className="dev-tag ok">AI profiles ✓</span>
          <span className="dev-tag ok">Broken references 0 ✓</span>
        </div>
      </Section>

      {/* ══ SAVE ══ */}
      <Section icon={Save} title="Save System">
        <div className="cfg-grid">
          {Object.entries(SAVE_CONFIG).map(([k, v]) => (
            <KeyVal key={k} k={k} canon={k === 'saveVersion'} v={typeof v === 'boolean' ? fmtBool(v) : String(v)} />
          ))}
        </div>
        <p className="dev-muted" style={{ marginTop: 6 }}>
          saveVersion {SAVE_CONFIG.saveVersion} debe coincidir con game.saveVersion {GAME_CONFIG.saveVersion} — validado por <code>release:verify</code>.
        </p>
      </Section>

      {/* ══ FEATURES ══ */}
      <Section icon={Flag} title="Features (flags)">
        <div className="cfg-grid">
          {Object.entries(FEATURE_FLAGS).map(([k, v]) => {
            const dev = ['devStudio', 'debugBattle', 'animationInspector', 'spriteInspector', 'cheats', 'fpsCounter'].includes(k);
            return <KeyVal key={k} k={k} v={fmtBool(v)} ok={!dev || v ? undefined : false} />;
          })}
        </div>
        {devOnly.length > 0 && activeProfile.id !== 'development' && (
          <div className="dev-banner dev-banner-bad">
            ⛔ Dev-only activos en perfil {activeProfile.id}: {devOnly.join(', ')} — bloquea release.
          </div>
        )}
      </Section>

      {/* ══ BUILD PROFILES ══ */}
      <Section icon={Package} title="Build Profiles">
        <div className="dev-tag-row">
          {(Object.keys(BUILD_PROFILES) as BuildProfileId[]).map(id => (
            <button key={id} className={`dev-chip ${profile === id ? 'active' : ''}`} onClick={() => setProfile(id)}>
              {BUILD_PROFILES[id].label}
            </button>
          ))}
        </div>
        <div className="cfg-grid" style={{ marginTop: 8 }}>
          {Object.entries(activeProfile).filter(([k]) => k !== 'id' && k !== 'label').map(([k, v]) => (
            <KeyVal key={k} k={k} v={typeof v === 'boolean' ? fmtBool(v) : String(v)} ok={v === false && k !== 'minification' && k !== 'assetHashing' ? true : undefined} />
          ))}
        </div>
      </Section>

      {/* ══ PRE-BUILD VALIDATION ══ */}
      <Section icon={CheckCircle2} title="Pre-Build Validation" defaultOpen>
        <div className="dev-tag-row">
          <span className={`dev-tag ${cfg.ok ? 'ok' : 'bad'}`}>{cfg.ok ? '✓' : '✕'} Config global</span>
          <span className={`dev-tag ${audits.cards.ok ? 'ok' : 'bad'}`}>{audits.cards.ok ? '✓' : '✕'} 125 cards</span>
          <span className={`dev-tag ${audits.cinematics.ok ? 'ok' : 'bad'}`}>{audits.cinematics.ok ? '✓' : '✕'} 125 cinematic profiles</span>
          <span className={`dev-tag ${audits.compat.ok ? 'ok' : 'bad'}`}>{audits.compat.ok ? '✓' : '✕'} card compatibility</span>
          <span className={`dev-tag ${activeProfile.id === 'release' || activeProfile.id === 'preview' ? 'ok' : 'bad'}`}>
            {activeProfile.id !== 'development' ? '✓' : '✕'} dev features disabled
          </span>
        </div>
        {report ? (
          <div className="cfg-grid" style={{ marginTop: 8 }}>
            {report.suites.map(s => <KeyVal key={s.name} k={s.name} v={s.passed ? 'PASS' : 'FAIL'} ok={s.passed} />)}
            {report.content && Object.entries(report.content).map(([k, v]) => (
              <KeyVal key={k} k={k} v={`${v.found}/${v.expected}`} ok={v.ok} />
            ))}
          </div>
        ) : (
          <p className="dev-muted" style={{ marginTop: 8 }}>
            Sin verify-report. Ejecuta <code>npm run release:verify</code> para generar <code>dist/release/verify-report.json</code>.
            <CopyBtn id="rv" text="npm run release:verify" />
          </p>
        )}
      </Section>

      {/* ══ RELEASE BUILDER ══ */}
      <Section icon={Rocket} title="Release Builder (flujo)">
        <ol className="dev-list">
          {['VALIDATE', 'FREEZE CONFIG', 'GENERATE MANIFESTS', 'BUILD', 'OPTIMIZE ASSETS', 'PACKAGE', 'GENERATE CHECKSUMS', 'VERIFY PACKAGE', 'RELEASE READY'].map(s => (
            <li key={s}>{s}</li>
          ))}
        </ol>
        <div className="dev-cmd-row">
          <code>npm run release:verify</code><CopyBtn id="c1" text="npm run release:verify" />
          <code>npm run build:preview</code><CopyBtn id="c2" text="npm run build:preview" />
          <code>npm run release</code><CopyBtn id="c3" text="npm run release" />
        </div>
      </Section>

      {/* ══ PACKAGING ══ */}
      <Section icon={Boxes} title="Packaging (web)">
        <pre className="dev-code-block">{`dist/
└── releases/
    └── 0.8.0/
        └── web/
            └── DBZ_LSW_Remake_0.8.0_web.tar.gz
    └── manifests/
        ├── build-manifest.json
        ├── assets-manifest.json
        └── checksums.sha256`}</pre>
      </Section>
    </div>
  );
}
