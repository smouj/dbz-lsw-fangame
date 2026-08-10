import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

type FighterId = "goku" | "vegeta";
type Screen = "main" | "deck" | "character" | "battle";
type Phase = "command" | "cardSelect" | "resolve" | "enemy" | "win" | "lose";
type BattleCommand = "LIMIT" | "J" | "B" | "C";

type Card = {
  id: string;
  name: string;
  type: "command" | "damage" | "beam" | "support" | "defense" | "special";
  command: BattleCommand;
  attack: number;
  accuracy: number;
  cc: number;
};

type Fighter = {
  id: FighterId;
  name: string;
  hp: number;
  maxHp: number;
  cc: number;
  maxCc: number;
  pose: "idle" | "beam" | "hurt" | "guard";
};

const cards: Card[] = [
  { id: "3-stage", name: "3 Stage Atk.", type: "command", command: "B", attack: 14, accuracy: 95, cc: 0 },
  { id: "4-stage", name: "4 Stage Atk.", type: "command", command: "B", attack: 18, accuracy: 88, cc: 0 },
  { id: "5-stage", name: "5 Stage Atk.", type: "command", command: "B", attack: 23, accuracy: 80, cc: 0 },
  { id: "kamehameha", name: "Kamehameha", type: "beam", command: "J", attack: 22, accuracy: 82, cc: 3 },
  { id: "s-kamehameha", name: "S.Kamehameha", type: "special", command: "LIMIT", attack: 34, accuracy: 72, cc: 5 },
  { id: "final-flash", name: "Final Flash", type: "beam", command: "LIMIT", attack: 38, accuracy: 68, cc: 6 },
  { id: "big-bang", name: "Big Bang", type: "beam", command: "LIMIT", attack: 32, accuracy: 78, cc: 5 },
  { id: "guard", name: "Guard", type: "defense", command: "J", attack: 0, accuracy: 100, cc: 1 },
  { id: "afterimage", name: "Afterimage", type: "defense", command: "J", attack: 0, accuracy: 100, cc: 2 },
  { id: "reading-ki", name: "Reading Ki", type: "support", command: "J", attack: 0, accuracy: 100, cc: 2 },
  { id: "change", name: "Change Position", type: "support", command: "C", attack: 0, accuracy: 100, cc: 0 }
];

const defaultDeckIds = [
  "3-stage", "3-stage", "3-stage",
  "4-stage", "4-stage", "4-stage",
  "5-stage", "5-stage",
  "kamehameha", "kamehameha", "kamehameha",
  "s-kamehameha", "s-kamehameha",
  "guard", "guard", "guard",
  "afterimage", "afterimage",
  "reading-ki",
  "change"
];

const characters = [
  { id: "goku" as const, name: "Goku", hp: 120, power: 16, guard: 12, limits: ["S.Kamehameha", "Spirit Bomb", "Kaioken"] },
  { id: "vegeta" as const, name: "Vegeta", hp: 115, power: 17, guard: 11, limits: ["Galick Gun", "Big Bang", "Final Flash"] }
];

function makeGoku(): Fighter {
  return { id: "goku", name: "Goku", hp: 120, maxHp: 120, cc: 4, maxCc: 8, pose: "idle" };
}

function makeVegeta(): Fighter {
  return { id: "vegeta", name: "Vegeta", hp: 115, maxHp: 115, cc: 4, maxCc: 8, pose: "guard" };
}

function App() {
  const [screen, setScreen] = useState<Screen>("main");
  const [selectedCharacter, setSelectedCharacter] = useState<FighterId>("goku");
  const [deckIds, setDeckIds] = useState<string[]>(defaultDeckIds);
  const [player, setPlayer] = useState(makeGoku);
  const [enemy, setEnemy] = useState(makeVegeta);
  const [phase, setPhase] = useState<Phase>("command");
  const [activeCommand, setActiveCommand] = useState<BattleCommand>("B");
  const [log, setLog] = useState("Choose B, J, LIMIT or C.");
  const [turn, setTurn] = useState(1);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);

  const playableCards = useMemo(() => cards.filter((card) => deckIds.includes(card.id) && card.command === activeCommand), [activeCommand, deckIds]);

  const reset = () => {
    setPlayer(makeGoku());
    setEnemy(makeVegeta());
    setPhase("command");
    setActiveCommand("B");
    setLog("Choose B, J, LIMIT or C.");
    setTurn(1);
    setSelectedCard(null);
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
        onStartBattle={() => {
          reset();
          setScreen("battle");
        }}
      />
    );
  }

  const chooseCommand = (command: BattleCommand) => {
    if (phase !== "command" && phase !== "cardSelect") return;
    setActiveCommand(command);
    setPhase("cardSelect");
    setLog(command === "B" ? "Basic attack selected." : command === "J" ? "Joint/support cards selected." : command === "C" ? "Position command selected." : "Limit cards selected.");
  };

  const playCard = (card: Card) => {
    if (phase !== "cardSelect" || player.cc < card.cc) return;

    setSelectedCard(card);
    setPhase("resolve");
    setPlayer((current) => ({ ...current, cc: Math.min(current.maxCc, current.cc - card.cc + (card.command === "B" ? 3 : 1)), hp: card.id === "guard" ? Math.min(current.maxHp, current.hp + 12) : current.hp, pose: card.id === "guard" || card.id === "change" ? "guard" : "beam" }));
    setEnemy((current) => ({ ...current, pose: card.id === "guard" ? "guard" : "hurt" }));

    const hit = card.accuracy >= 100 || Math.floor(Math.random() * 100) < card.accuracy;
    const damage = ["support", "defense"].includes(card.type) || !hit ? 0 : card.attack;
    setLog(card.id === "change" ? "Goku changes position." : ["support", "defense"].includes(card.type) ? `Goku used ${card.name}.` : hit ? `Goku used ${card.name}.` : `${card.name} missed.`);

    window.setTimeout(() => {
      setEnemy((current) => {
        const nextHp = Math.max(0, current.hp - damage);
        return { ...current, hp: nextHp, pose: nextHp === 0 ? "hurt" : "guard" };
      });
      setPlayer((current) => ({ ...current, pose: "idle" }));
    }, 380);

    window.setTimeout(() => {
      setEnemy((currentEnemy) => {
        if (currentEnemy.hp <= 0) {
          setPhase("win");
          setLog("Battle complete.");
          return currentEnemy;
        }

        setPhase("enemy");
        setLog("Vegeta counters.");
        return { ...currentEnemy, pose: "beam" };
      });
      setPlayer((current) => ({ ...current, pose: "hurt" }));
    }, 760);

    window.setTimeout(() => {
      setPlayer((current) => {
        const nextHp = Math.max(0, current.hp - 10);
        if (nextHp <= 0) {
          setPhase("lose");
          setLog("Goku is down.");
        } else {
          setPhase("command");
          setLog("Choose B, J, LIMIT or C.");
          setTurn((value) => value + 1);
        }
        return { ...current, hp: nextHp, cc: Math.min(current.maxCc, current.cc + 1), pose: "idle" };
      });
      setEnemy((current) => ({ ...current, cc: Math.min(current.maxCc, current.cc + 1), pose: "guard" }));
      setSelectedCard(null);
    }, 1180);
  };

  return (
    <main className="game-shell">
      <header className="topbar">
        <strong>dbz-lsw-fangame</strong>
        <span>Turn {turn}</span>
        <button type="button" onClick={() => setScreen("main")}>Menu</button>
      </header>

      <section className="gb-frame" aria-label="Battle screen">
        <div className="top-status">
          <CombatantPanel fighter={player} side="player" compact />
          <CombatantPanel fighter={enemy} side="enemy" compact />
        </div>
        <div className="battlefield">
          <FighterSprite fighter={enemy} side="enemy" active={phase === "enemy"} />
          <div className={`beam-effect ${phase === "resolve" || phase === "enemy" ? "active" : ""} ${phase === "enemy" ? "reverse" : ""}`} />
          <FighterSprite fighter={player} side="player" active={phase === "resolve"} />
        </div>
        <div className="game-command-strip">
          {(["LIMIT", "J", "B", "C"] as BattleCommand[]).map((command) => (
            <button className={activeCommand === command ? "active" : ""} key={command} type="button" onClick={() => chooseCommand(command)}>
              {command}
            </button>
          ))}
        </div>
        <div className="game-card-window">
          <strong>{selectedCard?.name ?? "Select Card"}</strong>
          <span>{log}</span>
          <em>CC: /{player.maxCc + enemy.maxCc - 3}</em>
        </div>
      </section>

      <section className="command-area">
        <div className="battle-log">
          <span>{phase.toUpperCase()} / {activeCommand}</span>
          <strong>{log}</strong>
        </div>
        <div className="card-grid">
          {playableCards.map((card) => (
            <button
              className={player.cc < card.cc || phase !== "cardSelect" ? "disabled" : ""}
              key={card.id}
              type="button"
              onClick={() => playCard(card)}
            >
              <span>{card.type}</span>
              <strong>{card.name}</strong>
              <small>ATK {card.attack} / ACC {card.accuracy} / CC {card.cc}</small>
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
          <strong>dbz-lsw-fangame</strong>
          <span>Legendary Super Warriors Online Prototype</span>
        </header>

        <nav className="main-menu">
          <button className={screen === "main" ? "active" : ""} type="button" onClick={() => onScreenChange("main")}>Story Battle</button>
          <button className={screen === "deck" ? "active" : ""} type="button" onClick={() => onScreenChange("deck")}>Deck</button>
          <button className={screen === "character" ? "active" : ""} type="button" onClick={() => onScreenChange("character")}>Character</button>
          <button type="button" onClick={onStartBattle}>Start</button>
        </nav>

        {screen === "main" && <MainMenuPanel selectedCharacter={selectedCharacter} deckCount={deckIds.length} onStartBattle={onStartBattle} />}
        {screen === "deck" && <DeckEditor deckIds={deckIds} onDeckChange={onDeckChange} />}
        {screen === "character" && <CharacterEditor selectedCharacter={selectedCharacter} onSelectCharacter={onSelectCharacter} />}
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
        <code>HP {character.hp} / POW {character.power} / GRD {character.guard}</code>
        <button type="button" onClick={onStartBattle}>Enter Battle</button>
      </div>
    </div>
  );
}

function DeckEditor({ deckIds, onDeckChange }: { deckIds: string[]; onDeckChange: (next: string[]) => void }) {
  const countCard = (cardId: string) => deckIds.filter((id) => id === cardId).length;
  const addCard = (cardId: string) => {
    if (deckIds.length < 20 && countCard(cardId) < 3) {
      onDeckChange([...deckIds, cardId]);
    }
  };
  const removeCard = (cardId: string) => {
    const index = deckIds.indexOf(cardId);
    if (index < 0) return;
    onDeckChange(deckIds.filter((_, currentIndex) => currentIndex !== index));
  };

  return (
    <div className="menu-panel">
      <span>Deck Edit / 20 cards / max 3 copies</span>
      <div className="deck-list">
        {cards.map((card) => (
          <div className={countCard(card.id) > 0 ? "deck-row active" : "deck-row"} key={card.id}>
            <div>
              <strong>{card.name} x{countCard(card.id)}</strong>
              <small>{card.command} / {card.type} / ATK {card.attack} / ACC {card.accuracy} / CC {card.cc}</small>
            </div>
            <button type="button" onClick={() => removeCard(card.id)}>-</button>
            <button type="button" onClick={() => addCard(card.id)}>+</button>
          </div>
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
            <small>HP {character.hp} / POW {character.power} / GRD {character.guard}</small>
            <code>{character.limits.join(" / ")}</code>
          </button>
        ))}
      </div>
    </div>
  );
}

function CombatantPanel({ fighter, side, compact = false }: { fighter: Fighter; side: "player" | "enemy"; compact?: boolean }) {
  return (
    <div className={`combatant-panel ${side} ${compact ? "compact" : ""}`}>
      <strong>{fighter.name}</strong>
      <span>HP {fighter.hp}/{fighter.maxHp}</span>
      <div className="meter"><i style={{ width: `${(fighter.hp / fighter.maxHp) * 100}%` }} /></div>
      <small>CC {fighter.cc}/{fighter.maxCc}</small>
    </div>
  );
}

function FighterSprite({ fighter, side, active }: { fighter: Fighter; side: "player" | "enemy"; active: boolean }) {
  const pose = fighter.pose === "guard" && fighter.id === "goku" ? "idle" : fighter.pose;
  return (
    <img
      alt=""
      className={`fighter-sprite ${side} ${active ? "active" : ""}`}
      src={`/assets/sprites/${fighter.id}_${pose}.png`}
    />
  );
}

createRoot(document.getElementById("root")!).render(<App />);
