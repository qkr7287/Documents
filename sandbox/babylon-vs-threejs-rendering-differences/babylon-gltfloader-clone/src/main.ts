import "@babylonjs/loaders/glTF";
import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";

import {
  ArcRotateCamera,
  Color3,
  Color4,
  Effect,
  Engine,
  HemisphericLight,
  PostProcess,
  Scene,
  SceneLoader,
  SharpenPostProcess,
  Vector3,
} from "@babylonjs/core";
import type { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial";
import { MaterialPluginBase } from "@babylonjs/core/Materials/materialPluginBase";
import type { UniformBuffer } from "@babylonjs/core/Materials/uniformBuffer";
import { HDRCubeTexture } from "@babylonjs/core/Materials/Textures/hdrCubeTexture";
import { ImageProcessingConfiguration } from "@babylonjs/core/Materials/imageProcessingConfiguration";
import type { AbstractEngine } from "@babylonjs/core/Engines/abstractEngine";
import type { SubMesh } from "@babylonjs/core/Meshes/subMesh";
import type { MaterialDefines } from "@babylonjs/core/Materials/materialDefines";

// PostProcess에서 사용할 노출/대비 값을 전역으로 두고,
// 아래 DOM 슬라이더 UI로 값만 갱신해서 매 프레임 적용합니다.
let uiExposure = 0.8;
let uiContrast = 1.12;
/** 환경맵(IBL) 강도. 1.0=기본, 올리면 HDR 반사 더 쨍하게 */
let uiEnvironmentIntensity = 0.7;
/** 반사광(스펙큘러)만 조절. 0=반사 없음, 1=기본. MaterialPlugin으로 radiance만 스케일. */
let uiReflectionIntensity = 0.45;
/** 슬라이더에서 재질 반사 갱신용 씬 참조 */
let currentScene: Scene | null = null;
/** Image Processing on/off (UI 토글). true=Babylon 내장, false=커스텀 ACES만 */
let uiImageProcessingEnabled = true;
/** 톤 매핑 사용 (Image Processing 켜져 있을 때). ACES 타입으로 고정 */
let uiToneMappingEnabled = true;
/** Image Processing 노출 (1.2 등). IP 켜져 있을 때 적용 */
let uiIPExposure = 1.26;
/** Image Processing 대비 (1.5 등). IP 켜져 있을 때 적용 */
let uiIPContrast = 0.96;
/** Sharpen 포스트 프로세스 강도 (edgeAmount). 0=끔, 기본 0.3 */
let uiSharpenAmount = 0.43;

/** 반사(environmentRadiance)만 스케일하는 플러그인. 디퓨즈는 건드리지 않아서 0이어도 화면 안 까맣게 됨. */
class ReflectionOnlyPlugin extends MaterialPluginBase {
  constructor(
    material: import("@babylonjs/core/Materials/material").Material,
    getScale: () => number,
  ) {
    super(material, "ReflectionOnly", 200, undefined, true, true);
    this._getScale = getScale;
  }
  private _getScale: () => number;
  getUniforms() {
    return {
      ubo: [{ name: "uReflectionOnlyScale", size: 1, type: "float" }],
    };
  }
  bindForSubMesh(
    uniformBuffer: UniformBuffer,
    _scene: Scene,
    _engine: AbstractEngine,
    _subMesh: SubMesh,
  ) {
    uniformBuffer.updateFloat("uReflectionOnlyScale", this._getScale());
  }
  getCustomCode(
    shaderType: string,
    shaderLanguage?: import("@babylonjs/core/Materials/shaderLanguage").ShaderLanguage,
  ) {
    if (shaderType !== "fragment") return null;
    // CUSTOM_FRAGMENT_BEFORE_FINALCOLORCOMPOSITION 훅에 반사항만 스케일 (정규식 대신 훅 사용으로 안정)
    const isWGSL = shaderLanguage === 1; // ShaderLanguage.WGSL
    const scaleLine = isWGSL
      ? "finalRadianceScaled*=uReflectionOnlyScale;"
      : "finalRadianceScaled*=uReflectionOnlyScale;";
    return {
      CUSTOM_FRAGMENT_BEFORE_FINALCOLORCOMPOSITION: `#ifdef REFLECTION
${scaleLine}
#endif
`,
    };
  }
}

const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement | null;
if (!canvas) {
  throw new Error("Canvas element #renderCanvas not found");
}

// three.js 예제는 보통 renderer.setPixelRatio(window.devicePixelRatio)를 켜서 더 선명하게 보입니다.
// Babylon도 동일하게 하려면 adaptToDeviceRatio를 true로 켭니다. (선명도↑ / GPU 부담↑)
const engine = new Engine(canvas, true, undefined, true);

async function createScene() {
  const scene = new Scene(engine);
  currentScene = scene;
  scene.clearColor = new Color4(0, 0, 0, 1);

  // Camera: three.js OrbitControls 느낌 (rotate/zoom)
  const camera = new ArcRotateCamera(
    "camera",
    Math.PI / 2,
    Math.PI / 2.35,
    4.0,
    new Vector3(0, 1, 0),
    scene,
  );
  // Babylon은 activeCamera가 설정되어야 화면에 렌더링됩니다.
  scene.activeCamera = camera;
  camera.attachControl(canvas, true);
  camera.wheelDeltaPercentage = 0.01;
  // three.js 예제 카메라(FOV=45deg)에 최대한 맞춤
  camera.fov = (45 * Math.PI) / 180;

  // A little fill light (IBL이 메인이고, 이 라이트는 보조)
  const hemi = new HemisphericLight("hemi", new Vector3(0, 1, 0), scene);
  // three.js 예제는 환경광(IBL)이 메인이라, 추가 라이트 영향이 적게(거의 0에 가깝게) 둡니다.
  hemi.intensity = 0.0;
  hemi.groundColor = new Color3(0.05, 0.05, 0.05);

  // Environment (HDR IBL)
  const hdrUrl = "/env/royal_esplanade_2k.hdr";
  const envSize = 2048; // 원본이 2k라서 2048로 맞춰 선명도 우선
  const hdrTexture = new HDRCubeTexture(hdrUrl, scene, envSize);
  scene.environmentTexture = hdrTexture;
  // Three.js / Sketchfab처럼 "전체가 반사"가 아니라, 거울/금속만 반사되게 하려면 환경 강도를 낮춤.
  // 값이 높을수록 모든 면이 반사되어 비현실적, 낮추면 거칠기/금속도에 따라 반사만 적절히 남음.
  scene.environmentIntensity = uiEnvironmentIntensity;
  // 마지막 값(blurLevel)이 0보다 크면 배경이 뿌옇게(블러) 보입니다.
  // 배경을 선명하게 보이게 하려면 0으로 두세요.
  scene.createDefaultSkybox(hdrTexture, true, 1000, 0);

  // Image processing / tone mapping (UI에서 전부 조절 가능)
  const ip = scene.imageProcessingConfiguration;
  ip.isEnabled = uiImageProcessingEnabled;
  ip.toneMappingEnabled = uiToneMappingEnabled;
  ip.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES;
  ip.exposure = uiIPExposure;
  ip.contrast = uiIPContrast;

  // three.js ACESFilmicToneMapping(근사)을 Babylon에 직접 구현
  // 참고: https://threejs.org/examples/webgl_loader_gltf.html (renderer.toneMapping = ACESFilmicToneMapping)
  Effect.ShadersStore["acesFilmicFragmentShader"] = `
    precision highp float;
    varying vec2 vUV;
    uniform sampler2D textureSampler;
    uniform float exposure;
    uniform float contrast;

    vec3 ACESFilmicToneMapping( vec3 color ) {
      color = max(vec3(0.0), color);
      return (color * (2.51 * color + 0.03)) / (color * (2.43 * color + 0.59) + 0.14);
    }

    vec3 LinearToSRGB(vec3 c) {
      return pow(c, vec3(1.0 / 2.2));
    }

    void main(void) {
      vec3 color = texture2D(textureSampler, vUV).rgb;
      color *= exposure;
      color = ACESFilmicToneMapping(color);
      color = clamp(color, 0.0, 1.0);
      color = (color - 0.5) * contrast + 0.5;
      color = clamp(color, 0.0, 1.0);
      color = LinearToSRGB(color);
      gl_FragColor = vec4(color, 1.0);
    }
  `;

  const aces = new PostProcess(
    "acesFilmic",
    "acesFilmic",
    ["exposure", "contrast"],
    null,
    1.0,
    camera,
  );
  aces.onApply = (effect) => {
    effect.setFloat("exposure", uiExposure);
    effect.setFloat("contrast", uiContrast);
  };

  const sharpen = new SharpenPostProcess(
    "sharpen",
    1,
    camera,
    undefined,
    engine,
    false,
    0,
    false,
  );
  sharpen.edgeAmount = uiSharpenAmount;
  sharpen.colorAmount = 1;
  // camera는 생성자에 넘겨서 이미 attach됨 (ACES 다음에 실행)

  // --- 간단한 UI(HTML 슬라이더)로 노출/대비 조절 ---
  const exposureSlider = document.getElementById("exposureSlider") as HTMLInputElement | null;
  const exposureValue = document.getElementById("exposureValue") as HTMLSpanElement | null;
  const contrastSlider = document.getElementById("contrastSlider") as HTMLInputElement | null;
  const contrastValue = document.getElementById("contrastValue") as HTMLSpanElement | null;

  if (exposureSlider) {
    exposureSlider.value = uiExposure.toString();
    if (exposureValue) exposureValue.textContent = uiExposure.toFixed(2);
    exposureSlider.addEventListener("input", () => {
      uiExposure = parseFloat(exposureSlider.value);
      if (Number.isNaN(uiExposure)) uiExposure = 0.5;
      if (exposureValue) exposureValue.textContent = uiExposure.toFixed(2);
    });
  }

  if (contrastSlider) {
    contrastSlider.value = uiContrast.toString();
    if (contrastValue) contrastValue.textContent = uiContrast.toFixed(2);
    contrastSlider.addEventListener("input", () => {
      uiContrast = parseFloat(contrastSlider.value);
      if (Number.isNaN(uiContrast)) uiContrast = 1.3;
      if (contrastValue) contrastValue.textContent = uiContrast.toFixed(2);
    });
  }

  const envIntensitySlider = document.getElementById("envIntensitySlider") as HTMLInputElement | null;
  const envIntensityValue = document.getElementById("envIntensityValue") as HTMLSpanElement | null;
  if (envIntensitySlider) {
    envIntensitySlider.value = uiEnvironmentIntensity.toString();
    if (envIntensityValue) envIntensityValue.textContent = uiEnvironmentIntensity.toFixed(2);
    envIntensitySlider.addEventListener("input", () => {
      uiEnvironmentIntensity = parseFloat(envIntensitySlider.value);
      if (Number.isNaN(uiEnvironmentIntensity)) uiEnvironmentIntensity = 0.7;
      scene.environmentIntensity = uiEnvironmentIntensity;
      if (envIntensityValue) envIntensityValue.textContent = uiEnvironmentIntensity.toFixed(2);
    });
  }

  const reflectionSlider = document.getElementById("reflectionSlider") as HTMLInputElement | null;
  const reflectionValue = document.getElementById("reflectionValue") as HTMLSpanElement | null;
  if (reflectionSlider) {
    reflectionSlider.value = uiReflectionIntensity.toString();
    if (reflectionValue) reflectionValue.textContent = uiReflectionIntensity.toFixed(2);
    reflectionSlider.addEventListener("input", () => {
      uiReflectionIntensity = parseFloat(reflectionSlider.value);
      if (Number.isNaN(uiReflectionIntensity)) uiReflectionIntensity = 0.42;
      if (reflectionValue) reflectionValue.textContent = uiReflectionIntensity.toFixed(2);
    });
  }

  const imageProcessingCheckbox = document.getElementById("imageProcessingToggle") as HTMLInputElement | null;
  if (imageProcessingCheckbox) {
    imageProcessingCheckbox.checked = uiImageProcessingEnabled;
    imageProcessingCheckbox.addEventListener("change", () => {
      uiImageProcessingEnabled = imageProcessingCheckbox.checked;
      if (currentScene) currentScene.imageProcessingConfiguration.isEnabled = uiImageProcessingEnabled;
    });
  }

  const toneMappingCheckbox = document.getElementById("toneMappingToggle") as HTMLInputElement | null;
  if (toneMappingCheckbox) {
    toneMappingCheckbox.checked = uiToneMappingEnabled;
    toneMappingCheckbox.addEventListener("change", () => {
      uiToneMappingEnabled = toneMappingCheckbox.checked;
      if (currentScene) {
        const c = currentScene.imageProcessingConfiguration;
        c.toneMappingEnabled = uiToneMappingEnabled;
        c.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES;
      }
    });
  }

  const ipExposureSlider = document.getElementById("ipExposureSlider") as HTMLInputElement | null;
  const ipExposureValue = document.getElementById("ipExposureValue") as HTMLSpanElement | null;
  if (ipExposureSlider) {
    ipExposureSlider.value = uiIPExposure.toString();
    if (ipExposureValue) ipExposureValue.textContent = uiIPExposure.toFixed(2);
    ipExposureSlider.addEventListener("input", () => {
      uiIPExposure = parseFloat(ipExposureSlider.value);
      if (Number.isNaN(uiIPExposure)) uiIPExposure = 1;
      if (currentScene) currentScene.imageProcessingConfiguration.exposure = uiIPExposure;
      if (ipExposureValue) ipExposureValue.textContent = uiIPExposure.toFixed(2);
    });
  }

  const ipContrastSlider = document.getElementById("ipContrastSlider") as HTMLInputElement | null;
  const ipContrastValue = document.getElementById("ipContrastValue") as HTMLSpanElement | null;
  if (ipContrastSlider) {
    ipContrastSlider.value = uiIPContrast.toString();
    if (ipContrastValue) ipContrastValue.textContent = uiIPContrast.toFixed(2);
    ipContrastSlider.addEventListener("input", () => {
      uiIPContrast = parseFloat(ipContrastSlider.value);
      if (Number.isNaN(uiIPContrast)) uiIPContrast = 1;
      if (currentScene) currentScene.imageProcessingConfiguration.contrast = uiIPContrast;
      if (ipContrastValue) ipContrastValue.textContent = uiIPContrast.toFixed(2);
    });
  }

  const sharpenSlider = document.getElementById("sharpenSlider") as HTMLInputElement | null;
  const sharpenValue = document.getElementById("sharpenValue") as HTMLSpanElement | null;
  if (sharpenSlider) {
    sharpenSlider.value = uiSharpenAmount.toString();
    if (sharpenValue) sharpenValue.textContent = uiSharpenAmount.toFixed(2);
    sharpenSlider.addEventListener("input", () => {
      uiSharpenAmount = parseFloat(sharpenSlider.value);
      if (Number.isNaN(uiSharpenAmount)) uiSharpenAmount = 0;
      sharpen.edgeAmount = uiSharpenAmount;
      if (sharpenValue) sharpenValue.textContent = uiSharpenAmount.toFixed(2);
    });
  }

  // Load glTF (DamagedHelmet - three.js 예제에서 자주 쓰는 모델)
  // .gltf는 .bin/.png를 추가로 받아야 해서(상대경로/CORS/Content-Type 이슈 등) 텍스처가 누락되면
  // 재질이 "전체가 거울처럼 반사"되는 것처럼 보일 수 있습니다.
  // 그래서 three.js 예제와 비슷하게, Khronos 샘플의 glTF-Binary(.glb) 버전을 사용합니다.
  const glbUrl =
    "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/DamagedHelmet/glTF-Binary/DamagedHelmet.glb";
  const result = await SceneLoader.ImportMeshAsync("", glbUrl, undefined, scene);

  // 디버깅: 텍스처/재질이 정상 로드됐는지 확인 (전체 반사처럼 보일 때 가장 흔한 원인)
  // eslint-disable-next-line no-console
  console.log(
    "[Babylon] materials",
    scene.materials.map((m) => ({ name: m.name, type: m.getClassName?.() })),
  );
  // eslint-disable-next-line no-console
  console.log(
    "[Babylon] textures",
    scene.textures
      .filter((t) => !!t)
      .map((t) => ({ name: t.name, hasUrl: !!(t as any).url })),
  );

  // 반사광만 조절: MaterialPlugin으로 finalRadianceScaled에만 uReflectionOnlyScale 곱함. 디퓨즈/전체 밝기 무변경.
  for (const mat of scene.materials) {
    const pbr = mat as PBRMaterial;
    if (typeof pbr.environmentIntensity !== "number") continue;
    pbr.environmentIntensity = 1;
    if (pbr.reflectionColor) pbr.reflectionColor.set(1, 1, 1);
    new ReflectionOnlyPlugin(pbr, () => uiReflectionIntensity);
  }

  // Center / scale lightly (모델마다 다를 수 있음)
  const root = result.meshes[0];
  // three.js 예제의 fitCameraToSelection 로직과 비슷하게,
  // 모델 바운딩으로 카메라 거리/near/far/min/max zoom을 설정합니다.
  try {
    const { min, max } = root.getHierarchyBoundingVectors(true);
    const size = max.subtract(min);
    const center = min.add(size.scale(0.5));
    const maxSize = Math.max(size.x, size.y, size.z);

    // distance = fitOffset * (maxSize / (2 * tan(fov/2)))
    const fitOffset = 1.3;
    const fitHeightDistance = maxSize / (2 * Math.tan(camera.fov * 0.5));
    const distance = fitOffset * fitHeightDistance;

    camera.setTarget(center);
    camera.radius = distance;

    // three.js 예제와 동일한 비율
    camera.lowerRadiusLimit = distance / 10;
    camera.upperRadiusLimit = distance * 10;

    camera.minZ = distance / 100;
    camera.maxZ = distance * 100;
  } catch {
    // 바운딩 계산 실패 시 기본값 유지
    camera.minZ = 0.1;
    camera.maxZ = 1000;
    camera.lowerRadiusLimit = 0.5;
    camera.upperRadiusLimit = 12;
  }

  root.position = Vector3.Zero();

  return scene;
}

const loadingEl = document.getElementById("loadingOverlay");
const loadStartTime = performance.now();

createScene()
  .then((scene) => {
    if (loadingEl) loadingEl.classList.add("hidden");
    let loadTimeRecorded = false;
    engine.runRenderLoop(() => {
      if (!loadTimeRecorded) {
        loadTimeRecorded = true;
        const elapsed = (performance.now() - loadStartTime) / 1000;
        const el = document.getElementById("loadingTimeDisplay");
        if (el) el.textContent = `${elapsed.toFixed(2)}s`;
      }
      const fpsEl = document.getElementById("fpsDisplay");
      if (fpsEl) fpsEl.textContent = String(Math.round(engine.getFps()));
      scene.render();
    });
  })
  .catch((err) => {
    if (loadingEl) loadingEl.classList.add("hidden");
    // eslint-disable-next-line no-console
    console.error(err);
    alert(String(err));
  });

window.addEventListener("resize", () => {
  engine.resize();
});

