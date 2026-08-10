import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

type FighterId = "goku" | "vegeta";
type Phase = "select" | "attack" | "enemy" | "win" | "lose";

type Card = {
  id: string;
  name: string;
  type: "Attack" | "Support" | "Limit";
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
  { id: "kamehameha", name: "Kamehameha", type: "Attack", attack: 22, accuracy: 82, cc: 3 },
  { id: "guard", name: "Guard", type: "Support", attack: 0, accuracy: 100, cc: 1 },
  { id: "punch", name: "Punch", type: "Attack", attack: 8, accuracy: 98, cc: 0 },
  { id: "s-kamehameha", name: "S.Kamehameha", type: "Limit", attack: 34, accuracy: 72, cc: 5 }
];

function makeGoku(): Fighter {
  return { id: "goku", name: "Goku", hp: 120, maxHp: 120, cc: 4, maxCc: 8, pose: "idle" };
}

function makeVegeta(): Fighter {
  return { id: "vegeta", name: "Vegeta", hp: 115, maxHp: 115, cc: 4, maxCc: 8, pose: "guard" };
}

function App() {
  const [player, setPlayer] = useState(makeGoku);
  const [enemy, setEnemy] = useState(makeVegeta);
  const [phase, setPhase] = useState<Phase>("select");
  const [log, setLog] = useState("Select a card.");
  const [turn, setTurn] = useState(1);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);

  const playableCards = useMemo(() => cards, []);

  const reset = () => {
    setPlayer(makeGoku());
    setEnemy(makeVegeta());
    setPhase("select");
    setLog("Select a card.");
    setTurn(1);
    setSelectedCard(null);
  };

  const playCard = (card: Card) => {
    if (phase !== "select" || player.cc < card.cc) return;

    setSelectedCard(card);
    setPhase("attack");
    setPlayer((current) => ({ ...current, cc: Math.min(current.maxCc, current.cc - card.cc + 1), hp: card.id === "guard" ? Math.min(current.maxHp, current.hp + 12) : current.hp, pose: card.id === "guard" ? "guard" : "beam" }));
    setEnemy((current) => ({ ...current, pose: card.id === "guard" ? "guard" : "hurt" }));

    const hit = card.accuracy >= 100 || Math.floor(Math.random() * 100) < card.accuracy;
    const damage = card.type === "Support" || !hit ? 0 : card.attack;
    setLog(card.type === "Support" ? "Goku guards and recovers HP." : hit ? `Goku used ${card.name}.` : `${card.name} missed.`);

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
          setPhase("select");
          setLog("Select a card.");
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
        <button type="button" onClick={reset}>Reset</button>
      </header>

      <section className="gb-frame" aria-label="Battle screen">
        <CombatantPanel fighter={enemy} side="enemy" />
        <div className="battlefield">
          <FighterSprite fighter={enemy} side="enemy" active={phase === "enemy"} />
          <div className={`beam-effect ${phase === "attack" || phase === "enemy" ? "active" : ""} ${phase === "enemy" ? "reverse" : ""}`} />
          <FighterSprite fighter={player} side="player" active={phase === "attack"} />
        </div>
        <CombatantPanel fighter={player} side="player" />
      </section>

      <section className="command-area">
        <div className="battle-log">
          <span>{selectedCard?.name ?? "Command"}</span>
          <strong>{log}</strong>
        </div>
        <div className="card-grid">
          {playableCards.map((card) => (
            <button
              className={player.cc < card.cc || phase !== "select" ? "disabled" : ""}
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

function CombatantPanel({ fighter, side }: { fighter: Fighter; side: "player" | "enemy" }) {
  return (
    <div className={`combatant-panel ${side}`}>
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
