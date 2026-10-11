
import React, { useEffect, useState } from "react";

const cars = [
  { id: 1, name: "Street Falcon", emoji: "🏎️", price: 0, speed: 45 },
  { id: 2, name: "Neon Beast", emoji: "🚘", price: 500, speed: 60 },
  { id: 3, name: "Thunder GT", emoji: "🏎️", price: 1200, speed: 75 },
  { id: 4, name: "Shadow X", emoji: "🚗", price: 2500, speed: 90 },
];

export default function App() {
  const [money, setMoney] = useState(2500);
  const [level, setLevel] = useState(1);
  const [owned, setOwned] = useState([1]);
  const [selected, setSelected] = useState(1);
  const [upgrades, setUpgrades] = useState({});
  const [screen, setScreen] = useState("home");
  const [playerProgress, setPlayerProgress] = useState(0);
  const [rivalProgress, setRivalProgress] = useState(0);
  const [racing, setRacing] = useState(false);
  const [won, setWon] = useState(false);
  const [message, setMessage] = useState("");

  const car = cars.find((item) => item.id === selected) || cars[0];
  const upgradeLevel = upgrades[selected] || 0;
  const speed = car.speed + upgradeLevel * 10;

  useEffect(() => {
    if (screen !== "race" || !racing) return;

    const timer = setInterval(() => {
      setRivalProgress((previous) => {
        const next = Math.min(previous + 3, 100);

        if (next >= 100) {
          setRacing(false);
          setWon(false);
          setScreen("results");
          setMessage("Your opponent reached the finish first!");
        }

        return next;
      });
    }, 600);

    return () => clearInterval(timer);
  }, [screen, racing]);

  function buyCar(item) {
    if (owned.includes(item.id)) {
      setSelected(item.id);
      setMessage(item.name + " selected!");
      return;
    }

    if (money < item.price) {
      setMessage("Not enough cash. Win more races!");
      return;
    }

    setMoney((previous) => previous - item.price);
    setOwned((previous) => [...previous, item.id]);
    setSelected(item.id);
    setMessage(item.name + " purchased!");
  }

  function upgradeCar() {
    const cost = 300 + upgradeLevel * 250;

    if (money < cost) {
      setMessage("Not enough cash for this upgrade!");
      return;
    }

    setMoney((previous) => previous - cost);
    setUpgrades((previous) => ({
      ...previous,
      [selected]: upgradeLevel + 1,
    }));
    setMessage("Engine upgraded! Your car is faster.");
  }

  function startRace() {
    setPlayerProgress(0);
    setRivalProgress(0);
    setWon(false);
    setMessage("");
    setScreen("race");
    setRacing(true);
  }

  function accelerate() {
    if (!racing) return;

    const next = Math.min(100, playerProgress + 5 + speed / 15);
    setPlayerProgress(next);

    if (next >= 100) {
      setRacing(false);
      setWon(true);
      setScreen("results");
      setMoney((previous) => previous + 500);
      setLevel((previous) => previous + 1);
      setMessage("Amazing driving! You won $500!");
    }
  }

  const panel = {
    background: "#141c2b",
    border: "1px solid #303d52",
    borderRadius: 14,
    padding: 20,
  };

  const button = {
    background: "#ff4058",
    color: "white",
    border: 0,
    borderRadius: 8,
    padding: "12px 18px",
    fontWeight: 800,
    cursor: "pointer",
    fontSize: 13,
  };

  const secondary = {
    ...button,
    background: "#29364b",
  };

  function backHome() {
    setRacing(false);
    setScreen("home");
    setMessage("");
  }

  return (
    <div className="srx">
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; background: #080c14; }
        .srx {
          min-height: 100vh;
          padding: 20px;
          background: radial-gradient(ellipse at top, #202d45, #080c14 65%);
          color: #f5f7ff;
          font-family: Arial, sans-serif;
        }
        .srx button { transition: transform .15s, filter .15s; }
        .srx button:hover { filter: brightness(1.15); transform: translateY(-2px); }
        .srx button:disabled { opacity: .5; cursor: not-allowed; }
        .srx .wrap { max-width: 1050px; margin: auto; }
        .srx .header {
          display: flex; justify-content: space-between; align-items: center;
          gap: 15px; flex-wrap: wrap; padding: 10px 0 22px;
          border-bottom: 1px solid #303d52;
        }
        .srx .logo { font-size: clamp(23px, 5vw, 36px); font-weight: 900;
          font-style: italic; letter-spacing: 2px; margin: 0; }
        .srx .red { color: #ff4058; }
        .srx .stats { display: flex; flex-wrap: wrap; gap: 8px; }
        .srx .stat { padding: 10px 13px; border-radius: 8px;
          background: #141c2b; border: 1px solid #303d52; font-size: 13px; }
        .srx .hero { margin-top: 24px; padding: clamp(20px, 5vw, 38px);
          border-radius: 16px; border: 1px solid #35435b;
          background: linear-gradient(125deg, #1b263a, #101522); }
        .srx .hero h2 { font-size: clamp(30px, 6vw, 54px);
          line-height: 1.1; margin: 12px 0; }
        .srx .hero p, .srx .muted { color: #aab7cc; line-height: 1.7; }
        .srx .carArt { text-align: center; font-size: clamp(75px, 15vw, 135px);
          padding: 15px 0; filter: drop-shadow(0 12px 18px #ff405833); }
        .srx .grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px; margin-top: 18px; }
        .srx .card { background: #141c2b; border: 1px solid #303d52;
          border-radius: 12px; padding: 18px; min-width: 0; }
        .srx .card h3 { margin: 10px 0; }
        .srx .carIcon { font-size: 53px; text-align: center; padding: 12px 0; }
        .srx .page { max-width: 850px; margin: 25px auto; }
        .srx .row { display: flex; justify-content: space-between;
          align-items: center; gap: 12px; flex-wrap: wrap; }
        .srx .bar { height: 15px; background: #303d52; border-radius: 20px;
          overflow: hidden; margin: 10px 0 20px; }
        .srx .fill { height: 100%; background: linear-gradient(90deg,#ff4058,#ffb14c);
          transition: width .2s; }
        .srx .notice { color: #ffd36a; margin-top: 16px; font-size: 14px; }
        .srx .tag { color: #ff7a8b; font-size: 11px; font-weight: 800; letter-spacing: 2px; }
        @media (max-width: 650px) {
          .srx { padding: 13px; }
          .srx .grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="wrap">
        <header className="header">
          <div>
            <h1 className="logo">STREET <span className="red">RUSH X</span></h1>
            <div className="tag">STREET RACING • SEASON 1</div>
          </div>
          <div className="stats">
            <div className="stat">💰 ${money}</div>
            <div className="stat">⭐ Level {level}</div>
          </div>
        </header>

        {screen === "home" && (
          <>
            <section className="hero">
              <div className="tag">WELCOME RACER</div>
              <div className="carArt">{car.emoji}</div>
              <h2>RULE THE <span className="red">STREETS.</span></h2>
              <p>
                Choose your car, upgrade your engine, and race your way
                to the top. Every victory brings you closer to the championship.
              </p>
              <button style={button} onClick={startRace}>🏁 START RACE</button>
              <button style={{ ...secondary, marginLeft: 8 }}
                onClick={() => { setMessage(""); setScreen("garage"); }}>
                🚘 GARAGE
              </button>
            </section>

            <div className="grid">
              <div className="card">
                <div style={{ fontSize: 30 }}>🏁</div>
                <h3>CAREER</h3>
                <p className="muted">Race your rivals and increase your level.</p>
                <button style={secondary} onClick={startRace}>Race now</button>
              </div>
              <div className="card">
                <div style={{ fontSize: 30 }}>🔧</div>
                <h3>GARAGE</h3>
                <p className="muted">Collect cars and improve engine speed.</p>
                <button style={secondary}
                  onClick={() => { setMessage(""); setScreen("garage"); }}>
                  Open garage
                </button>
              </div>
              <div className="card">
                <div style={{ fontSize: 30 }}>🏆</div>
                <h3>CHAMPION</h3>
                <p className="muted">Win races to earn $500 and level up.</p>
                <strong className="red">LEVEL {level}</strong>
              </div>
            </div>
          </>
        )}

        {screen === "garage" && (
          <section className="page">
            <button style={secondary} onClick={backHome}>← HOME</button>
            <h2>YOUR <span className="red">GARAGE</span></h2>
            <p className="muted">Buy cars, choose your ride, and upgrade its engine.</p>

            <div style={panel}>
              <div className="carArt">{car.emoji}</div>
              <h2 style={{ textAlign: "center" }}>{car.name}</h2>
              <div className="row">
                <span>Engine speed</span>
                <strong className="red">{speed} / 100</strong>
              </div>
              <div className="bar">
                <div className="fill" style={{ width: `${speed}%` }} />
              </div>
              <div className="row">
                <span>Engine upgrades: {upgradeLevel}</span>
                <button style={button} onClick={upgradeCar}>
                  🔧 UPGRADE — ${300 + upgradeLevel * 250}
                </button>
              </div>
            </div>

            <h3>CHOOSE YOUR CAR</h3>
            <div className="grid">
              {cars.map((item) => {
                const isOwned = owned.includes(item.id);
                return (
                  <div className="card" key={item.id}
                    style={{ borderColor: selected === item.id ? "#ff4058" : "#303d52" }}>
                    <div className="carIcon">{item.emoji}</div>
                    <h3>{item.name}</h3>
                    <p className="muted">Base speed: {item.speed}</p>
                    <p>{isOwned ? "✅ Owned" : `💰 $${item.price}`}</p>
                    <button style={isOwned ? secondary : button}
                      onClick={() => buyCar(item)}>
                      {selected === item.id ? "SELECTED" : isOwned ? "SELECT CAR" : "BUY CAR"}
                    </button>
                  </div>
                );
              })}
            </div>
            {message && <p className="notice">{message}</p>}
          </section>
        )}

        {screen === "race" && (
          <section className="page">
            <div className="row">
              <h2>STREET <span className="red">RACE</span></h2>
              <span className="tag">PRIZE: $500</span>
            </div>
            <p className="muted">Tap ACCELERATE to push your car to the finish line before your rival.</p>

            <div style={panel}>
              <div className="row">
                <strong>YOU — {car.name}</strong>
                <span>{Math.floor(playerProgress)}%</span>
              </div>
              <div className="carArt" style={{ textAlign: "left" }}>{car.emoji}</div>
              <div className="bar">
                <div className="fill" style={{ width: `${playerProgress}%` }} />
              </div>

              <div className="row">
                <strong>RIVAL — TURBO</strong>
                <span>{Math.floor(rivalProgress)}%</span>
              </div>
              <div className="carArt" style={{ textAlign: "left" }}>🚙</div>
              <div className="bar">
                <div className="fill" style={{ width: `${rivalProgress}%`, background: "#6a8dff" }} />
              </div>

              <button style={{ ...button, width: "100%", padding: 18, fontSize: 16 }}
                onClick={accelerate} disabled={!racing}>
                {racing ? "⚡ ACCELERATE!" : "RACE FINISHED"}
              </button>
              <p className="muted">Keep tapping to accelerate. Your rival keeps moving!</p>
            </div>
            {!racing && (
              <button style={{ ...secondary, marginTop: 15 }} onClick={backHome}>
                RETURN HOME
              </button>
            )}
          </section>
        )}

        {screen === "results" && (
          <section className="page" style={{ textAlign: "center", padding: 30 }}>
            <div style={{ fontSize: 75 }}>{won ? "🏆" : "🏁"}</div>
            <h2>{won ? "YOU WON!" : "RACE OVER"}</h2>
            <p className="muted">
              {won
                ? "Excellent driving! $500 has been added to your garage funds."
                : "Your rival won this round. Upgrade your car and try again!"}
            </p>
            <div style={panel}>
              <h3>YOUR CASH</h3>
              <div style={{ fontSize: 32, color: "#65f0a5", fontWeight: 900 }}>
                ${money}
              </div>
              <p>Level {level} • {car.name}</p>
            </div>
            <button style={{ ...button, margin: 8 }} onClick={startRace}>RACE AGAIN</button>
            <button style={{ ...secondary, margin: 8 }}
              onClick={() => { setMessage(""); setScreen("garage"); }}>
              VISIT GARAGE
            </button>
            <button style={{ ...secondary, margin: 8 }} onClick={backHome}>HOME</button>
          </section>
        )}

        {message && screen !== "results" && screen !== "garage" && (
          <p className="notice">{message}</p>
        )}

        <footer style={{ textAlign: "center", color: "#75839b", padding: "30px 0", fontSize: 12 }}>
          STREET RUSH X • Build your garage. Own the streets.
        </footer>
      </div>
    </div>
  );
}
