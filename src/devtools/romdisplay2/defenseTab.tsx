// ROM Display Lab 2.0 — tab DEFENSE.
// 11 cartas con regla ROM (CA83) + perfil de presentación defensiva
// (slot8Status: CONSUMED_BY_OFFENSE / PRELOADED_NOT_STARTED_GLOBAL_STATIC /
// NO_SLOT8) + romCA53 + macro. Verifica visualmente que una Teleport
// preload-only no se inventa animación propia.
import { useMemo, useState } from 'react';
import { DEFENSE_ROM_RULES, DEFENSE_CARD_IDS, type DefenseRomRuleDescriptor } from '../../battle/engine/rom/romDescriptors';
import { romDefensePresentationProfile } from '../../battle/romDefensePresentationProfile';
import { getCard } from '../../data/cards';
import { FieldRow, Hex, MappingPill, Mono, SectionTitle, type MappingStatus } from './common';

const CA83_BITS: { bit: number; name: string }[] = [
  { bit: 0x01, name: 'Taiyoken / Shockwave (anulación CA53=1)' },
  { bit: 0x02, name: 'IT / Avoiding (CA53=1, dmg 0)' },
  { bit: 0x04, name: 'Barrier / Breath (CA53=3, dmg 0)' },
  { bit: 0x08, name: 'Energy Absorb (CA53=4, heal=beam power)' },
  { bit: 0x10, name: 'Endurance (CA53=2 atenuado, dmg=CC_cost)' },
  { bit: 0x40, name: 'Time Freeze / Telepathy / Foresight (clear $CA6A..$CA73)' },
];

function slot8StatusToMapping(s: string): MappingStatus {
  switch (s) {
    case 'CONSUMED_BY_OFFENSE': return 'RUNTIME';
    case 'PRELOADED_NOT_STARTED_GLOBAL_STATIC': return 'SHARED';
    default: return 'EXACT';
  }
}

export function DefenseTab() {
  const [index, setIndex] = useState(0);
  const cardId = DEFENSE_CARD_IDS[index] ?? 19;
  const rule: DefenseRomRuleDescriptor = DEFENSE_ROM_RULES[cardId];
  const profile = useMemo(() => romDefensePresentationProfile(cardId) ?? null, [cardId]);
  const card = getCard(cardId);

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '8px 12px' }}>
        <button onClick={() => setIndex((i) => Math.max(0, i - 1))}>‹ Prev</button>
        <strong>Defense {index + 1}/{DEFENSE_CARD_IDS.length} — #{cardId} {card?.name}</strong>
        <button onClick={() => setIndex((i) => Math.min(DEFENSE_CARD_IDS.length - 1, i + 1))}>Next ›</button>
        <span style={{ opacity: 0.7, fontSize: 13 }}>CA83 <Hex value={rule.ca83} /> · CA53 {rule.resultFamily}</span>
      </div>

      {profile ? (
      <div style={{ display: 'flex', gap: 24, padding: 12, flexWrap: 'wrap' }}>
        <div>
          <SectionTitle>CANONICAL ASSET</SectionTitle>
          <img src={`/assets/cards/icons2/icon_${String(cardId).padStart(3, '0')}.png`} alt={card?.name} style={{ imageRendering: 'pixelated', border: '1px solid #555', width: 96 }} />
          <div style={{ fontSize: 12, opacity: 0.7 }}>{card?.name} · {card?.type}</div>
        </div>

        <div style={{ minWidth: 320 }}>
          <SectionTitle>ROM RULE (CA83)</SectionTitle>
          <FieldRow label="CA83" value={<Hex value={rule.ca83} />} status="EXACT" />
          <FieldRow label="resultFamily (CA53)" value={<Mono>{rule.resultFamily}</Mono>} status="EXACT" />
          <FieldRow label="result" value={<Mono>{rule.result}</Mono>} />
          <div style={{ marginTop: 6, fontSize: 12, opacity: 0.85 }}><strong>Regla:</strong> {rule.rule}</div>
          <div style={{ marginTop: 8 }}>
            {CA83_BITS.filter((b) => (rule.ca83 & b.bit) !== 0).map((b) => (
              <div key={b.bit} style={{ fontSize: 12, padding: '1px 0' }}>• bit <Hex value={b.bit} /> — {b.name}</div>
            ))}
          </div>
        </div>

        <div style={{ minWidth: 320 }}>
          <SectionTitle>PRESENTATION PROFILE (slot8)</SectionTitle>
          <FieldRow label="slot8Status" value={<Mono>{profile.slot8Status}</Mono>} status={slot8StatusToMapping(profile.slot8Status)} />
          <FieldRow label="slot8StartAddress" value={<Mono>{profile.slot8StartAddress ?? '—'}</Mono>} />
          <FieldRow label="romCA53" value={<Mono>{profile.romCA53}</Mono>} status="EXACT" />
          <FieldRow label="semanticOutcome" value={<Mono>{profile.semanticOutcome}</Mono>} />
          <FieldRow label="cues" value={<Mono>{profile.cues.length}</Mono>} />
          <div style={{ marginTop: 8, fontSize: 11, opacity: 0.6 }}>
            {profile.slot8Status === 'PRELOADED_NOT_STARTED_GLOBAL_STATIC'
              ? 'Preload global estático: el slot8 se carga pero NO arranca una animación propia — verificación anti-invención.'
              : profile.slot8Status === 'CONSUMED_BY_OFFENSE'
                ? 'El slot8 puede ser consumido por la ofensiva (start global).'
                : 'Sin slot8: la defensa no usa slot de animación.'}
          </div>
        </div>

        <div style={{ minWidth: 260 }}>
          <SectionTitle>RUNTIME</SectionTitle>
          <FieldRow label="defenseFamily" value={<Mono>{profile.resultFamily === 3 || profile.resultFamily === 4 ? 'slot8-driven' : 'no-slot8'}</Mono>} status={profile.slot8Status === 'NO_SLOT8' ? 'EXACT' : 'SHARED'} />
          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
            Sunglasses (#109) contraea Taiyoken: CA83 $01 → $81 (bypass). El runtime despacha PLAY_DEFENSE_CARD y el Engine deriva la rama por
            romCA53 — nunca por nombre humano.
          </div>
        </div>
      </div>
      ) : (
        <div style={{ padding: 12, opacity: 0.6, fontSize: 13 }}>Sin perfil de presentación defensiva para #{cardId}.</div>
      )}
    </div>
  );
}
