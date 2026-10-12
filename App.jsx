
import React, { useEffect, useRef, useState } from "react";
import "./styles.css";

const DATABASE_URL = "PASTE_YOUR_FIREBASE_DATABASE_URL_HERE";
// Example format: https://your-database-name-default-rtdb.firebaseio.com
// Do not add / at the end.

const THREE_URL =
  "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";

const cars = [
  { name: "Vortex GT", color: 0xff1738, speed: 1.0 },
  { name: "Azure X", color: 0x087cff, speed: 1.08 },
  { name: "Golden Phantom", color: 0xffb51b, speed: 1.04 },
  { name: "Emerald RS", color: 0x00d58b, speed: 1.02 },
];

const cleanCode = (value) =>
  String(value || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);

function App() {
  const mountRef = useRef(null);
  const gameRef = useRef(null);
  const keysRef = useRef({});
  const [screen, setScreen] = useState("menu");
  const [carIndex, setCarIndex] = useState(0);
  const [countdown, setCountdown] = useState("");
  const [speed, setSpeed] = useState(0);
  const [distance, setDistance] = useState(0);
  const [nitro, setNitro] = useState(100);
  const [roomCode, setRoomCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [message, setMessage] = useState("");
  const [opponent, setOpponent] = useState(null);
  const [braking, setBraking] = useState(false);
  const [nitroOn, setNitroOn] = useState(false);
  const [steering, setSteering] = useState(0);

  const roomRef = useRef("");
  const playerIdRef = useRef(
    "p" + Math.random().toString(36).slice(2, 10)
  );
  const gameStatusRef = useRef("menu");
  const inputRef = useRef({ steer: 0, brake: false, nitro: false });
  const countdownTimer = useRef(null);

  const databaseReady = () =>
    DATABASE_URL.startsWith("https://") &&
    !DATABASE_URL.includes("PASTE_YOUR");

  async function dbRequest(path, method = "GET", data) {
    if (!databaseReady()) {
      throw new Error("Add your Firebase database URL inside App.jsx first.");
    }
    const response = await fetch(
      `${DATABASE_URL.replace(/\/$/, "")}/${path}.json`,
      {
        method,
        headers: { "Content-Type": "application/json" },
        ...(data === undefined ? {} : { body: JSON.stringify(data) }),
      }
    );
    if (!response.ok) {
      throw new Error("Database request failed. Check Firebase setup and rules.");
    }
    return response.json();
  }

  async function createRoom() {
    try {
      setMessage("Creating your race room...");
      const code = Math.random().toString(36).slice(2, 8).toUpperCase();
      const player = {
        name: "Player 1",
        x: 0,
        distance: 0,
        speed: 0,
        ready: true,
        updated: Date.now(),
      };
      await dbRequest(`rooms/${code}`, "PUT", {
        status: "waiting",
        host: playerIdRef.current,
        players: { [playerIdRef.current]: player },
      });
      roomRef.current = code;
      setRoomCode(code);
      setScreen("lobby");
      setMessage("Room created. Share the code with your friend.");
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function joinRoom() {
    const code = cleanCode(joinCode);
    if (code.length < 4) {
      setMessage("Enter your friend's room code.");
      return;
    }
    try {
      setMessage("Joining race...");
      const room = await dbRequest(`rooms/${code}`);
      if (!room) {
        setMessage("Room not found. Check the code and try again.");
        return;
      }
      const players = room.players || {};
      if (!players[playerIdRef.current] && Object.keys(players).length >= 2) {
        setMessage("This room already has two players.");
        return;
      }
      await dbRequest(
        `rooms/${code}/players/${playerIdRef.current}`,
        "PUT",
        {
          name: "Player 2",
          x: 0,
          distance: 0,
          speed: 0,
          ready: true,
          updated: Date.now(),
        }
      );
      roomRef.current = code;
      setRoomCode(code);
      setScreen("lobby");
      setMessage("Joined! Wait for the host to start.");
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function startRace() {
    gameStatusRef.current = "countdown";
    setScreen("race");
    setCountdown("3");
    for (const value of ["3", "2", "1", "GO!"]) {
      setCountdown(value);
      await new Promise((resolve) => {
        countdownTimer.current = setTimeout(resolve, 750);
      });
    }
    setCountdown("");
    gameStatusRef.current = "racing";
    if (roomRef.current) {
      dbRequest(`rooms/${roomRef.current}/status`, "PUT", "racing")
        .catch(() => {});
    }
  }

  function leaveRace() {
    gameStatusRef.current = "menu";
    roomRef.current = "";
    setRoomCode("");
    setOpponent(null);
    setScreen("menu");
    setMessage("");
    if (gameRef.current) {
      gameRef.current.x = 0;
      gameRef.current.distance = 0;
      gameRef.current.speed = 0;
    }
    setSpeed(0);
    setDistance(0);
    setNitro(100);
  }

  useEffect(() => {
    let cancelled = false;
    let script;
    let renderer;
    let frame = 0;
    let lastTime = 0;
    let syncTimer = 0;
    let hudTimer = 0;
    let scene;
    let camera;
    let playerCar;
    let rivalCar;
    let roadMarks = [];
    let scenery = [];
    let obstacles = [];
    let resizeHandler;

    function loadThree() {
      if (window.THREE) {
        setup(window.THREE);
        return;
      }
      script = document.querySelector('script[data-treasure-three="yes"]');
      if (!script) {
        script = document.createElement("script");
        script.src = THREE_URL;
        script.dataset.treasureThree = "yes";
        document.head.appendChild(script);
      }
      script.addEventListener("load", onLoad);
      script.addEventListener("error", onError);
      if (window.THREE) setup(window.THREE);
    }

    function onLoad() {
      if (!cancelled) setup(window.THREE);
    }
    function onError() {
      setMessage("3D graphics could not load. Check your internet connection.");
    }

    function makeCar(THREE, color) {
      const group = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(1.65, 0.42, 3.2),
        new THREE.MeshStandardMaterial({
          color,
          metalness: 0.78,
          roughness: 0.23,
        })
      );
      body.position.y = 0.55;
      group.add(body);

      const hood = new THREE.Mesh(
        new THREE.BoxGeometry(1.48, 0.2, 1.1),
        new THREE.MeshStandardMaterial({
          color,
          metalness: 0.8,
          roughness: 0.2,
        })
      );
      hood.position.set(0, 0.73, -0.85);
      group.add(hood);

      const cabin = new THREE.Mesh(
        new THREE.BoxGeometry(1.12, 0.48, 1.25),
        new THREE.MeshStandardMaterial({
          color: 0x132a45,
          metalness: 0.7,
          roughness: 0.12,
        })
      );
      cabin.position.set(0, 0.93, 0.28);
      group.add(cabin);

      for (const side of [-1, 1]) {
        for (const z of [-1.03, 1.05]) {
          const wheel = new THREE.Mesh(
            new THREE.CylinderGeometry(0.34, 0.34, 0.22, 20),
            new THREE.MeshStandardMaterial({
              color: 0x101116,
              roughness: 0.9,
            })
          );
          wheel.rotation.z = Math.PI / 2;
          wheel.position.set(side * 0.83, 0.36, z);
          group.add(wheel);
        }
        const light = new THREE.Mesh(
          new THREE.BoxGeometry(0.28, 0.1, 0.08),
          new THREE.MeshBasicMaterial({
            color: side === -1 ? 0xffffff : 0x9edbff,
          })
        );
        light.position.set(side * 0.5, 0.57, -1.63);
        group.add(light);
      }
      return group;
    }

    function setup(THREE) {
      if (cancelled || !mountRef.current || renderer) return;

      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x83cfff);
      scene.fog = new THREE.Fog(0x83cfff, 35, 190);

      camera = new THREE.PerspectiveCamera(
        63,
        mountRef.current.clientWidth / Math.max(1, mountRef.current.clientHeight),
        0.1,
        500
      );
      camera.position.set(0, 5.7, 11.5);
      camera.lookAt(0, 0.6, -12);

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
      renderer.setSize(
        mountRef.current.clientWidth,
        mountRef.current.clientHeight
      );
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      mountRef.current.innerHTML = "";
      mountRef.current.appendChild(renderer.domElement);

      scene.add(new THREE.HemisphereLight(0xc4e7ff, 0x42352d, 2.1));
      const sun = new THREE.DirectionalLight(0xfff2d4, 3);
      sun.position.set(-12, 22, 8);
      sun.castShadow = true;
      scene.add(sun);

      const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(240, 500),
        new THREE.MeshStandardMaterial({ color: 0x3b9165, roughness: 1 })
      );
      ground.rotation.x = -Math.PI / 2;
      ground.position.set(0, -0.08, -180);
      scene.add(ground);

      const road = new THREE.Mesh(
        new THREE.PlaneGeometry(12, 500),
        new THREE.MeshStandardMaterial({
          color: 0x202735,
          roughness: 0.84,
        })
      );
      road.rotation.x = -Math.PI / 2;
      road.position.set(0, 0, -180);
      scene.add(road);

      for (const x of [-5.8, 5.8]) {
        const rail = new THREE.Mesh(
          new THREE.BoxGeometry(0.16, 0.3, 500),
          new THREE.MeshStandardMaterial({
            color: 0xe3edf7,
            metalness: 0.5,
          })
        );
        rail.position.set(x, 0.22, -180);
        scene.add(rail);
      }

      for (let z = 15; z > -270; z -= 10) {
        const mark = new THREE.Mesh(
          new THREE.BoxGeometry(0.13, 0.025, 4),
          new THREE.MeshBasicMaterial({ color: 0xf9f5dc })
        );
        mark.position.set(0, 0.025, z);
        scene.add(mark);
        roadMarks.push(mark);
      }

      for (let i = 0; i < 80; i++) {
        const side = i % 2 ? -1 : 1;
        const z = -(i * 6) - 8;
        const height = 2 + Math.random() * 8;
        const building = new THREE.Mesh(
          new THREE.BoxGeometry(2.4 + Math.random() * 2, height, 3),
          new THREE.MeshStandardMaterial({
            color: [0x617b9d, 0x9baec3, 0x344d70, 0xc5b8a5][i % 4],
            roughness: 0.8,
          })
        );
        building.position.set(side * (9 + Math.random() * 17), height / 2 - 0.05, z);
        scene.add(building);
        scenery.push(building);
      }

      for (let i = 0; i < 13; i++) {
        const tree = new THREE.Group();
        const trunk = new THREE.Mesh(
          new THREE.CylinderGeometry(0.14, 0.23, 1.5, 8),
          new THREE.MeshStandardMaterial({ color: 0x765036 })
        );
        trunk.position.y = 0.75;
        tree.add(trunk);
        const leaves = new THREE.Mesh(
          new THREE.ConeGeometry(1.15, 2.6, 8),
          new THREE.MeshStandardMaterial({ color: 0x08794e })
        );
        leaves.position.y = 2.5;
        tree.add(leaves);
        tree.position.set(i % 2 ? -8.3 : 8.3, 0, -i * 20 - 15);
        scene.add(tree);
        scenery.push(tree);
      }

      playerCar = makeCar(THREE, cars[carIndex].color);
      playerCar.position.set(0, 0, 4);
      scene.add(playerCar);

      rivalCar = makeCar(THREE, 0x1485ff);
      rivalCar.position.set(2.5, 0, -13);
      scene.add(rivalCar);

      for (let i = 0; i < 7; i++) {
        const cone = new THREE.Mesh(
          new THREE.ConeGeometry(0.55, 1.35, 8),
          new THREE.MeshStandardMaterial({
            color: i % 2 ? 0xffa323 : 0xff3d52,
          })
        );
        cone.position.set([-4, 0, 4][i % 3], 0.68, -25 - i * 27);
        scene.add(cone);
        obstacles.push(cone);
      }

      gameRef.current = { x: 0, distance: 0, speed: 0, nitro: 100 };

      resizeHandler = () => {
        if (!mountRef.current || !renderer) return;
        camera.aspect =
          mountRef.current.clientWidth /
          Math.max(1, mountRef.current.clientHeight);
        camera.updateProjectionMatrix();
        renderer.setSize(
          mountRef.current.clientWidth,
          mountRef.current.clientHeight
        );
      };
      window.addEventListener("resize", resizeHandler);

      function animate(now) {
        frame = requestAnimationFrame(animate);
        if (cancelled || !renderer) return;
        const dt = Math.min((now - (lastTime || now)) / 1000, 0.05);
        lastTime = now;
        const game = gameRef.current;
        const active = gameStatusRef.current === "racing";
        const controls = inputRef.current;

        if (active && game) {
          const boost = controls.nitro && game.nitro > 0;
          const target = controls.brake ? 0 : boost ? 48 : 30;
          game.speed += (target - game.speed) * Math.min(1, dt * 1.8);
          if (boost) game.nitro = Math.max(0, game.nitro - 25 * dt);
          else game.nitro = Math.min(100, game.nitro + 5 * dt);

          game.x += controls.steer * dt * 7.2;
          game.x = Math.max(-4.5, Math.min(4.5, game.x));
          game.distance += game.speed * dt * 0.035;

          playerCar.position.x +=
            (game.x - playerCar.position.x) * Math.min(1, dt * 9);
          playerCar.rotation.z = -controls.steer * 0.11;
          const movement = game.speed * dt * 0.75;

          [...roadMarks, ...scenery, ...obstacles].forEach((object) => {
            object.position.z += movement;
            if (object.position.z > 18) object.position.z -= 290;
          });

          if (roomRef.current && now - syncTimer > 300) {
            syncTimer = now;
            const code = roomRef.current;
            const player = {
              name: "Racer",
              x: game.x,
              distance: game.distance,
              speed: game.speed,
              updated: Date.now(),
            };
            dbRequest(
              `rooms/${code}/players/${playerIdRef.current}`,
              "PUT",
              player
            ).catch(() => {});
            dbRequest(`rooms/${code}/players`)
              .then((players) => {
                if (!players) return;
                const other = Object.entries(players).find(
                  ([id]) => id !== playerIdRef.current
                );
                if (other) {
                  setOpponent(other[1]);
                  rivalCar.visible = true;
                  rivalCar.position.x = Math.max(
                    -4.5,
                    Math.min(4.5, Number(other[1].x) || 0)
                  );
                } else {
                  rivalCar.visible = false;
                }
              })
              .catch(() => {});
          }

          if (now - hudTimer > 150) {
            hudTimer = now;
            setSpeed(Math.round(game.speed * cars[carIndex].speed * 5));
            setDistance(Math.floor(game.distance));
            setNitro(Math.round(game.nitro));
          }
        } else if (game) {
          game.speed *= 0.96;
          playerCar.position.x +=
            ((game.x || 0) - playerCar.position.x) * Math.min(1, dt * 4);
          const movement = 0.5;
          roadMarks.forEach((object) => {
            object.position.z += movement;
            if (object.position.z > 18) object.position.z -= 290;
          });
          scenery.forEach((object) => {
            object.position.z += movement;
            if (object.position.z > 18) object.position.z -= 290;
          });
        }

        camera.position.x += (playerCar.position.x * 0.32 - camera.position.x) * 0.04;
        camera.lookAt(playerCar.position.x * 0.18, 0.8, -12);
        renderer.render(scene, camera);
      }
      animate(0);
    }

    loadThree();
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      if (countdownTimer.current) clearTimeout(countdownTimer.current);
      if (script) {
        script.removeEventListener("load", onLoad);
        script.removeEventListener("error", onError);
      }
      if (resizeHandler) window.removeEventListener("resize", resizeHandler);
      if (renderer) renderer.dispose();
      if (mountRef.current) mountRef.current.innerHTML = "";
    };
  }, [carIndex]);

  useEffect(() => {
    const down = (event) => {
      keysRef.current[event.key.toLowerCase()] = true;
      if (["arrowleft", "arrowright", "arrowup", " "].includes(event.key.toLowerCase())) {
        event.preventDefault();
      }
      const key = event.key.toLowerCase();
      if (key === "arrowleft" || key === "a") inputRef.current.steer = -1;
      if (key === "arrowright" || key === "d") inputRef.current.steer = 1;
      if (key === "arrowdown" || key === "s" || key === " ") inputRef.current.brake = true;
      if (key === "shift" || key === "n") inputRef.current.nitro = true;
    };
    const up = (event) => {
      const key = event.key.toLowerCase();
      keysRef.current[key] = false;
      if (
        key === "arrowleft" || key === "a" ||
        key === "arrowright" || key === "d"
      ) inputRef.current.steer = 0;
      if (key === "arrowdown" || key === "s" || key === " ") inputRef.current.brake = false;
      if (key === "shift" || key === "n") inputRef.current.nitro = false;
    };
    window.addEventListener("keydown", down, { passive: false });
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  const hold = (name, value) => {
    inputRef.current[name] = value;
    if (name === "brake") setBraking(value);
    if (name === "nitro") setNitroOn(value);
    if (name === "steer") setSteering(value);
  };

  return (
    <main className="rush-app">
      <header className="rush-header">
        <div className="rush-logo">TREASURE <span>RUSH X</span></div>
        <div className="rush-tagline">RACE • CHALLENGE • WIN</div>
      </header>

      <section className="rush-game">
        <div className="rush-scene" ref={mountRef} />
        {screen !== "race" && <div className="scene-shade" />}

        {screen === "menu" && (
          <div className="rush-menu">
            <p className="eyebrow">THE NEXT GENERATION OF STREET RACING</p>
            <h1>OWN THE <span>ROAD.</span></h1>
            <p className="menu-copy">Luxury machines. Epic challenges. Race your friends.</p>
            <button className="primary-btn" onClick={startRace}>START SOLO RACE</button>
            <button className="secondary-btn" onClick={createRoom}>CREATE ONLINE RACE</button>
            <button className="secondary-btn" onClick={() => { setScreen("join"); setMessage(""); }}>
              JOIN A FRIEND
            </button>
            <button className="secondary-btn" onClick={() => setScreen("garage")}>LUXURY GARAGE</button>
            <p className="small-note">Solo challenges are playable without a room. Online races require Firebase setup.</p>
          </div>
        )}

        {screen === "garage" && (
          <div className="rush-menu">
            <p className="eyebrow">YOUR PERSONAL COLLECTION</p>
            <h1>LUXURY <span>GARAGE</span></h1>
            <div className="car-options">
              {cars.map((car, index) => (
                <button key={car.name}
                  className={index === carIndex ? "car-option selected" : "car-option"}
                  onClick={() => setCarIndex(index)}>
                  <span className="car-dot" style={{ background: `#${car.color.toString(16).padStart(6, "0")}` }} />
                  {car.name}
                </button>
              ))}
            </div>
            <p>Choose a car, then return to the main menu.</p>
            <button className="primary-btn" onClick={() => setScreen("menu")}>SAVE & RETURN</button>
          </div>
        )}

        {screen === "join" && (
          <div className="rush-menu">
            <p className="eyebrow">RACE WITH YOUR CREW</p>
            <h1>JOIN A <span>ROOM</span></h1>
            <input className="room-input" value={joinCode}
              onChange={(e) => setJoinCode(cleanCode(e.target.value))}
              placeholder="ENTER 6-CHARACTER CODE" maxLength={6} />
            <button className="primary-btn" onClick={joinRoom}>JOIN RACE</button>
            <button className="secondary-btn" onClick={() => setScreen("menu")}>BACK</button>
            {message && <p className="rush-message">{message}</p>}
          </div>
        )}

        {screen === "lobby" && (
          <div className="rush-menu">
            <p className="eyebrow">ONLINE RACE LOBBY</p>
            <h1>ROOM <span>{roomCode}</span></h1>
            <p>Share this code with your friend on their phone.</p>
            <button className="secondary-btn" onClick={() => navigator.clipboard?.writeText(roomCode)}>COPY ROOM CODE</button>
            <p>{opponent ? "Opponent connected!" : "Waiting for the other racer to join..."}</p>
            <button className="primary-btn" onClick={startRace}>START RACE</button>
            <button className="secondary-btn" onClick={leaveRace}>LEAVE ROOM</button>
            {message && <p className="rush-message">{message}</p>}
          </div>
        )}

        {screen === "race" && (
          <>
            <div className="race-hud">
              <div><small>SPEED</small><strong>{speed}<i> km/h</i></strong></div>
              <div><small>DISTANCE</small><strong>{distance}<i> m</i></strong></div>
              <div><small>NITRO</small><strong>{nitro}%</strong><div className="nitro-bar"><span style={{ width: `${nitro}%` }} /></div></div>
            </div>
            {countdown && <div className="countdown">{countdown}</div>}
            <div className="race-label">
              {roomRef.current ? `ONLINE ROOM ${roomCode}` : "SOLO CHALLENGE"}
              {opponent && <span> • OPPONENT CONNECTED</span>}
            </div>
            <div className="race-controls">
              <div className="steer-controls">
                <button aria-label="Steer left" onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); hold("steer", -1); }} onPointerUp={() => hold("steer", 0)} onPointerCancel={() => hold("steer", 0)}>◀</button>
                <button aria-label="Steer right" onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); hold("steer", 1); }} onPointerUp={() => hold("steer", 0)} onPointerCancel={() => hold("steer", 0)}>▶</button>
              </div>
              <div className="pedal-controls">
                <button className={braking ? "pedal active" : "pedal"} onPointerDown={() => hold("brake", true)} onPointerUp={() => hold("brake", false)} onPointerCancel={() => hold("brake", false)}>BRAKE</button>
                <button className={nitroOn ? "nitro-btn active" : "nitro-btn"} onPointerDown={() => hold("nitro", true)} onPointerUp={() => hold("nitro", false)} onPointerCancel={() => hold("nitro", false)}>NITRO ⚡</button>
              </div>
            </div>
            <button className="exit-race" onClick={leaveRace}>EXIT RACE</button>
          </>
        )}
      </section>

      {message && screen !== "join" && screen !== "lobby" && (
        <p className="bottom-message">{message}</p>
      )}
      <footer className="rush-footer">
        <span>STREET RUSH X</span>
        <span>BUILT FOR THE FEARLESS</span>
        <span>ARROWS / A-D • SPACE BRAKE • SHIFT NITRO</span>
      </footer>
    </main>
  );
}

export default App;
