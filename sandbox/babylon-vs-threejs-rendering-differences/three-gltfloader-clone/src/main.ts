import * as THREE from "three";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";

let camera: THREE.PerspectiveCamera;
let scene: THREE.Scene;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;

let currentModel: THREE.Object3D | null = null;
let mixer: THREE.AnimationMixer | null = null;
let currentLoadId = 0;
let loadStartTime = 0;
let initialLoadDone = false;
let frameCount = 0;
let lastFpsTime = 0;

const timer = new THREE.Clock();

init();

function init() {
  loadStartTime = performance.now();

  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.25, 20);
  camera.position.set(-1.8, 0.6, 2.7);

  scene = new THREE.Scene();

  // Match example defaults
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  document.body.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.minDistance = 2;
  controls.maxDistance = 10;
  controls.target.set(0, 0, -0.2);
  controls.update();

  // Load env HDR (local file we already have)
  new RGBELoader()
    .setPath("/env/")
    .load("royal_esplanade_2k.hdr", (texture) => {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      scene.background = texture;
      scene.environment = texture;

      // model list + gui (same spirit as official example)
      fetch("https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/model-index.json")
        .then((r) => r.json())
        .then((models) => {
          const gui = new GUI();
          const modelNames = models.map((m: any) => m.name);
          const params = { model: "DamagedHelmet" };

          if (!modelNames.includes(params.model) && modelNames.length > 0) {
            params.model = modelNames[0];
          }

          gui.add(params, "model", modelNames).onChange((name: string) => {
            const modelInfo = models.find((m: any) => m.name === name);
            loadModel(modelInfo);
          });

          gui.add(scene, "backgroundBlurriness", 0, 1, 0.01);

          const initialModel = models.find((m: any) => m.name === params.model);
          if (initialModel) loadModel(initialModel);
        });
    });

  renderer.setAnimationLoop(render);
  window.addEventListener("resize", onWindowResize);
}

function loadModel(modelInfo: any) {
  const variants = modelInfo.variants;
  const variant = variants["glTF-Binary"] || variants["glTF"];
  const url = `https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/${modelInfo.name}/${variant.endsWith(".glb") ? "glTF-Binary" : "glTF"}/${variant}`;

  if (currentModel) {
    scene.remove(currentModel);
    currentModel = null;
  }

  if (mixer) {
    mixer.stopAllAction();
    mixer = null;
  }

  const loadId = ++currentLoadId;

  const loader = new GLTFLoader();
  loader.load(
    url,
    async (gltf) => {
    if (loadId !== currentLoadId) return;

    currentModel = gltf.scene;

    // Wait until shaders compile (official example uses compileAsync)
    // @ts-expect-error: compileAsync exists on WebGLRenderer in examples setup
    if (typeof (renderer as any).compileAsync === "function") {
      // @ts-expect-error: compileAsync exists
      await (renderer as any).compileAsync(currentModel, camera, scene);
      if (loadId !== currentLoadId) return;
    }

    scene.add(currentModel);
    fitCameraToSelection(camera, controls, currentModel);

    if (gltf.animations.length > 0) {
      mixer = new THREE.AnimationMixer(currentModel);
      for (const animation of gltf.animations) {
        mixer.clipAction(animation).play();
      }
    }

    if (!initialLoadDone) {
      requestAnimationFrame(() => {
        const elapsed = (performance.now() - loadStartTime) / 1000;
        const el = document.getElementById("loadingTimeDisplay");
        if (el) el.textContent = `${elapsed.toFixed(2)}`;
        const overlay = document.getElementById("loadingOverlay");
        if (overlay) overlay.classList.add("hidden");
        initialLoadDone = true;
      });
    }
  },
  undefined,
  (err) => {
    if (!initialLoadDone) {
      const overlay = document.getElementById("loadingOverlay");
      if (overlay) overlay.classList.add("hidden");
      const el = document.getElementById("loadingTimeDisplay");
      if (el) el.textContent = "error";
      initialLoadDone = true;
    }
    console.error(err);
  },
  );
}

function fitCameraToSelection(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  selection: THREE.Object3D,
  fitOffset = 1.3,
) {
  const box = new THREE.Box3().setFromObject(selection);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  const maxSize = Math.max(size.x, size.y, size.z);
  const fitHeightDistance = maxSize / (2 * Math.tan((Math.PI * camera.fov) / 360));
  const distance = fitOffset * fitHeightDistance;

  const direction = controls.target.clone().sub(camera.position).normalize().multiplyScalar(distance);

  controls.maxDistance = distance * 10;
  controls.minDistance = distance / 10;
  controls.target.copy(center);

  camera.near = distance / 100;
  camera.far = distance * 100;
  camera.updateProjectionMatrix();

  camera.position.copy(controls.target).sub(direction);
  controls.update();
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function render() {
  const delta = timer.getDelta();
  controls.update();
  if (mixer) mixer.update(delta);
  renderer.render(scene, camera);

  frameCount++;
  const now = performance.now();
  if (lastFpsTime === 0) lastFpsTime = now;
  if (now - lastFpsTime >= 1000) {
    const fpsEl = document.getElementById("fpsDisplay");
    if (fpsEl) fpsEl.textContent = String(frameCount);
    frameCount = 0;
    lastFpsTime = now;
  }
}

