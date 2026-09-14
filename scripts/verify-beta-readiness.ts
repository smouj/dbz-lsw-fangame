// ═══════════════════════════════════════════════════════════════════════
// BETA 0.1 — readiness gate
// ═══════════════════════════════════════════════════════════════════════
// The Beta gate freezes gameplay around observable regressions. It deliberately
// does not require the archaeological ROM backlog to reach zero: unresolved
// fidelity is allowed only when the existing production gates show no broken
// frame, no softlock and no failed visual assertion.
//
// Each command below is also part of verify:ci. This wrapper gives the project
// one explicit, reviewable acceptance contract for the Beta milestone.
// ═══════════════════════════════════════════════════════════════════════

import { execFileSync } from 'node:child_process';

interface BetaCheck {
  name: string;
  script: string;
}

const checks: BetaCheck[] = [
  {
    name: 'partida completa 1v1/2v2 (KO y reservas)',
    script: 'verify:full-battle-e2e',
  },
  {
    name: 'estabilidad de sesión (KO + rematch sin softlock)',
    script: 'verify:battle-session-lifecycle',
  },
  {
    name: 'visual de producción (sin FAIL; bloqueos ROM explícitos)',
    script: 'verify:visual-production-gate',
  },
  {
    name: 'integridad de atlas físico ROM (sin frames rotos)',
    script: 'verify:rom-sprite-atlas',
  },
];

const windows = process.platform === 'win32';
let failures = 0;

function tail(output: string): string {
  return output.trim().split(/\r?\n/).slice(-3).join(' · ');
}

console.log('═══ BETA 0.1 — READINESS ═══');
console.log('La deuda ROM no observable queda documentada como POST-BETA; estos gates cubren jugabilidad, visual y estabilidad.');

for (const check of checks) {
  try {
    const command = windows ? (process.env.ComSpec ?? 'cmd.exe') : 'npm';
    const args = windows
      ? ['/d', '/s', '/c', `npm.cmd run ${check.script}`]
      : ['run', check.script];
    const output = execFileSync(command, args, {
      cwd: process.cwd(),
      encoding: 'utf8',
      timeout: 180_000,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    console.log(`PASS ${check.name} — ${tail(output)}`);
  } catch (error) {
    failures++;
    const child = error as { stdout?: string; stderr?: string; message?: string };
    const output = `${child.stdout ?? ''}\n${child.stderr ?? ''}`;
    console.log(`FAIL ${check.name} — ${tail(output) || child.message || 'command failed'}`);
  }
}

if (failures > 0) {
  console.error(`\nBETA 0.1 — FAIL (${failures} gate(s))`);
  process.exitCode = 1;
} else {
  console.log('\nBETA 0.1 — PASS (Beta candidate; fidelity backlog remains explicit and non-blocking)');
}
