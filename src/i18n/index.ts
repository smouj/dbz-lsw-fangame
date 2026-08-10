// ═══════════════════════════════════════════════════════════
// DBZ LSW — i18n (10 idiomas)
// Estructura: idioma → clave → texto
// Claves anidadas con puntos (ej: 'menu.title')
// ═══════════════════════════════════════════════════════════

export const LANGUAGES = [
  { code: 'en', name: 'English', tag: 'EN' },
  { code: 'zh', name: '中文', tag: '中' },
  { code: 'es', name: 'Español', tag: 'ES' },
  { code: 'hi', name: 'हिन्दी', tag: 'HI' },
  { code: 'ar', name: 'العربية', tag: 'AR' },
  { code: 'pt', name: 'Português', tag: 'PT' },
  { code: 'bn', name: 'বাংলা', tag: 'BN' },
  { code: 'ru', name: 'Русский', tag: 'RU' },
  { code: 'ja', name: '日本語', tag: 'JA' },
  { code: 'fr', name: 'Français', tag: 'FR' },
] as const;

export type LangCode = typeof LANGUAGES[number]['code'];

export const LANG_KEY = 'dbzlsw_lang';
export const DEFAULT_LANG: LangCode = 'en';

export function loadLang(): LangCode {
  try {
    const raw = localStorage.getItem(LANG_KEY);
    if (raw && LANGUAGES.some(l => l.code === raw)) return raw as LangCode;
  } catch { /* noop */ }
  return DEFAULT_LANG;
}

export function saveLang(lang: LangCode) {
  try { localStorage.setItem(LANG_KEY, lang); } catch { /* noop */ }
}

// ═══ Tipos de traducción ═══
// Definimos las claves como un tipo unión para type-safety
export type TKey =
  | 'menu.title' | 'menu.subtitle' | 'menu.story' | 'menu.battle' | 'menu.deck'
  | 'menu.characters' | 'menu.cards' | 'menu.settings' | 'menu.continue'
  | 'menu.footer'
  | 'common.back' | 'common.start' | 'common.fight' | 'common.retry' | 'common.exit'
  | 'common.newBattle' | 'common.notObtained' | 'common.unknown' | 'common.useInBattle'
  | 'story.title' | 'story.start' | 'story.locked' | 'story.notUnlocked'
  | 'story.ch1' | 'story.ch2' | 'story.ch3' | 'story.ch4' | 'story.ch5' | 'story.ch6' | 'story.ch7' | 'story.ch8'
  | 'story.ch9' | 'story.ch10' | 'story.ch11' | 'story.ch12' | 'story.ch13' | 'story.ch14' | 'story.ch15' | 'story.ch16'
  | 'story.ch17' | 'story.ch18' | 'story.ch19' | 'story.ch20' | 'story.ch21' | 'story.ch22' | 'story.ch23' | 'story.ch24'
  | 'story.ch25' | 'story.ch26' | 'story.ch27' | 'story.ch28' | 'story.ch29' | 'story.ch30' | 'story.ch31' | 'story.ch32'
  | 'story.d1' | 'story.d2' | 'story.d3' | 'story.d4' | 'story.d5' | 'story.d6' | 'story.d7' | 'story.d8'
  | 'story.d9' | 'story.d10' | 'story.d11' | 'story.d12' | 'story.d13' | 'story.d14' | 'story.d15' | 'story.d16'
  | 'story.d17' | 'story.d18' | 'story.d19' | 'story.d20' | 'story.d21' | 'story.d22' | 'story.d23' | 'story.d24'
  | 'story.d25' | 'story.d26' | 'story.d27' | 'story.d28' | 'story.d29' | 'story.d30' | 'story.d31' | 'story.d32'
  | 'versus.title' | 'versus.vs'
  | 'deck.title' | 'deck.search' | 'deck.all' | 'deck.yourDeck' | 'deck.count'
  | 'characters.title' | 'characters.form' | 'characters.forms' | 'characters.saga' | 'characters.tier'
  | 'cards.title' | 'cards.collection'
  | 'settings.title' | 'settings.bgmVolume' | 'settings.soundFx' | 'settings.textSpeed'
  | 'settings.screen' | 'settings.controls' | 'settings.language' | 'settings.on' | 'settings.off'
  | 'settings.normal' | 'settings.fast' | 'settings.windowed' | 'settings.fullscreen'
  | 'battle.start' | 'battle.position' | 'battle.selectCommand' | 'battle.selectCard' | 'battle.enemyTurn'
  | 'battle.choosePosition' | 'battle.airBack' | 'battle.airFront' | 'battle.gndBack' | 'battle.gndFront'
  | 'battle.limit' | 'battle.limitHelp' | 'battle.ccInsufficient' | 'battle.hand' | 'battle.turn'
  | 'battle.victory' | 'battle.defeat' | 'battle.exp' | 'battle.hp' | 'battle.defeated'
  | 'battle.miss' | 'battle.guard' | 'battle.uses' | 'battle.dmg' | 'battle.heal' | 'battle.buff'
  | 'cardType.command' | 'cardType.damage' | 'cardType.beam' | 'cardType.support' | 'cardType.defense' | 'cardType.special'
  | 'attr.hp' | 'attr.str' | 'attr.ki' | 'attr.spd'
  | 'battle.strikesFirst' | 'battle.noAlly' | 'battle.blocks' | 'battle.resists' | 'battle.absorbs' | 'battle.defends' | 'battle.gathers' | 'battle.insufficientCc'
  | 'battle.basic' | 'battle.gatherPower' | 'battle.stageAttack' | 'battle.defendAction' | 'battle.moveAction' | 'battle.basicFree' | 'battle.limitedHelp' | 'battle.powerState' | 'battle.back'
  | 'battle.ready' | 'battle.fight' | 'battle.powerOn' | 'battle.vs' | 'battle.forfeit' | 'battle.keyHint';

// ═══ Diccionarios ═══
import { en } from './translations/en';
import { zh } from './translations/zh';
import { es } from './translations/es';
import { hi } from './translations/hi';
import { ar } from './translations/ar';
import { pt } from './translations/pt';
import { bn } from './translations/bn';
import { ru } from './translations/ru';
import { ja } from './translations/ja';
import { fr } from './translations/fr';

export type Dict = Record<TKey, string>;

export const DICTS: Record<LangCode, Dict> = { en, zh, es, hi, ar, pt, bn, ru, ja, fr };

// Fallback: si falta una clave en un idioma, usar inglés
export function translate(lang: LangCode, key: TKey): string {
  return DICTS[lang][key] ?? en[key] ?? key;
}
