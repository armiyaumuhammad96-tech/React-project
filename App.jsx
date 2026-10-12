
import React, { useEffect, useRef, useState } from "react";
import "./styles.css";

const DB_URL = "PASTE_YOUR_FIREBASE_DATABASE_URL_HERE";
const THREE_URL =
  "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";

const COUNTRIES = [
  {
    id: "london",
    name: "LONDON",
    country: "UNITED KINGDOM",
    landmark: "Big Ben • Tower Bridge • City skyline",
    color: 0x1569a8,
    sky: 0x5f9bc4,
    road: 0x252c38,
    goal: 1000,
  },
  {
    id: "dubai",
    name: "DUBAI",
    country: "UNITED ARAB EMIRATES",
    landmark: "Burj Khalifa-inspired skyline • Desert highway",
    color: 0xe4a13a,
    sky: 0xffb66e,
    road: 0x34313b,
    goal: 1400,
  },
];

const CARS = [
  { name: "Scarlet V12", color: 0xf21e43, speed: 1 },
  { name: "Azure GT", color: 0x087dff, speed: 1.08 },
  { name: "Gold Phantom", color: 0xffbd36, speed: 1.04 },
  { name: "Emerald RS", color: 0x00c987, speed: 1.02 },
];

const makeId = () => Math.random().toString(36).slice(2, 10);
const cleanCode = (v) =>
  String(v || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);

function App() {
  const mountRef = useRef(null);
  const gameRef = useRef(null);
  const inputRef = useRef({ steer: 0, brake: false, nitro: false });
  const playerId = useRef(makeId());
  const roomRef = useRef("");
  const statusRef = useRef("menu");
  const pollRef = useRef(null);
  const startedAt = useRef(0);

  const [screen, setScreen] = useState("menu");
  const [countryIndex, setCountryIndex] = useState(0);
  const [carIndex, setCarIndex] = useState(0);
  const [countdown, setCountdown] = useState("");
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(0);
  const [distance, setDistance] = useState(0);
  const [nitro, setNitro] = useState(100);
  const [roomCode, setRoomCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [players, setPlayers] = useState([]);
  const [message, setMessage] = useState("");
  const [stars, setStars] = useState({});
  const [raceResult, setRaceResult] = useState(null);

  const country = COUNTRIES[countryIndex];
  const currentStars = stars[country.id] || 0;
  const unlocked = (id) =>
    id === "london" || (stars.london || 0) > 0;

  async function database(path, method = "GET", value) {
    if (!DB_URL.startsWith("https://") || DB_URL.includes("PASTE_YOUR")) {
      throw new Error("First add your Firebase database URL in App.jsx.");
    }
    const response = await fetch(
      `${DB_URL.replace(/\/$/, "")}/${path}.json`,
      {
        method,
        headers: { "Content-Type": "application/json" },
        ...(value === undefined ? {} : { body: JSON.stringify(value) }),
      }
    );
    if (!response.ok) {
      throw new Error(
        "Firebase request failed. Check the database URL and security rules."
      );
    }
    return response.json();
  }

  async function createRoom() {
    try {
      const code = Math.random().toString(36).slice(2, 8).toUpperCase();
      const player = {
        id: playerId.current,
        name: "Racer 1",
        distance: 0,
        x: 0,
        speed: 0,
        finished: false,
        updated: Date.now(),
      };
      await database(`rooms/${code}`, "PUT", {
        host: playerId.current,
        status: "lobby",
        country: country.id,
        players: { [playerId.current]: player },
      });
      roomRef.current = code;
      setRoomCode(code);
      setScreen("lobby");
      setMessage("Share this room code with up to five friends.");
      await refreshPlayers(code);
    } catch (e) {
      setMessage(e.message);
    }
  }

  async function joinRoom() {
    const code = cleanCode(joinCode);
    if (!code) {
      setMessage("Enter your friend's room code.");
      return;
    }
    try {
      const room = await database(`rooms/${code}`);
      if (!room) {
        setMessage("Room not found. Check the code.");
        return;
      }
      const existing = room.players || {};
      if (!existing[playerId.current] && Object.keys(existing).length >= 6) {
        setMessage("This race is full. Six players maximum.");
        return;
      }
      if (room.status === "racing") {
        setMessage("This race has already started. Ask your friend to create a new room.");
        return;
      }
      await database(
        `rooms/${code}/players/${playerId.current}`,
        "PUT",
        {
          id: playerId.current,
          name: `Racer ${Object.keys(existing).length + 1}`,
          distance: 0,
          x: 0,
          speed: 0,
          finished: false,
          updated: Date.now(),
        }
      );
      roomRef.current = code;
      setRoomCode(code);
      setCountryIndex(Math.max(0, COUNTRIES.findIndex((c) => c.id === room.country)));
      setScreen("lobby");
      setMessage("You joined the room.");
      await refreshPlayers(code);
    } catch (e) {
      setMessage(e.message);
    }
  }

  async function refreshPlayers(code = roomRef.current) {
    if (!code) return;
    try {
      const result = await database(`rooms/${code}/players`);
      setPlayers(Object.values(result || {}));
    } catch {
      // Temporary network failures are retried by the next refresh.
    }
  }

  function stopPolling() {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
  }

  function startPolling() {
    stopPolling();
    pollRef.current = setInterval(() => refreshPlayers(), 900);
  }

  async function startCountdown() {
    if (roomRef.current) {
      try {
        const room = await database(`rooms/${roomRef.current}`);
        if (room?.host !== playerId.current) {
          setMessage("Only the room creator can start the race.");
          return;
        }
        await database(`rooms/${roomRef.current}/status`, "PUT", "countdown");
      } catch (e) {
        setMessage(e.message);
        return;
      }
    }

    statusRef.current = "countdown";
    setScreen("race");
    setPaused(false);
    setSpeed(0);
    setDistance(0);
    setNitro(100);
    if (gameRef.current) {
      gameRef.current.distance = 0;
      gameRef.current.speed = 0;
      gameRef.current.x = 0;
    }

    for (const value of ["3", "2", "1", "GO!"]) {
      if (statusRef.current !== "countdown") return;
      setCountdown(value);
      await new Promise((resolve) => setTimeout(resolve, 800));
    }

    setCountdown("");
    statusRef.current = "racing";
    startedAt.current = Date.now();

    if (roomRef.current) {
      try {
        await database(`rooms/${roomRef.current}/status`, "PUT", "racing");
        await database(`rooms/${roomRef.current}/startedAt`, "PUT", startedAt.current);
      } catch (e) {
        setMessage(e.message);
      }
    }
  }

  function pauseRace() {
    if (statusRef.current === "racing") {
      statusRef.current = "paused";
      setPaused(true);
    } else if (statusRef.current === "paused") {
      statusRef.current = "racing";
      setPaused(false);
    }
  }

  async function finishRace() {
    if (statusRef.current !== "racing") return;
    statusRef.current = "finished";
    const seconds = Math.max(1, (Date.now() - startedAt.current) / 1000);
    const score = Math.floor(distance + Math.max(0, nitro) * 2);
    const earned = distance >= country.goal
      ? (seconds < 55 ? 3 : seconds < 85 ? 2 : 1)
      : distance >= country.goal * 0.5 ? 1 : 0;

    const next = { ...stars, [country.id]: Math.max(stars[country.id] || 0, earned) };
    setStars(next);
    try {
      localStorage.setItem("treasure-rush-stars", JSON.stringify(next));
    } catch {}
    setRaceResult({ seconds: seconds.toFixed(1), score, earned, distance });
    setScreen("results");

    if (roomRef.current) {
      try {
        await database(`rooms/${roomRef.current}/players/${playerId.current}/result`, "PUT", {
          seconds,
          score,
          stars: earned,
          distance,
          finished: true,
          updated: Date.now(),
        });
        await database(`rooms/${roomRef.current}/players/${playerId.current}/finished`, "PUT", true);
      } catch {}
    }
  }

  function leaveRace() {
    statusRef.current = "menu";
    setPaused(false);
    setCountdown("");
    setScreen("menu");
    setRaceResult(null);
    setMessage("");
    roomRef.current = "";
    setRoomCode("");
    setPlayers([]);
    stopPolling();
    inputRef.current = { steer: 0, brake: false, nitro: false };
  }

  useEffect(() => {
    try {
      const saved = localStorage.getItem("treasure-rush-stars");
      if (saved) setStars(JSON.parse(saved));
    } catch {}
  }, []);

  useEffect(() => {
    let cancelled = false;
    let renderer, scene, camera, car, roadMarks = [], buildings = [], trees = [];
    let frame = 0, last = 0, hudTime = 0, syncTime = 0;

    function buildCar(THREE, color) {
      const group = new THREE.Group();
      const paint = new THREE.MeshStandardMaterial({
        color, metalness: 0.8, roughness: 0.22,
      });
      const glass = new THREE.MeshStandardMaterial({
        color: 0x142b45, metalness: 0.7, roughness: 0.15,
      });
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.42, 3.3), paint);
      body.position.y = 0.53;
      group.add(body);
      const bonnet = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.18, 1.2), paint);
      bonnet.position.set(0, 0.75, -0.85);
      group.add(bonnet);
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.45, 1.35), glass);
      cabin.position.set(0, 0.91, 0.25);
      group.add(cabin);

      for (const side of [-1, 1]) {
        for (const z of [-1.05, 1.05]) {
          const wheel = new THREE.Mesh(
            new THREE.CylinderGeometry(0.34, 0.34, 0.24, 24),
            new THREE.MeshStandardMaterial({ color: 0x11131a, roughness: 0.85 })
          );
          wheel.rotation.z = Math.PI / 2;
          wheel.position.set(side * 0.9, 0.32, z);
          group.add(wheel);
        }
        const light = new THREE.Mesh(
          new THREE.BoxGeometry(0.3, 0.1, 0.07),
          new THREE.MeshBasicMaterial({ color: 0xfff4cf })
        );
        light.position.set(side * 0.55, 0.57, -1.68);
        group.add(light);
      }
      return group;
    }

    function build(THREE) {
      if (cancelled || !mountRef.current || renderer) return;
      const location = COUNTRIES[countryIndex];
      scene = new THREE.Scene();
      scene.background = new THREE.Color(location.sky);
      scene.fog = new THREE.Fog(location.sky, 40, 200);

      camera = new THREE.PerspectiveCamera(
        62,
        mountRef.current.clientWidth / Math.max(1, mountRef.current.clientHeight),
        0.1, 600
      );
      camera.position.set(0, 6, 12);

      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      mountRef.current.innerHTML = "";
      mountRef.current.appendChild(renderer.domElement);

      scene.add(new THREE.HemisphereLight(0xe3f4ff, 0x4b3a2d, 2.1));
      const sun = new THREE.DirectionalLight(0xffe8c2, 2.8);
      sun.position.set(-12, 22, 9);
      sun.castShadow = true;
      scene.add(sun);

      const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(260, 550),
        new THREE.MeshStandardMaterial({ color: countryIndex === 0 ? 0x536e59 : 0xb99b70 })
      );
      ground.rotation.x = -Math.PI / 2;
      ground.position.set(0, -0.1, -200);
      scene.add(ground);

      const road = new THREE.Mesh(
        new THREE.PlaneGeometry(13, 550),
        new THREE.MeshStandardMaterial({ color: location.road, roughness: 0.92 })
      );
      road.rotation.x = -Math.PI / 2;
      road.position.set(0, 0, -200);
      scene.add(road);

      for (const x of [-6.3, 6.3]) {
        const rail = new THREE.Mesh(
          new THREE.BoxGeometry(0.18, 0.35, 550),
          new THREE.MeshStandardMaterial({ color: 0xd7e6ef, metalness: 0.4 })
        );
        rail.position.set(x, 0.2, -200);
        scene.add(rail);
      }

      for (let z = 15; z > -300; z -= 10) {
        const stripe = new THREE.Mesh(
          new THREE.BoxGeometry(0.14, 0.025, 4),
          new THREE.MeshBasicMaterial({ color: 0xfff3d0 })
        );
        stripe.position.set(0, 0.025, z);
        scene.add(stripe);
        roadMarks.push(stripe);
      }

      for (let i = 0; i < 64; i++) {
        const side = i % 2 ? -1 : 1;
        const height = countryIndex === 1
          ? (i % 7 === 0 ? 35 + Math.random() * 35 : 7 + Math.random() * 24)
          : 8 + Math.random() * 24;
        const width = 3 + Math.random() * 5;
        const building = new THREE.Group();

        const tower = new THREE.Mesh(
          new THREE.BoxGeometry(width, height, 4 + Math.random() * 4),
          new THREE.MeshStandardMaterial({
            color: countryIndex === 0
              ? [0x7d8994, 0xb2a08b, 0x394e64, 0x8e9eaa][i % 4]
              : [0xd2b88d, 0xc7d5df, 0x8b9caa, 0x485a70][i % 4],
            metalness: 0.28,
            roughness: 0.48,
          })
        );
        tower.position.y = height / 2;
        building.add(tower);

        const rows = Math.min(15, Math.floor(height / 2.5));
        for (let row = 0; row < rows; row++) {
          for (let col = -1; col <= 1; col++) {
            const windowMesh = new THREE.Mesh(
              new THREE.BoxGeometry(0.34, 0.5, 0.04),
              new THREE.MeshBasicMaterial({
                color: i % 3 === 0 ? 0xffd889 : 0x79bfff,
              })
            );
            windowMesh.position.set(
              col * (width / 3.4),
              row * 2.1 + 1.2,
              (4 + 2) / 2 + 0.03
            );
            building.add(windowMesh);
          }
        }

        building.position.set(side * (10 + Math.random() * 18), 0, -i * 5 - 15);
        scene.add(building);
        buildings.push(building);
      }

      for (let i = 0; i < 18; i++) {
        const tree = new THREE.Group();
        const trunk = new THREE.Mesh(
          new THREE.CylinderGeometry(0.14, 0.22, 1.5, 8),
          new THREE.MeshStandardMaterial({ color: 0x765039 })
        );
        trunk.position.y = 0.75;
        tree.add(trunk);
        const crown = new THREE.Mesh(
          new THREE.SphereGeometry(1.1, 10, 8),
          new THREE.MeshStandardMaterial({ color: 0x23754d, roughness: 0.9 })
        );
        crown.position.y = 2;
        tree.add(crown);
        tree.position.set(i % 2 ? -8.1 : 8.1, 0, -i * 17 - 10);
        scene.add(tree);
        trees.push(tree);
      }

      if (countryIndex === 0) {
        // Stylized clock-tower landmark.
        const landmark = new THREE.Group();
        const base = new THREE.Mesh(
          new THREE.BoxGeometry(4.5, 19, 4),
          new THREE.MeshStandardMaterial({ color: 0xd6c4a4, roughness: 0.7 })
        );
        base.position.y = 9.5;
        landmark.add(base);
        const roof = new THREE.Mesh(
          new THREE.ConeGeometry(3.2, 6, 4),
          new THREE.MeshStandardMaterial({ color: 0x32444b })
        );
        roof.position.y = 22;
        landmark.add(roof);
        landmark.position.set(-23, 0, -65);
        scene.add(landmark);
        buildings.push(landmark);
      } else {
        // Stylized tapered landmark inspired by Dubai's skyline.
        const landmark = new THREE.Group();
        for (let i = 0; i < 9; i++) {
          const width = 5.5 * (1 - i / 10);
          const tier = new THREE.Mesh(
            new THREE.BoxGeometry(width, 5.5, width * 0.7),
            new THREE.MeshStandardMaterial({
              color: i % 2 ? 0x9ab8c8 : 0xc6dce6,
              metalness: 0.7,
              roughness: 0.22,
            })
          );
          tier.position.y = i * 5.5 + 2.75;
          landmark.add(tier);
        }
        landmark.position.set(22, 0, -70);
        scene.add(landmark);
        buildings.push(landmark);
      }

      car = buildCar(THREE, CARS[carIndex].color);
      car.position.set(0, 0, 4);
      scene.add(car);

      gameRef.current = { x: 0, speed: 0, distance: 0, nitro: 100 };

      const resize = () => {
        if (!mountRef.current || !renderer) return;
        camera.aspect = mountRef.current.clientWidth /
          Math.max(1, mountRef.current.clientHeight);
        camera.updateProjectionMatrix();
        renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
      };
      window.addEventListener("resize", resize);

      function animate(now) {
        frame = requestAnimationFrame(animate);
        if (cancelled || !renderer) return;
        const dt = Math.min((now - (last || now)) / 1000, 0.05);
        last = now;
        const g = gameRef.current;
        const active = statusRef.current === "racing";
        const input = inputRef.current;

        if (g && active) {
          const boost = input.nitro && g.nitro > 0;
          const target = input.brake ? 0 : boost ? 43 : 29;
          g.speed += (target - g.speed) * Math.min(1, dt * 1.6);
          g.nitro = boost
            ? Math.max(0, g.nitro - 25 * dt)
            : Math.min(100, g.nitro + 5 * dt);
          g.x = Math.max(-4.7, Math.min(4.7, g.x + input.steer * dt * 7));
          g.distance += g.speed * dt * 0.7;

          car.position.x += (g.x - car.position.x) * Math.min(1, dt * 8);
          car.rotation.z = -input.steer * 0.1;
          const move = g.speed * dt * 0.7;

          [...roadMarks, ...buildings, ...trees].forEach((obj) => {
            obj.position.z += move;
            if (obj.position.z > 18) obj.position.z -= 320;
          });

          if (roomRef.current && now - syncTime > 500) {
            syncTime = now;
            const code = roomRef.current;
            database(`rooms/${code}/players/${playerId.current}`, "PATCH", {
              distance: g.distance,
              x: g.x,
              speed: g.speed,
              updated: Date.now(),
            }).catch(() => {});
          }

          if (now - hudTime > 150) {
            hudTime = now;
            setSpeed(Math.round(g.speed * CARS[carIndex].speed * 5));
            setDistance(Math.floor(g.distance));
            setNitro(Math.round(g.nitro));
          }

          if (g.distance >= location.goal) {
            setDistance(Math.floor(g.distance));
            finishRace();
          }
        } else if (g && statusRef.current !== "paused") {
          g.speed *= 0.95;
          const move = 0.25;
          [...roadMarks, ...buildings, ...trees].forEach((obj) => {
            obj.position.z += move;
            if (obj.position.z > 18) obj.position.z -= 320;
          });
        }

        camera.position.x += ((car?.position.x || 0) * 0.3 - camera.position.x) * 0.04;
        camera.lookAt(car ? car.position.x * 0.18 : 0, 0.8, -12);
        renderer.render(scene, camera);
      }
      animate(0);

      return () => {
        window.removeEventListener("resize", resize);
      };
    }

    function loadThree() {
      if (window.THREE) {
        build(window.THREE);
        return;
      }
      let script = document.querySelector('script[data-rush-three="yes"]');
      if (!script) {
        script = document.createElement("script");
        script.src = THREE_URL;
        script.dataset.rushThree = "yes";
        document.head.appendChild(script);
      }
      const loaded = () => { if (!cancelled) build(window.THREE); };
      script.addEventListener("load", loaded);
      script.addEventListener("error", () =>
        setMessage("3D graphics could not load. Check your internet connection.")
      );
    }

    loadThree();
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      if (renderer) renderer.dispose();
      if (mountRef.current) mountRef.current.innerHTML = "";
    };
  }, [countryIndex, carIndex]);

  useEffect(() => {
    const down = (e) => {
      const key = e.key.toLowerCase();
      if (["arrowleft", "arrowright", "arrowdown", " "].includes(key)) e.preventDefault();
      if (key === "arrowleft" || key === "a") inputRef.current.steer = -1;
      if (key === "arrowright" || key === "d") inputRef.current.steer = 1;
      if (key === "arrowdown" || key === "s" || key === " ") inputRef.current.brake = true;
      if (key === "shift" || key === "n") inputRef.current.nitro = true;
      if (key === "p" && statusRef.current === "racing") pauseRace();
      else if (key === "p" && statusRef.current === "paused") pauseRace();
    };
    const up = (e) => {
      const key = e.key.toLowerCase();
      if (["arrowleft", "a", "arrowright", "d"].includes(key)) inputRef.current.steer = 0;
      if (["arrowdown", "s", " "].includes(key)) inputRef.current.brake = false;
      if (["shift", "n"].includes(key)) inputRef.current.nitro = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  });

  useEffect(() => {
    if (screen === "lobby" || screen === "race") startPolling();
    else stopPolling();
    return stopPolling;
  }, [screen]);

  function hold(name, value) {
    inputRef.current[name] = value;
  }

  return (
    <main className="rush-app">
      <header className="rush-header">
        <div>
          <div className="rush-logo">TREASURE <span>RUSH X</span></div>
          <div className="rush-tagline">LUXURY WORLD TOUR</div>
        </div>
        <div className="header-badge">3D RACING • CHALLENGES • FRIENDS</div>
      </header>

      <section className="rush-game">
        <div className="rush-scene" ref={mountRef} />
        <div className="scene-vignette" />

        {screen === "menu" && (
          <div className="rush-panel">
            <p className="eyebrow">THE WORLD IS YOUR TRACK</p>
            <h1>RACE BEYOND <span>LIMITS.</span></h1>
            <p>Drive luxury. Conquer cities. Collect your stars.</p>
            <div className="level-card">
              <div>
                <small>YOUR NEXT DESTINATION</small>
                <h2>{country.name}</h2>
                <p>{country.country}</p>
                <p className="landmark">{country.landmark}</p>
              </div>
              <div className="star-row">
                {"★".repeat(currentStars)}{"☆".repeat(3 - currentStars)}
              </div>
            </div>
            <button className="primary-btn" onClick={startCountdown}>START RACE</button>
            <button className="secondary-btn" onClick={() => setScreen("countries")}>COUNTRY LEVELS</button>
            <button className="secondary-btn" onClick={() => setScreen("garage")}>LUXURY GARAGE</button>
            <button className="secondary-btn" onClick={createRoom}>CREATE FRIEND RACE</button>
            <button className="secondary-btn" onClick={() => setScreen("join")}>JOIN WITH ROOM CODE</button>
            <p className="fine-print">Automatic acceleration • Brake • Steering • Nitro</p>
          </div>
        )}

        {screen === "countries" && (
          <div className="rush-panel">
            <p className="eyebrow">CHOOSE YOUR DESTINATION</p>
            <h1>WORLD <span>TOUR</span></h1>
            {COUNTRIES.map((c, index) => (
              <button
                key={c.id}
                disabled={!unlocked(c.id)}
                className={`country-card ${countryIndex === index ? "selected" : ""}`}
                onClick={() => { setCountryIndex(index); setMessage(""); }}
              >
                <span>
                  <strong>{index + 1}. {c.name}</strong>
                  <small>{c.country}</small>
                  <small>{c.landmark}</small>
                </span>
                <span className="star-row">
                  {unlocked(c.id)
                    ? "★".repeat(stars[c.id] || 0) + "☆".repeat(3 - (stars[c.id] || 0))
                    : "🔒"}
                </span>
              </button>
            ))}
            <button className="primary-btn" onClick={() => setScreen("menu")}>BACK TO MENU</button>
          </div>
        )}

        {screen === "garage" && (
          <div className="rush-panel">
            <p className="eyebrow">YOUR COLLECTION</p>
            <h1>LUXURY <span>GARAGE</span></h1>
            {CARS.map((carOption, index) => (
              <button key={carOption.name}
                className={`country-card ${carIndex === index ? "selected" : ""}`}
                onClick={() => setCarIndex(index)}>
                <span><strong>{carOption.name}</strong><small>Top speed rating: {Math.round(carOption.speed * 100)}</small></span>
                <span className="car-swatch" style={{ background: `#${carOption.color.toString(16).padStart(6, "0")}` }} />
              </button>
            ))}
            <button className="primary-btn" onClick={() => setScreen("menu")}>SAVE & RETURN</button>
          </div>
        )}

        {screen === "join" && (
          <div className="rush-panel">
            <p className="eyebrow">RACE WITH FRIENDS</p>
            <h1>JOIN A <span>ROOM</span></h1>
            <input value={joinCode} maxLength={6}
              onChange={(e) => setJoinCode(cleanCode(e.target.value))}
              placeholder="ENTER ROOM CODE" className="room-input" />
            <button className="primary-btn" onClick={joinRoom}>JOIN RACE</button>
            <button className="secondary-btn" onClick={() => setScreen("menu")}>BACK</button>
            {message && <p className="rush-message">{message}</p>}
          </div>
        )}

        {screen === "lobby" && (
          <div className="rush-panel">
            <p className="eyebrow">MULTIPLAYER LOBBY</p>
            <h1>ROOM <span>{roomCode}</span></h1>
            <p>Share this code with up to five friends.</p>
            <button className="secondary-btn" onClick={() => navigator.clipboard?.writeText(roomCode)}>COPY ROOM CODE</button>
            <div className="player-list">
              {players.map((p) => (
                <div key={p.id || p.name}>🏎️ {p.name || "Racer"} <span>{p.finished ? "FINISHED" : "CONNECTED"}</span></div>
              ))}
            </div>
            <button className="primary-btn" onClick={startCountdown}>START RACE</button>
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
            <div className="race-location">{country.name} • {country.country}</div>
            <button className="pause-btn" onClick={pauseRace}>
              {paused ? "▶ RESUME" : "Ⅱ PAUSE"}
            </button>
            {countdown && <div className="countdown">{countdown}</div>}
            {paused && <div className="pause-overlay"><h2>RACE PAUSED</h2><p>Your progress is waiting.</p><button className="primary-btn" onClick={pauseRace}>RESUME RACE</button><button className="secondary-btn" onClick={leaveRace}>QUIT RACE</button></div>}
            <div className="race-controls">
              <div className="steer-controls">
                <button onPointerDown={() => hold("steer", -1)} onPointerUp={() => hold("steer", 0)} onPointerCancel={() => hold("steer", 0)}>◀</button>
                <button onPointerDown={() => hold("steer", 1)} onPointerUp={() => hold("steer", 0)} onPointerCancel={() => hold("steer", 0)}>▶</button>
              </div>
              <div className="pedal-controls">
                <button onPointerDown={() => hold("brake", true)} onPointerUp={() => hold("brake", false)} onPointerCancel={() => hold("brake", false)}>BRAKE</button>
                <button onPointerDown={() => hold("nitro", true)} onPointerUp={() => hold("nitro", false)} onPointerCancel={() => hold("nitro", false)}>NITRO ⚡</button>
              </div>
            </div>
          </>
        )}

        {screen === "results" && raceResult && (
          <div className="rush-panel results-panel">
            <p className="eyebrow">FINISH LINE CROSSED</p>
            <h1>RACE <span>RESULT</span></h1>
            <div className="result-stars">
              {"★".repeat(raceResult.earned)}{"☆".repeat(3 - raceResult.earned)}
            </div>
            <h2>{raceResult.earned === 3 ? "PERFECT RACE!" : raceResult.earned === 2 ? "GREAT DRIVE!" : raceResult.earned === 1 ? "LEVEL COMPLETED!" : "KEEP PRACTISING!"}</h2>
            <p>Distance: {raceResult.distance} m</p>
            <p>Time: {raceResult.seconds} seconds</p>
            <p>Score: {raceResult.score}</p>
            <button className="primary-btn" onClick={() => { setCountryIndex(0); setScreen("menu"); }}>RETURN TO MENU</button>
            <button className="secondary-btn" onClick={startCountdown}>RACE AGAIN</button>
          </div>
        )}
      </section>

      <footer className="rush-footer">
        <span>TREASURE RUSH X</span>
        <span>ARROWS / A-D: STEER • SPACE: BRAKE • SHIFT: NITRO • P: PAUSE</span>
      </footer>
      {message && !["join", "lobby"].includes(screen) && <p className="bottom-message">{message}</p>}
    </main>
  );
}

export default App;
