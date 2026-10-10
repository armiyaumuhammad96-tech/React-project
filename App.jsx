import { useState } from "react";
import "./styles.css";

function App() {
  const [screen, setScreen] = useState("menu");
  const [cash, setCash] = useState(2500);
  const [level, setLevel] = useState(1);
  const [xp, setXp] = useState(0);

  const startCareer = () => {
    setScreen("career");
  };

  const completeRace = () => {
    setCash((money) => money + 500);
    setXp((value) => value + 100);

    if (xp + 100 >= 500) {
      setLevel((value) => value + 1);
      setXp(0);
    }

    setScreen("results");
  };

  return (
    <div className="game">
      <header className="topbar">
        <div>
          <h1>STREET RUSH X</h1>
          <span>STREET RACING</span>
        </div>

        <div className="playerStats">
          <div>💰 ${cash}</div>
          <div>⭐ LVL {level}</div>
        </div>
      </header>

      {screen === "menu" && (
        <main className="menu">
          <div className="hero">
            <div className="heroText">
              <p className="smallTitle">WELCOME RACER</p>
              <h2>RULE THE<br />STREETS.</h2>
              <p>
                Race. Upgrade. Win. Build your garage and become
                the ultimate street-racing champion.
              </p>

              <button onClick={startCareer}>
                START CAREER
              </button>
            </div>

            <div className="carGraphic">
              🏎️
            </div>
          </div>

          <section className="cards">
            <div className="card">
              <span>🏁</span>
              <h3>CAREER</h3>
              <p>Complete races and unlock new levels.</p>
            </div>

            <div className="card">
              <span>🚘</span>
              <h3>GARAGE</h3>
              <p>Build and upgrade your racing machine.</p>
            </div>

            <div className="card">
              <span>🏆</span>
              <h3>CHAMPIONSHIP</h3>
              <p>Compete for the biggest rewards.</p>
            </div>
          </section>
        </main>
      )}

      {screen === "career" && (
        <main className="page">
          <button className="back" onClick={() => setScreen("menu")}>
            ← BACK
          </button>

          <h2>CAREER MODE</h2>
          <p className="muted">
            Complete races to earn cash and XP.
          </p>

          <div className="raceCard">
            <div>
              <span className="badge">LEVEL {level}</span>
              <h3>NEON CITY SPRINT</h3>
              <p>Distance: 3.2 KM</p>
              <p>Reward: $500 + 100 XP</p>
            </div>

            <button onClick={completeRace}>
              RACE NOW
            </button>
          </div>

          <div className="progressBox">
            <div className="progressTop">
              <span>CAREER XP</span>
              <span>{xp}/500 XP</span>
            </div>

            <div className="progress">
              <div style={{ width: `${(xp / 500) * 100}%` }} />
            </div>
          </div>
        </main>
      )}

      {screen === "results" && (
        <main className="page results">
          <div className="trophy">🏆</div>
          <h2>RACE COMPLETE!</h2>
          <p>You earned:</p>

          <div className="reward">
            <strong>+$500</strong>
            <span>+100 XP</span>
          </div>

          <button onClick={() => setScreen("career")}>
            NEXT RACE
          </button>

          <button
            className="secondary"
            onClick={() => setScreen("menu")}
          >
            MAIN MENU
          </button>
        </main>
      )}
    </div>
  );
}

export default App;