
import React, { useEffect, useRef, useState } from "react";

export default function App() {
  const mountRef = useRef(null);
  const gameRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState("car");
  const [speed, setSpeed] = useState(0);
  const [nitro, setNitro] = useState(100);
  const [distance, setDistance] = useState(0);
  const [message, setMessage] = useState("READY TO RACE");

  useEffect(() => {
    let renderer, scene, camera, frame;
    let cleanup = false;
    let threeScript;
    let disposeGame = () => {};

    function startGame(THREE) {
      if (cleanup || !mountRef.current) return;

      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x91c8ed);
      scene.fog = new THREE.Fog(0x91c8ed, 35, 180);

      camera = new THREE.PerspectiveCamera(
        65,
        mountRef.current.clientWidth /
          Math.max(mountRef.current.clientHeight, 1),
        0.1,
        300
      );

      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(
        mountRef.current.clientWidth,
        mountRef.current.clientHeight
      );

      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      mountRef.current.appendChild(renderer.domElement);

      scene.add(new THREE.HemisphereLight(0xffffff, 0x354050, 2));

      const sun = new THREE.DirectionalLight(0xffffff, 2.5);
      sun.position.set(-15, 25, -10);
      sun.castShadow = true;
      scene.add(sun);

      const material = (color, roughness = 0.8) =>
        new THREE.MeshStandardMaterial({ color, roughness });

      const roadMat = material(0x30333a);
      const lineMat = material(0xf4f0d4);
      const grassMat = material(0x34733d);
      const treeMat = material(0x17552b);
      const trunkMat = material(0x65432c);
      const carMat = material(0xff304f, 0.3);
      const glassMat = material(0x172b43, 0.2);
      const rivalMat = material(0x2688ff, 0.3);
      const coneMat = material(0xff9b26);

      function cube(parent, size, mat, position) {
        const obj = new THREE.Mesh(
          new THREE.BoxGeometry(...size),
          mat
        );
        obj.position.set(...position);
        obj.castShadow = true;
        obj.receiveShadow = true;
        parent.add(obj);
        return obj;
      }

      // Ground and road
      const ground = cube(
        scene,
        [500, 0.2, 300],
        grassMat,
        [0, -0.3, -100]
      );

      const road = cube(
        scene,
        [12, 0.12, 280],
        roadMat,
        [0, -0.16, -110]
      );

      // Road edges
      [-6.1, 6.1].forEach((x) => {
        cube(scene, [0.22, 0.2, 280], lineMat, [x, -0.04, -110]);
      });

      // Broken lane markings
      const laneMarks = [];
      for (let z = 10; z > -260; z -= 9) {
        for (const x of [-2, 2]) {
          laneMarks.push(
            cube(scene, [0.11, 0.025, 3.5], lineMat, [x, -0.08, z])
          );
        }
      }

      // A low-poly roadside forest
      const trees = [];
      for (let i = 0; i < 64; i++) {
        const z = 12 - i * 4.3;

        for (const side of [-1, 1]) {
          const x = side * (10 + Math.random() * 20);
          const tree = new THREE.Group();

          const trunk = new THREE.Mesh(
            new THREE.CylinderGeometry(0.18, 0.3, 2.2, 6),
            trunkMat
          );
          trunk.position.y = 1.1;
          tree.add(trunk);

          const crown = new THREE.Mesh(
            new THREE.ConeGeometry(1.6 + Math.random(), 4, 7),
            treeMat
          );
          crown.position.y = 3.6;
          tree.add(crown);

          tree.position.set(x, -0.1, z);
          scene.add(tree);
          trees.push(tree);
        }
      }

      // Player vehicle
      const player = new THREE.Group();

      cube(player, [1.65, 0.5, 3.1], carMat, [0, 0.65, 0]);
      cube(player, [1.15, 0.55, 1.35], glassMat, [0, 1.15, -0.15]);

      const wheels = [];
      for (const x of [-0.9, 0.9]) {
        for (const z of [-0.95, 0.95]) {
          const wheel = new THREE.Mesh(
            new THREE.CylinderGeometry(0.37, 0.37, 0.24, 12),
            material(0x111318)
          );
          wheel.rotation.z = Math.PI / 2;
          wheel.position.set(x, 0.4, z);
          player.add(wheel);
          wheels.push(wheel);
        }
      }

      // Headlights and tail lights
      for (const x of [-0.52, 0.52]) {
        cube(player, [0.3, 0.18, 0.1], material(0xfff3b0), [x, 0.68, -1.57]);
        cube(player, [0.3, 0.16, 0.1], material(0xff152d), [x, 0.68, 1.57]);
      }

      player.position.set(0, 0, 4);
      scene.add(player);

      // Walking character made from simple 3D shapes
      const person = new THREE.Group();
      const skin = material(0xf0bb87);
      const shirt = material(0xff4057);
      const pants = material(0x202c42);

      const body = cube(person, [0.65, 0.85, 0.35], shirt, [0, 1.15, 0]);

      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.28, 12, 10),
        skin
      );
      head.position.y = 1.85;
      person.add(head);

      const legs = [];
      for (const x of [-0.19, 0.19]) {
        const leg = cube(person, [0.2, 0.72, 0.23], pants, [x, 0.4, 0]);
        legs.push(leg);
      }

      const arms = [];
      for (const x of [-0.43, 0.43]) {
        const arm = cube(person, [0.18, 0.7, 0.2], skin, [x, 1.12, 0]);
        arms.push(arm);
      }

      person.position.set(0, 0, 4);
      person.visible = false;
      scene.add(person);

      // Traffic obstacles and rival cars
      const obstacles = [];

      function makeObstacle(z) {
        const group = new THREE.Group();
        const obstacle = cube(
          group,
          [1.2, 1.5, 1.1],
          coneMat,
          [0, 0.75, 0]
        );
        const stripe = cube(
          group,
          [1.22, 0.2, 1.12],
          lineMat,
          [0, 0.85, 0]
        );
        group.position.set([-4, 0, 4][Math.floor(Math.random() * 3)], 0, z);
        scene.add(group);
        obstacles.push({ group, z, hit: false });
      }

      for (let i = 0; i < 12; i++) {
        makeObstacle(-25 - i * 19);
      }

      const rivals = [];
      for (let i = 0; i < 3; i++) {
        const rival = new THREE.Group();
        cube(rival, [1.6, 0.55, 3], rivalMat, [0, 0.65, 0]);
        cube(rival, [1.05, 0.5, 1.2], glassMat, [0, 1.15, -0.15]);
        rival.position.set(i % 2 ? 3.8 : -3.8, 0, -35 - i * 48);
        scene.add(rival);
        rivals.push(rival);
      }

      const state = {
        x: 0,
        speed: 0,
        nitro: 100,
        distance: 0,
        mode: "car",
        left: false,
        right: false,
        accelerate: false,
        boosting: false,
        gameOver: false,
        last: performance.now(),
      };

      gameRef.current = {
        state,
        steer: (direction) => {
          state.x += direction * 1.1;
          state.x = Math.max(-4.5, Math.min(4.5, state.x));
        },
        setInput: (name, value) => {
          state[name] = value;
        },
        setMode: (nextMode) => {
          state.mode = nextMode;
          player.visible = nextMode === "car";
          person.visible = nextMode === "walk";
          setMode(nextMode);
          setMessage(nextMode === "walk" ? "WALK MODE" : "RACE MODE");
        },
        restart: () => {
          state.x = 0;
          state.speed = 0;
          state.distance = 0;
          state.nitro = 100;
          state.gameOver = false;
          state.last = performance.now();
          obstacles.forEach((o, i) => {
            o.hit = false;
            o.group.visible = true;
            o.group.position.z = -25 - i * 19;
          });
          setMessage("RACE RESUMED");
        },
      };

      camera.position.set(0, 5.2, 11);
      camera.lookAt(0, 1, -12);

      const clock = new THREE.Clock();

      function animate() {
        if (cleanup) return;
        frame = requestAnimationFrame(animate);

        const dt = Math.min(clock.getDelta(), 0.05);

        if (!state.gameOver) {
          if (state.accelerate) {
            state.speed = Math.min(state.speed + dt * 30, 150);
          } else {
            state.speed = Math.max(0, state.speed - dt * 12);
          }

          if (state.boosting && state.nitro > 0) {
            state.speed = Math.min(state.speed + dt * 70, 240);
            state.nitro = Math.max(0, state.nitro - dt * 30);
          } else {
            state.nitro = Math.min(100, state.nitro + dt * 8);
          }

          const movement = state.speed * dt * 0.1;

          if (state.left) state.x -= dt * 5;
          if (state.right) state.x += dt * 5;
          state.x = Math.max(-4.7, Math.min(4.7, state.x));

          if (state.mode === "car") {
            player.position.x += (state.x - player.position.x) * Math.min(1, dt * 8);
            player.rotation.z = -state.x * 0.035;
            wheels.forEach((wheel) => {
              wheel.rotation.x += movement;
            });
          } else {
            person.position.x += (state.x - person.position.x) * Math.min(1, dt * 8);
            person.position.z = 4;
            const stride = Math.sin(performance.now() * 0.012) * 0.5;
            legs[0].rotation.x = stride;
            legs[1].rotation.x = -stride;
            arms[0].rotation.x = -stride;
            arms[1].rotation.x = stride;
          }

          state.distance += movement;

          // Move the road markings towards the player
          laneMarks.forEach((mark) => {
            mark.position.z += movement;
            if (mark.position.z > 10) mark.position.z -= 270;
          });

          // Recycle trees to create an endless road
          trees.forEach((tree) => {
            tree.position.z += movement;
            if (tree.position.z > 15) tree.position.z -= 280;
          });

          // Move obstacles toward the player
          obstacles.forEach((obstacle) => {
            if (obstacle.hit) return;

            obstacle.group.position.z += movement;

            if (
              obstacle.group.position.z > 1 &&
              obstacle.group.position.z < 7 &&
              Math.abs(obstacle.group.position.x - state.x) < 1.25
            ) {
              obstacle.hit = true;
              obstacle.group.visible = false;
              state.speed *= 0.25;
              setMessage("CRASH! SPEED REDUCED");
            }

            if (obstacle.group.position.z > 12) {
              obstacle.group.position.z -= 12 * 19;
              obstacle.group.position.x = [-4, 0, 4][Math.floor(Math.random() * 3)];
              obstacle.hit = false;
              obstacle.group.visible = true;
            }
          });

          rivals.forEach((rival) => {
            rival.position.z += movement * 0.8;
            if (rival.position.z > 12) rival.position.z = -150;
          });

          camera.position.x += ((state.mode === "walk" ? state.x : state.x * 0.3) - camera.position.x) * dt * 2;
          camera.position.y = state.mode === "walk" ? 3.2 : 5.2;
          camera.position.z = state.mode === "walk" ? 8 : 11;
          camera.lookAt(state.x * 0.5, 1, -12);
        }

        setSpeed(Math.round(state.speed));
        setNitro(Math.round(state.nitro));
        setDistance(Math.floor(state.distance));

        renderer.render(scene, camera);
      }

      animate();
      setReady(true);

      function resize() {
        if (!mountRef.current || !renderer) return;
        camera.aspect = mountRef.current.clientWidth /
          Math.max(mountRef.current.clientHeight, 1);
        camera.updateProjectionMatrix();
        renderer.setSize(
          mountRef.current.clientWidth,
          mountRef.current.clientHeight
        );
      }

      window.addEventListener("resize", resize);

      disposeGame = () => {
        window.removeEventListener("resize", resize);
        cancelAnimationFrame(frame);
        renderer.dispose();
        scene.traverse((obj) => {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
            else obj.material.dispose();
          }
        });
      };
    }

    // Load Three.js from a CDN without adding a package dependency.
    threeScript = document.createElement("script");
    threeScript.src = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
    threeScript.onload = () => {
      if (!cleanup) startGame(window.THREE);
    };
    threeScript.onerror = () => {
      setMessage("3D engine could not load. Check your internet connection.");
    };
    document.head.appendChild(threeScript);

    return () => {
      cleanup = true;
      disposeGame();
      if (threeScript && threeScript.parentNode) {
        threeScript.parentNode.removeChild(threeScript);
      }
      if (renderer && renderer.domElement?.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, []);

  useEffect(() => {
    function down(e) {
      const g = gameRef.current;
      if (!g) return;

      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(e.key)) {
        e.preventDefault();
      }

      if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") g.setInput("left", true);
      if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") g.setInput("right", true);
      if (e.key === "ArrowUp" || e.key.toLowerCase() === "w") g.setInput("accelerate", true);
      if (e.key === "Shift" || e.key.toLowerCase() === "n") g.setInput("boosting", true);
    }

    function up(e) {
      const g = gameRef.current;
      if (!g) return;
      if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") g.setInput("left", false);
      if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") g.setInput("right", false);
      if (e.key === "ArrowUp" || e.key.toLowerCase() === "w") g.setInput("accelerate", false);
      if (e.key === "Shift" || e.key.toLowerCase() === "n") g.setInput("boosting", false);
    }

    window.addEventListener("keydown", down, { passive: false });
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  const hold = (input, value) => gameRef.current?.setInput(input, value);

  const btn = {
    background: "#ff304f",
    color: "white",
    border: "1px solid #ff7d8e",
    borderRadius: 12,
    padding: "15px 18px",
    fontWeight: 800,
    cursor: "pointer",
    touchAction: "none",
    userSelect: "none",
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#080b12",
      color: "white",
      padding: 12,
      fontFamily: "Arial, sans-serif",
    }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <h1 style={{ color: "#ff4057", margin: "8px 0" }}>STREET RUSH X</h1>

        <div style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          gap: 10,
          marginBottom: 10,
          background: "#151d2d",
          padding: 12,
          borderRadius: 10,
        }}>
          <strong>🏎 SPEED: {speed} km/h</strong>
          <strong>📍 DISTANCE: {distance} m</strong>
          <strong>⚡ NITRO: {nitro}%</strong>
        </div>

        <div
          ref={mountRef}
          style={{
            height: "min(62vh, 520px)",
            minHeight: 300,
            background: "#91c8ed",
            border: "2px solid #37455b",
            borderRadius: 12,
            overflow: "hidden",
          }}
        />

        <p style={{ color: "#ffd166", fontWeight: 700 }}>{ready ? message : "LOADING 3D ENGINE..."}</p>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 8,
          marginTop: 12,
        }}>
          <button
            style={btn}
            onPointerDown={() => hold("left", true)}
            onPointerUp={() => hold("left", false)}
            onPointerLeave={() => hold("left", false)}
            onPointerCancel={() => hold("left", false)}
          >⬅ LEFT</button>

          <button
            style={{ ...btn, background: "#1d9b68" }}
            onPointerDown={() => hold("accelerate", true)}
            onPointerUp={() => hold("accelerate", false)}
            onPointerLeave={() => hold("accelerate", false)}
            onPointerCancel={() => hold("accelerate", false)}
          >⬆ GAS</button>

          <button
            style={btn}
            onPointerDown={() => hold("right", true)}
            onPointerUp={() => hold("right", false)}
            onPointerLeave={() => hold("right", false)}
            onPointerCancel={() => hold("right", false)}
          >RIGHT ➡</button>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 8,
          marginTop: 8,
        }}>
          <button
            style={{ ...btn, background: "#7048df" }}
            onPointerDown={() => hold("boosting", true)}
            onPointerUp={() => hold("boosting", false)}
            onPointerLeave={() => hold("boosting", false)}
            onPointerCancel={() => hold("boosting", false)}
          >⚡ HOLD NITRO</button>

          <button
            style={{ ...btn, background: "#245276" }}
            onClick={() => gameRef.current?.setMode(mode === "car" ? "walk" : "car")}
          >{mode === "car" ? "🚶 WALK MODE" : "🏎 DRIVE MODE"}</button>
        </div>

        <button
          style={{ ...btn, width: "100%", marginTop: 8, background: "#313c50" }}
          onClick={() => {
            gameRef.current?.restart();
            setMessage("RACE RESUMED");
          }}
        >↻ RESTART RACE</button>

        <p style={{ color: "#aeb9cc", fontSize: 13, lineHeight: 1.7 }}>
          Computer: use A/D or ←/→ to steer, W or ↑ to accelerate, and Shift or N for nitro.
          On your phone, press and hold the on-screen controls.
        </p>
      </div>
    </div>
  );
}
