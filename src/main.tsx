import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

type FighterId = "goku" | "vegeta";
type Screen = "main" | "story" | "deck" | "character" | "cards" | "battle";
type BattlePhase = "position" | "command" | "card" | "resolve" | "enemy" | "win" | "lose";
type BattleCommand = "LIMIT" | "J" | "B" | "C";
type Pose = "idle" | "power" | "beam" | "hurt" | "guard";
type RangePosition = "front" | "back";
type HeightPosition = "ground" | "air";

type Card = {
  id: string;
  number: number;
  name: string;
  type: "command" | "damage" | "beam" | "support" | "defense" | "special";
  command: BattleCommand;
  attack: number;
  accuracy: number;
  cc: number;
  rarity: number;
  text: string;
};

type Fighter = {
  id: FighterId;
  name: string;
  level: number;
  hp: number;
  maxHp: number;
  cc: number;
  maxCc: number;
  str: number;
  ki: number;
  spd: number;
  pose: Pose;
  range: RangePosition;
  height: HeightPosition;
  powerTurns: number;
  guardTurns: number;
};

const cards: Card[] = [
  { id: "3-stage", number: 1, name: "3 Stage Atk.", type: "command", command: "B", attack: 14, accuracy: 95, cc: 0, rarity: 1, text: "Short physical chain. Builds CC." },
  { id: "4-stage", number: 2, name: "4 Stage Atk.", type: "command", command: "B", attack: 18, accuracy: 88, cc: 0, rarity: 1, text: "Longer chain. Builds CC." },
  { id: "5-stage", number: 3, name: "5 Stage Atk.", type: "command", command: "B", attack: 23, accuracy: 80, cc: 0, rarity: 2, text: "Riskier physical combo." },
  { id: "kamehameha", number: 12, name: "Kamehameha", type: "beam", command: "J", attack: 22, accuracy: 82, cc: 3, rarity: 2, text: "Beam technique. Stronger from back/air." },
  { id: "s-kamehameha", number: 13, name: "S.Kamehameha", type: "special", command: "LIMIT", attack: 34, accuracy: 72, cc: 5, rarity: 3, text: "Limit beam. Needs Power Up." },
  { id: "final-flash", number: 23, name: "Final Flash", type: "beam", command: "LIMIT", attack: 38, accuracy: 68, cc: 6, rarity: 3, text: "Heavy beam attack." },
  { id: "big-bang", number: 24, name: "Big Bang", type: "beam", command: "LIMIT", attack: 32, accuracy: 78, cc: 5, rarity: 3, text: "Explosive ki attack." },
  { id: "guard", number: 121, name: "Endurance", type: "defense", command: "J", attack: 0, accuracy: 100, cc: 1, rarity: 2, text: "Guard for the next enemy phase." },
  { id: "afterimage", number: 125, name: "Avoiding", type: "defense", command: "J", attack: 0, accuracy: 100, cc: 2, rarity: 2, text: "Improves evasion this phase." },
  { id: "reading-ki", number: 119, name: "Reading Ki", type: "support", command: "J", attack: 0, accuracy: 100, cc: 2, rarity: 2, text: "Raises accuracy and timing." },
  { id: "power-up", number: 90, name: "Power Up", type: "support", command: "C", attack: 0, accuracy: 100, cc: 0, rarity: 1, text: "Gain CC and enable limits." },
  { id: "move", number: 91, name: "Change Pos.", type: "support", command: "C", attack: 0, accuracy: 100, cc: 0, rarity: 1, text: "Switch front/back and ground/air." }
];

const defaultDeckIds = [
  "3-stage", "3-stage", "3-stage",
  "4-stage", "4-stage", "4-stage",
  "5-stage", "5-stage",
  "kamehameha", "kamehameha", "kamehameha",
  "s-kamehameha", "s-kamehameha",
  "guard", "guard", "guard",
  "afterimage", "reading-ki",
  "power-up", "move"
];

const characters = [
  { id: "goku" as const, name: "Goku", level: 38, hp: 312, str: 42, ki: 47, spd: 39, limits: ["S.Kamehameha", "Spirit Bomb", "Kaioken"] },
  { id: "vegeta" as const, name: "Vegeta", level: 39, hp: 304, str: 45, ki: 44, spd: 41, limits: ["Galick Gun", "Big Bang", "Final Flash"] }
];

function makeFighter(id: FighterId): Fighter {
  const base = characters.find((character) => character.id === id)!;
  return {
    id,
    name: base.name,
    level: base.level,
    hp: base.hp,
    maxHp: base.hp,
    cc: 8,
    maxCc: 40,
    str: base.str,
    ki: base.ki,
    spd: base.spd,
    pose: id === "goku" ? "idle" : "guard",
    range: id === "goku" ? "front" : "back",
    height: "ground",
    powerTurns: 0,
    guardTurns: 0
  };
}

function App() {
  const [screen, setScreen] = useState<Screen>("main");
  const [selectedCharacter, setSelectedCharacter] = useState<FighterId>("goku");
  const [deckIds, setDeckIds] = useState<string[]>(defaultDeckIds);
  const [player, setPlayer] = useState(() => makeFighter("goku"));
  const [enemy, setEnemy] = useState(() => makeFighter("vegeta"));
  const [phase, setPhase] = useState<BattlePhase>("position");
  const [activeCommand, setActiveCommand] = useState<BattleCommand>("B");
  const [log, setLog] = useState("Set position, then choose a command.");
  const [turn, setTurn] = useState(1);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [floatingText, setFloatingText] = useState("");

  const hand = useMemo(() => {
    const unique = [...new Set(deckIds)];
    return unique.slice(0, 5).map((id) => cards.find((card) => card.id === id)!).filter(Boolean);
  }, [deckIds]);

  const commandCards = useMemo(() => hand.filter((card) => card.command === activeCommand), [activeCommand, hand]);

  const reset = () => {
    setPlayer(makeFighter(selectedCharacter));
    setEnemy(makeFighter(selectedCharacter === "goku" ? "vegeta" : "goku"));
    setPhase("position");
    setActiveCommand("B");
    setLog("Set position, then choose a command.");
    setTurn(1);
    setSelectedCard(null);
    setFloatingText("");
  };

  const startBattle = () => {
    reset();
    setScreen("battle");
  };

  if (screen !== "battle") {
    return (
      <MenuShell
        deckIds={deckIds}
        screen={screen}
        selectedCharacter={selectedCharacter}
        onDeckChange={setDeckIds}
        onScreenChange={setScreen}
        onSelectCharacter={setSelectedCharacter}
        onStartBattle={startBattle}
      />
    );
  }

  const setPosition = (range: RangePosition, height: HeightPosition) => {
    if (phase !== "position") return;
    setPlayer((current) => ({ ...current, range, height }));
    setPhase("command");
    setLog(`${range.toUpperCase()} / ${height.toUpperCase()} selected.`);
  };

  const chooseCommand = (command: BattleCommand) => {
    if (phase !== "command" && phase !== "card") return;
    setActiveCommand(command);
    setPhase("card");
    setLog(command === "B" ? "Choose a command chain." : command === "J" ? "Choose support/defense/beam." : command === "C" ? "Choose Power Up or movement." : "Choose a limit technique.");
  };

  const endPlayerAction = (nextPlayer: Fighter, nextEnemy: Fighter, message: string, card: Card, damage: number) => {
    setSelectedCard(card);
    setPlayer({ ...nextPlayer, pose: card.type === "defense" ? "guard" : card.id === "power-up" ? "power" : card.attack > 0 ? "beam" : "idle" });
    setEnemy({ ...nextEnemy, pose: damage > 0 ? "hurt" : "guard" });
    setFloatingText(damage > 0 ? `-${damage}` : card.id === "power-up" ? "+8 CC" : "GUARD");
    setLog(message);
    setPhase("resolve");

    window.setTimeout(() => {
      setPlayer((current) => ({ ...current, pose: "idle" }));
      setEnemy((current) => ({ ...current, pose: current.hp <= 0 ? "hurt" : "guard" }));
      setFloatingText("");
    }, 520);

    if (nextEnemy.hp <= 0) {
      window.setTimeout(() => {
        setPhase("win");
        setLog("Victory. Card reward pending.");
      }, 880);
      return;
    }

    window.setTimeout(() => {
      setPhase("enemy");
      setLog(`${nextEnemy.name} prepares a counter.`);
      setEnemy((currentEnemy) => ({ ...currentEnemy, pose: "beam" }));
      setPlayer((current) => ({ ...current, pose: current.guardTurns > 0 ? "guard" : "hurt" }));
    }, 880);

    window.setTimeout(() => {
      setPlayer((current) => {
        const guarded = current.guardTurns > 0;
        const baseDamage = guarded ? 8 : 20;
        const nextHp = Math.max(0, current.hp - baseDamage);
        if (nextHp <= 0) {
          setPhase("lose");
          setLog(`${current.name} is down.`);
        } else {
          setPhase("position");
          setLog("Set position, then choose a command.");
          setTurn((value) => value + 1);
        }
        setFloatingText(guarded ? "GUARD -8" : "-20");
        return {
          ...current,
          hp: nextHp,
          cc: Math.min(current.maxCc, current.cc + 4),
          pose: "idle",
          guardTurns: Math.max(0, current.guardTurns - 1),
          powerTurns: Math.max(0, current.powerTurns - 1)
        };
      });
      setEnemy((current) => ({ ...current, cc: Math.min(current.maxCc, current.cc + 3), pose: "guard" }));
      setSelectedCard(null);
      window.setTimeout(() => setFloatingText(""), 420);
    }, 1350);
  };

  const playCard = (card: Card) => {
    if (phase !== "card" || player.cc < card.cc) return;
    if (card.command === "LIMIT" && player.powerTurns <= 0) {
      setLog("Power Up is required before Limit.");
      return;
    }

    const positionBonus = player.range === "back" && ["beam", "special"].includes(card.type) ? 5 : 0;
    const heightBonus = player.height === "air" && card.type === "beam" ? 4 : 0;
    const generatedCc = card.command === "B" ? 7 : card.id === "power-up" ? 8 : 2;
    const hit = card.accuracy >= 100 || Math.floor(Math.random() * 100) < card.accuracy;
    const damage = card.attack > 0 && hit ? Math.max(1, card.attack + positionBonus + heightBonus + (player.powerTurns > 0 ? 6 : 0)) : 0;

    const nextPlayer: Fighter = {
      ...player,
      cc: Math.min(player.maxCc, player.cc - card.cc + generatedCc),
      powerTurns: card.id === "power-up" ? 3 : player.powerTurns,
      guardTurns: card.type === "defense" ? 2 : player.guardTurns,
      range: card.id === "move" ? (player.range === "front" ? "back" : "front") : player.range,
      height: card.id === "move" ? (player.height === "ground" ? "air" : "ground") : player.height
    };
    const nextEnemy = { ...enemy, hp: Math.max(0, enemy.hp - damage) };
    const message = !hit ? `${card.name} missed.` : card.id === "power-up" ? `${player.name} powers up.` : card.id === "move" ? `${player.name} changes position.` : `${player.name} used ${card.name}.`;

    endPlayerAction(nextPlayer, nextEnemy, message, card, damage);
  };

  return (
    <main className="game-shell">
      <header className="topbar">
        <strong>dbz-lsw-fangame</strong>
        <span>Turn {turn} / Phase {phase.toUpperCase()}</span>
        <button type="button" onClick={() => setScreen("main")}>Menu</button>
      </header>

      <section className="battle-stage" aria-label="Battle screen">
        <div className="top-status">
          <CombatantPanel fighter={player} side="player" />
          <CombatantPanel fighter={enemy} side="enemy" />
        </div>

        <div className="battlefield">
          <div className="layer sky" />
          <div className="layer mountains" />
          <div className="layer arena" />
          <FighterSprite fighter={player} side="player" active={phase === "resolve"} />
          <FighterSprite fighter={enemy} side="enemy" active={phase === "enemy"} />
          <div className={`beam-effect ${selectedCard && selectedCard.attack > 0 ? "active" : ""} ${phase === "enemy" ? "reverse" : ""}`} />
          <img alt="" className={`impact-effect ${floatingText.startsWith("-") ? "active" : ""}`} src="/assets/sprites/fx_impact.png" />
          {floatingText && <div className="floating-text">{floatingText}</div>}
        </div>

        <div className="battle-controls">
          {phase === "position" ? (
            <div className="position-pad">
              <button type="button" onClick={() => setPosition("back", "air")}>AIR/BACK</button>
              <button type="button" onClick={() => setPosition("front", "air")}>AIR/FRONT</button>
              <button type="button" onClick={() => setPosition("back", "ground")}>GROUND/BACK</button>
              <button type="button" onClick={() => setPosition("front", "ground")}>GROUND/FRONT</button>
            </div>
          ) : (
            <div className="position-status">
              <span>POSITION</span>
              <strong>{player.height.toUpperCase()} / {player.range.toUpperCase()}</strong>
            </div>
          )}

          <div className="command-strip">
            {(["LIMIT", "J", "B", "C"] as BattleCommand[]).map((command) => (
              <button className={activeCommand === command ? "active" : ""} disabled={phase !== "command" && phase !== "card"} key={command} type="button" onClick={() => chooseCommand(command)}>
                {command}
              </button>
            ))}
          </div>

          <div className="message-window">
            <strong>{selectedCard?.name ?? "Your turn"}</strong>
            <span>{log}</span>
            <em>CC {player.cc}/{player.maxCc}</em>
          </div>
        </div>
      </section>

      <section className="hand-area">
        {commandCards.length === 0 && <div className="empty-hand">No cards for {activeCommand}. Choose another command.</div>}
        <div className="hand">
          {commandCards.map((card, index) => (
            <button
              className={`card type-${card.type} ${player.cc < card.cc || phase !== "card" ? "disabled" : ""}`}
              key={card.id}
              style={{ "--fan": `${index - 2}` } as React.CSSProperties}
              type="button"
              onClick={() => playCard(card)}
            >
              <span>#{card.number.toString().padStart(3, "0")} / {card.type}</span>
              <strong>{card.name}</strong>
              <i>{card.text}</i>
              <small>ATK {card.attack} / ACC {card.accuracy}% / CC {card.cc}</small>
              <em>{"*".repeat(card.rarity)}</em>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}

function MenuShell({
  deckIds,
  screen,
  selectedCharacter,
  onDeckChange,
  onScreenChange,
  onSelectCharacter,
  onStartBattle
}: {
  deckIds: string[];
  screen: Screen;
  selectedCharacter: FighterId;
  onDeckChange: (next: string[]) => void;
  onScreenChange: (next: Screen) => void;
  onSelectCharacter: (next: FighterId) => void;
  onStartBattle: () => void;
}) {
  return (
    <main className="menu-shell">
      <section className="menu-frame">
        <header className="title-screen">
          <strong>DRAGON BALL Z</strong>
          <span>LEGENDARY SUPER WARRIORS ONLINE</span>
        </header>

        <nav className="main-menu">
          {[
            ["main", "Continue"],
            ["story", "Story"],
            ["deck", "Deck"],
            ["character", "Characters"],
            ["cards", "Cards"]
          ].map(([id, label]) => (
            <button className={screen === id ? "active" : ""} key={id} type="button" onClick={() => onScreenChange(id as Screen)}>{label}</button>
          ))}
          <button type="button" onClick={onStartBattle}>Battle</button>
        </nav>

        {screen === "main" && <MainMenuPanel selectedCharacter={selectedCharacter} deckCount={deckIds.length} onStartBattle={onStartBattle} />}
        {screen === "story" && <StoryPanel onStartBattle={onStartBattle} />}
        {screen === "deck" && <DeckEditor deckIds={deckIds} onDeckChange={onDeckChange} />}
        {screen === "character" && <CharacterEditor selectedCharacter={selectedCharacter} onSelectCharacter={onSelectCharacter} />}
        {screen === "cards" && <CardCollection />}
      </section>
    </main>
  );
}

function MainMenuPanel({ selectedCharacter, deckCount, onStartBattle }: { selectedCharacter: FighterId; deckCount: number; onStartBattle: () => void }) {
  const character = characters.find((item) => item.id === selectedCharacter)!;
  return (
    <div className="menu-panel two-col">
      <div>
        <span>Selected Fighter</span>
        <strong>{character.name}</strong>
        <img alt="" className="menu-character" src={`/assets/sprites/${character.id}_idle.png`} />
      </div>
      <div>
        <span>Battle Setup</span>
        <strong>Deck {deckCount}/20</strong>
        <code>LV {character.level} / HP {character.hp} / STR {character.str} / KI {character.ki} / SPD {character.spd}</code>
        <button type="button" onClick={onStartBattle}>Enter Battle</button>
      </div>
    </div>
  );
}

function StoryPanel({ onStartBattle }: { onStartBattle: () => void }) {
  const chapters = ["Saiyans", "Namek", "Androids", "Cell", "Future", "Majin Buu"];
  return (
    <div className="menu-panel">
      <span>Story map prototype</span>
      <div className="story-map">
        {chapters.map((chapter, index) => (
          <button key={chapter} type="button" onClick={onStartBattle}>
            <strong>{chapter}</strong>
            <small>{index < 2 ? "Clear" : index === 2 ? "Next" : "Locked"}</small>
          </button>
        ))}
      </div>
    </div>
  );
}

function DeckEditor({ deckIds, onDeckChange }: { deckIds: string[]; onDeckChange: (next: string[]) => void }) {
  const countCard = (cardId: string) => deckIds.filter((id) => id === cardId).length;
  const addCard = (cardId: string) => {
    if (deckIds.length < 20 && countCard(cardId) < 3) onDeckChange([...deckIds, cardId]);
  };
  const removeCard = (cardId: string) => {
    const index = deckIds.indexOf(cardId);
    if (index >= 0) onDeckChange(deckIds.filter((_, currentIndex) => currentIndex !== index));
  };

  return (
    <div className="menu-panel deck-editor">
      <span>Deck Edit / {deckIds.length}/20 cards / max 3 copies</span>
      <div className="collection-grid">
        {cards.map((card) => (
          <article className={`mini-card type-${card.type}`} key={card.id}>
            <strong>{card.name} x{countCard(card.id)}</strong>
            <small>{card.command} / ATK {card.attack} / ACC {card.accuracy}% / CC {card.cc}</small>
            <div>
              <button type="button" onClick={() => removeCard(card.id)}>-</button>
              <button type="button" onClick={() => addCard(card.id)}>+</button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function CharacterEditor({ selectedCharacter, onSelectCharacter }: { selectedCharacter: FighterId; onSelectCharacter: (next: FighterId) => void }) {
  return (
    <div className="menu-panel">
      <span>Character / Techniques</span>
      <div className="character-list">
        {characters.map((character) => (
          <button className={selectedCharacter === character.id ? "active" : ""} key={character.id} type="button" onClick={() => onSelectCharacter(character.id)}>
            <img alt="" src={`/assets/sprites/${character.id}_idle.png`} />
            <strong>{character.name}</strong>
            <small>LV {character.level} / HP {character.hp} / STR {character.str} / KI {character.ki} / SPD {character.spd}</small>
            <code>{character.limits.join(" / ")}</code>
          </button>
        ))}
      </div>
    </div>
  );
}

function CardCollection() {
  return (
    <div className="menu-panel">
      <span>Card Collection / prototype subset</span>
      <div className="collection-grid">
        {cards.map((card) => (
          <article className={`mini-card type-${card.type}`} key={card.id}>
            <span>#{card.number.toString().padStart(3, "0")}</span>
            <strong>{card.name}</strong>
            <small>{card.type} / {card.command} / ATK {card.attack} / ACC {card.accuracy}% / CC {card.cc}</small>
          </article>
        ))}
      </div>
    </div>
  );
}

function CombatantPanel({ fighter, side }: { fighter: Fighter; side: "player" | "enemy" }) {
  return (
    <div className={`combatant-panel ${side}`}>
      <div>
        <strong>{fighter.name}</strong>
        <span>LV {fighter.level}</span>
      </div>
      <div className="meter hp"><i style={{ width: `${(fighter.hp / fighter.maxHp) * 100}%` }} /></div>
      <small>HP {fighter.hp}/{fighter.maxHp}</small>
      <small>STR {fighter.str} / KI {fighter.ki} / SPD {fighter.spd}</small>
      <small>{fighter.range.toUpperCase()} / {fighter.height.toUpperCase()} / CC {fighter.cc}</small>
    </div>
  );
}

function FighterSprite({ fighter, side, active }: { fighter: Fighter; side: "player" | "enemy"; active: boolean }) {
  return (
    <img
      alt=""
      className={`fighter-sprite ${side} ${fighter.height} ${fighter.range} ${active ? "active" : ""}`}
      src={`/assets/sprites/${fighter.id}_${fighter.pose}.png`}
    />
  );
}

const container = document.getElementById("root")! as HTMLElement & {
  __dbzlswRoot?: ReturnType<typeof createRoot>;
};

container.__dbzlswRoot ??= createRoot(container);
container.__dbzlswRoot.render(<App />);
