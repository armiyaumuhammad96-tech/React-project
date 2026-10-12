import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom/client";

const CARS = [
  { name: "Street Falcon", emoji: "🏎️", price: 0, speed: 5, color: "#ff4057" },
  { name: "Neon Beast", emoji: "🏎️", price: 1500, speed: 7, color: "#39a9ff" },
  { name: "Shadow GT", emoji: "🚘", price: 3000, speed: 9, color: "#b66cff" },
  { name: "Golden Bullet", emoji: "🏎️", price: 6000, speed: 12, color: "#ffc84a" },
  { name: "Phantom X", emoji: "🚗", price: 10000, speed: 15, color: "#52f5b0" },
];

const initialGarage = [0];

function App() {
  const [screen, setScreen] = useState("home");
  const [money, setMoney] = useState(2500);
  const [level, setLevel] = useState(1);
  const [owned, setOwned] = useState(initialGarage);
  const [selectedCar, setSelectedCar] = useState(0);
  const [upgrade, setUpgrade] = useState(0);
  const [distance, setDistance] = useState(0);
  const [opponent, setOpponent] = useState(0);
  const [racing, setRacing] = useState(false);
  const [result, setResult] = useState("");
  const [sound, setSound] = useState(true);

  const distanceRef = useRef(0);
  const opponentRef = useRef(0);
  const racingRef = useRef(false);
  const lastTime = useRef(0);

  const car = CARS[selectedCar];
  const speed = car.speed + upgrade * 2;

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.code === "Space" || event.code === "ArrowUp") {
        if (screen === "race" && !event.repeat) {
          event.preventDefault();
          accelerate();
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  useEffect(() => {
    if (!racing) return;

    let frame;

    function animate(time) {
      if (!racingRef.current) return;

      if (!lastTime.current) lastTime.current = time;

      const delta = Math.min((time - lastTime.current) / 1000, 0.05);
      lastTime.current = time;

      const newDistance = distanceRef.current + speed * delta * 2.5;
      const newOpponent = opponentRef.current + (4.4 + level * 0.15) * delta;

      distanceRef.current = newDistance;
      opponentRef.current = newOpponent;

      setDistance(newDistance);
      setOpponent(newOpponent);

      if (newDistance >= 100 || newOpponent >= 100) {
        racingRef.current = false;
        setRacing(false);
        lastTime.current = 0;

        if (newDistance >= 100 && newDistance >= newOpponent) {
          setResult("WIN");
          setMoney((m) => m + 1000 + level * 200);
          setLevel((l) => l + 1);
        } else {
          setResult("FINISH");
          setMoney((m) => m + 200);
        }

        setScreen("results");
        return;
      }

      frame = requestAnimationFrame(animate);
    }

    frame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(frame);
  }, [racing, speed, level]);

  function startRace() {
    distanceRef.current = 0;
    opponentRef.current = 0;
    lastTime.current = 0;

    setDistance(0);
    setOpponent(0);
    setResult("");
    racingRef.current = true;
    setRacing(true);
    setScreen("race");
  }

  function accelerate() {
    if (!racingRef.current) return;

    distanceRef.current = Math.min(100, distanceRef.current + 2);
    setDistance(distanceRef.current);
  }

  function buyCar(index) {
    const chosen = CARS[index];

    if (owned.includes(index)) {
      setSelectedCar(index);
      return;
    }

    if (money < chosen.price) {
      alert("Not enough cash! Win more races to earn money.");
      return;
    }

    setMoney((m) => m - chosen.price);
    setOwned((old) => [...old, index]);
    setSelectedCar(index);
  }

  function upgradeCar() {
    const cost = (upgrade + 1) * 1000;

    if (money < cost) {
      alert("Not enough cash! Win a race first.");
      return;
    }

    setMoney((m) => m - cost);
    setUpgrade((u) => u + 1);
  }

  function resetGame() {
    racingRef.current = false;
    setRacing(false);
    setScreen("home");
  }

  const page = {
    minHeight: "100vh",
    background: "#080b12",
    color: "#f5f7ff",
    fontFamily: "Arial, sans-serif",
    padding: "20px",
    boxSizing: "border-box",
  };

  const button = {
    padding: "13px 18px",
    border: "none",
    borderRadius: "7px",
    background: "#ff4057",
    color: "white",
    fontWeight: "bold",
    cursor: "pointer",
    margin: "5px",
  };

  const panel = {
    background: "#151d2d",
    border: "1px solid #303c52",
    borderRadius: "12px",
    padding: "20px",
    marginBottom: "15px",
  };

  function Header() {
    return (
      <header style={{ ...panel, display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ margin: "0 0 5px", color: "#ff4057", letterSpacing: "2px" }}>
            STREET RUSH X
          </h1>
          <small style={{ color: "#aab5ca" }}>THE STREETS ARE YOURS</small>
        </div>

        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "10px" }}>
          <strong>💰 ${money.toLocaleString()}</strong>
          <strong>⭐ LVL {level}</strong>
        </div>
      </header>
    );
  }

  return (
    <main style={page}>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; }
        button { transition: transform .15s, opacity .15s; }
        button:hover { transform: translateY(-2px); opacity: .9; }
        .race-track {
          height: 300px;
          position: relative;
          overflow: hidden;
          background: repeating-linear-gradient(90deg, #242a36 0px, #242a36 48px, #303846 49px, #303846 52px);
          border: 4px solid #555e6c;
          border-radius: 10px;
        }
        .road-line {
          position: absolute;
          left: 0;
          right: 0;
          top: 50%;
          border-top: 4px dashed #f7e9a4;
        }
        .car-icon {
          position: absolute;
          font-size: 42px;
          transform: scaleX(-1);
          transition: left .1s linear;
          filter: drop-shadow(0 4px 5px #0008);
        }
        .garage-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
          gap: 12px;
        }
        @media(max-width: 520px) {
          h1 { font-size: 24px; }
          .race-track { height: 250px; }
        }
      `}</style>

      <div style={{ maxWidth: "1050px", margin: "0 auto" }}>
        <Header />

        {screen === "home" && (
          <>
            <section style={{ ...panel, padding: "30px 20px", background: "linear-gradient(130deg,#171e31,#251627)" }}>
              <div style={{ color: "#ff5369", letterSpacing: "3px", fontWeight: "bold" }}>
                WELCOME, RACER
              </div>

              <h2 style={{ fontSize: "clamp(32px,6vw,58px)", margin: "18px 0" }}>
                RULE THE
                <br />
                STREETS.
              </h2>

              <div style={{ fontSize: "100px", textAlign: "center" }}>
                {car.emoji}
              </div>

              <p style={{ color: "#b8c1d2", lineHeight: 1.7 }}>
                Race your rivals. Earn cash. Collect cars. Upgrade your
                machine and become the street racing champion.
              </p>

              <button style={button} onClick={startRace}>
                🏁 START RACE
              </button>

              <button style={{ ...button, background: "#29364c" }} onClick={() => setScreen("garage")}>
                🚘 OPEN GARAGE
              </button>

              <button style={{ ...button, background: "#29364c" }} onClick={() => setScreen("career")}>
                🏆 CAREER
              </button>
            </section>

            <div style={panel}>
              <h3>YOUR DRIVER PROFILE</h3>
              <p>Current car: {car.name}</p>
              <p>Cars collected: {owned.length} / {CARS.length}</p>
              <p>Engine upgrades: {upgrade}</p>
              <p>Career level: {level}</p>
            </div>
          </>
        )}

        {screen === "garage" && (
          <section style={panel}>
            <button style={{ ...button, background: "#29364c" }} onClick={() => setScreen("home")}>
              ← BACK
            </button>

            <h2>🚘 YOUR GARAGE</h2>
            <p style={{ color: "#b8c1d2" }}>
              Select a car you own or purchase a new racing machine.
            </p>

            <div className="garage-grid">
              {CARS.map((item, index) => {
                const isOwned = owned.includes(index);
                const isSelected = selectedCar === index;

                return (
                  <div key={item.name} style={{
                    ...panel,
                    margin: 0,
                    borderColor: isSelected ? item.color : "#303c52",
                  }}>
                    <div style={{ fontSize: "60px", textAlign: "center", margin: "12px 0" }}>
                      {item.emoji}
                    </div>

                    <h3 style={{ color: item.color }}>{item.name}</h3>
                    <p>Engine speed: {item.speed}</p>
                    <p>Price: {item.price === 0 ? "FREE" : "$" + item.price.toLocaleString()}</p>

                    {isSelected && <p style={{ color: "#52f5b0" }}>✓ SELECTED</p>}

                    <button style={button} onClick={() => buyCar(index)}>
                      {isSelected ? "SELECTED" : isOwned ? "SELECT CAR" : "BUY CAR"}
                    </button>
                  </div>
                );
              })}
            </div>

            <div style={{ ...panel, marginTop: "20px" }}>
              <h3>🔧 ENGINE UPGRADE</h3>
              <p>Current upgrade level: {upgrade}</p>
              <p>Extra speed: +{upgrade * 2}</p>
              <p>Next upgrade cost: ${(upgrade + 1) * 1000}</p>
              <button style={button} onClick={upgradeCar}>UPGRADE ENGINE</button>
            </div>
          </section>
        )}

        {screen === "career" && (
          <section style={panel}>
            <button style={{ ...button, background: "#29364c" }} onClick={() => setScreen("home")}>
              ← BACK
            </button>

            <h2>🏆 RACING CAREER</h2>
            <p>Driver level: {level}</p>
            <p>Money earned and available: ${money.toLocaleString()}</p>
            <p>Cars unlocked: {owned.length} / {CARS.length}</p>
            <p>Win races to earn cash and increase your driver level.</p>
            <button style={button} onClick={startRace}>START NEXT RACE</button>
          </section>
        )}

        {screen === "race" && (
          <section style={panel}>
            <h2>🏁 STREET RACE</h2>
            <p>Car: {car.name} | Speed rating: {speed}</p>

            <div className="race-track">
              <div className="road-line" />

              <div style={{ position: "absolute", top: "15px", left: "12px", color: "white" }}>
                YOU
              </div>

              <div className="car-icon" style={{ top: "50px", left: `${Math.min(distance, 90)}%` }}>
                {car.emoji}
              </div>

              <div style={{ position: "absolute", top: "155px", left: "12px", color: "white" }}>
                RIVAL
              </div>

              <div className="car-icon" style={{ top: "185px", left: `${Math.min(opponent, 90)}%` }}>
                🏎️
              </div>

              <div style={{ position: "absolute", right: "10px", top: "10px", color: "#ffd166" }}>
                FINISH 🏁
              </div>
            </div>

            <div style={{ ...panel, marginTop: "15px" }}>
              <p>YOUR PROGRESS: {Math.floor(distance)}%</p>
              <div style={{ height: "12px", background: "#303c52", borderRadius: "10px", overflow: "hidden" }}>
                <div style={{ width: `${distance}%`, height: "100%", background: "#52f5b0" }} />
              </div>

              <p>RIVAL PROGRESS: {Math.floor(opponent)}%</p>
              <div style={{ height: "12px", background: "#303c52", borderRadius: "10px", overflow: "hidden" }}>
                <div style={{ width: `${opponent}%`, height: "100%", background: "#ff4057" }} />
              </div>
            </div>

            <button style={{ ...button, padding: "20px 30px", fontSize: "16px" }} onClick={accelerate}>
              🚀 ACCELERATE!
            </button>

            <p style={{ color: "#b8c1d2" }}>
              Hold the SPACE BAR or UP ARROW to accelerate. You can also tap
              the button.
            </p>

            <button
              style={{ ...button, background: "#29364c" }}
              onClick={() => {
                racingRef.current = false;
                setRacing(false);
                setScreen("home");
              }}
            >
              QUIT RACE
            </button>
          </section>
        )}

        {screen === "results" && (
          <section style={{ ...panel, textAlign: "center", padding: "40px 20px" }}>
            <div style={{ fontSize: "75px" }}>{result === "WIN" ? "🏆" : "🏁"}</div>

            <h2 style={{ color: result === "WIN" ? "#52f5b0" : "#ffb84d" }}>
              {result === "WIN" ? "YOU WON!" : "RACE FINISHED"}
            </h2>

            <p>{result === "WIN" ? "Amazing driving! You beat your rival." : "Good effort! Keep racing to earn more money."}</p>

            <h3 style={{ color: "#ffd166" }}>
              {result === "WIN" ? "+$" + (1000 + level * 200) : "+$200"}
            </h3>

            <button style={button} onClick={startRace}>RACE AGAIN</button>
            <button style={{ ...button, background: "#29364c" }} onClick={() => setScreen("garage")}>
              VISIT GARAGE
            </button>
            <button style={{ ...button, background: "#29364c" }} onClick={resetGame}>
              MAIN MENU
            </button>
          </section>
        )}

        <footer style={{ textAlign: "center", padding: "20px", color: "#6f7d94", fontSize: "12px" }}>
          STREET RUSH X · BUILD YOUR LEGEND
        </footer>
      </div>
    </main>
  );
}

export default App;
