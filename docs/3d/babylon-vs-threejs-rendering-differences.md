# Babylon.js vs Three.js 렌더링 차이 (로직 관점)

동일한 에셋(glTF 모델 + HDR 환경맵)을 Babylon.js와 Three.js로 렌더링하면 **같은 설정이어도 화면이 다르게 나올 수 있다**.  
원인은 단순 설정값이 아니라 **엔진마다 톤매핑·환경광·반사 처리 로직이 다르기 때문**이다.

---

## 예시 화면 (동일 씬, 엔진만 다름)

아래는 같은 Damaged Helmet + Royal Esplanade HDR을 왼쪽은 **Babylon.js**, 오른쪽은 **Three.js**로 렌더링한 비교 예시다.

![Babylon vs Three.js 렌더링 비교 예시](../assets/images/3d/babylon-threejs-rendering-difference.png)

밝기·반사·비저/선 부분 표현 등이 엔진마다 다르게 나오며, **결국 로직이 달라서** 이런 차이가 발생한다.

**sandbox**에는 위와 같은 구성을 그대로 재현한 **예시 프로젝트**가 있다. 그중 Babylon 쪽은 톤매핑·환경강도·반사 스케일 등을 조정해 **Three.js와 최대한 퀄리티가 비슷하게 보이도록** 구현해 두었으니, 동작 차이를 직접 비교해 보면 좋다.

**테스트 환경** (이 문서·sandbox 로딩 타임 비교 기준): GPU NVIDIA GeForce RTX 2080 Ti, CPU 12th Gen Intel Core i5-12400 (2.50 GHz), RAM 16.0 GB (15.8 GB 사용 가능).

---

## 1. 톤 매핑 (Tone Mapping) 로직 차이

| 항목 | Three.js | Babylon.js |
|------|----------|------------|
| 기본 톤매핑 | `ACESFilmicToneMapping` 등 선택 가능 | `TONEMAPPING_STANDARD` / `TONEMAPPING_ACES` / `TONEMAPPING_KHR_NEUTRAL` 등 |
| 적용 위치 | `WebGLRenderer`에서 최종 출력 직전 | Image Processing 설정 또는 별도 포스트프로세스 |
| 곡선/공식 | 엔진 내부 구현체 (ACES 근사식) | 엔진 내부 구현체 (또는 커스텀 셰이더) |

→ **같은 “ACES”라고 해도 수식·적용 순서가 조금만 달라져도 밝기·대비가 달라 보인다.**

---

## 2. 환경광(IBL) / HDR 처리 로직 차이

| 항목 | Three.js | Babylon.js |
|------|----------|------------|
| HDR 맵 사용 | Equirectangular → 환경맵으로 사용, PBR에서 irradiance/reflection 샘플링 | HDR 큐브 텍스처 등으로 변환 후 `scene.environmentTexture` + IBL 파이프라인 |
| 환경 강도 | `envMapIntensity` 등으로 스케일 | `scene.environmentIntensity` + 재질별 `environmentIntensity` |
| 디퓨즈 vs 반사 | IBL에서 디퓨즈(irradiance)와 스펙큘러(반사)를 구분해 사용 | PBR에서 `environmentIntensity`가 디퓨즈·반사 둘 다에 곱해지는 등, 분리 방식이 다름 |

→ **환경맵을 “같이 쓴다”고 해도 샘플링·스케일·분리 방식이 달라서 전체 밝기와 반사감이 달라진다.**

---

## 3. 반사(스펙큘러) / PBR 재질 로직 차이

| 항목 | Three.js | Babylon.js |
|------|----------|------------|
| 반사만 조절 | 재질/환경맵 설정으로 스펙큘러 비율 조절 | `reflectionColor`가 반사·디퓨즈 둘 다에 곱해져 “반사만” 스케일하려면 플러그인/커스텀 필요 |
| roughness/metallic | glTF PBR 스펙 따름 | glTF PBR 스펙 따르나, 내부 셰이더·BRDF 식이 엔진마다 상이 |

→ **같은 metalRoughness 텍스처라도 엔진별 PBR 셰이더·반사 항 처리 방식이 달라서, 특히 비저/금속 부분이 다르게 보일 수 있다.**

---

## 4. 감마·노출·대비 파이프라인 차이

| 항목 | Three.js | Babylon.js |
|------|----------|------------|
| 출력 감마 | `renderer.outputColorSpace` 등으로 sRGB 출력 제어 | Image Processing 또는 포스트프로세스에서 감마·노출·대비 처리 |
| 노출/대비 | 톤매핑 전 노출, 후처리 대비 등 조합 방식이 엔진 고유 | `imageProcessingConfiguration.exposure` / `contrast` 또는 커스텀 포스트프로세스 |

→ **“노출 1.2, 대비 1.1”처럼 같은 숫자를 넣어도, 어느 단계에서 곱해지고 감마가 어떻게 들어가느냐에 따라 최종 픽셀이 달라진다.**

---

## 5. 정리: 왜 같은 씬인데 다르게 보이나

- **설정값만 맞춰도 완전히 동일해지기 어렵다.**  
  톤매핑 공식, IBL 샘플링, PBR 반사/디퓨즈 분리, 감마/노출 적용 순서 등 **로직 자체가 엔진마다 다르기 때문**이다.
- **비슷하게 보이게 하려면**  
  - 톤매핑을 한쪽 엔진에 맞춰 커스텀 셰이더/포스트프로세스로 구현하거나  
  - 환경 강도·반사 스케일·노출/대비를 조합해 실험적으로 맞추는 방식이 필요하다.
- **결국 “로직이 달라서”** 같은 glTF + HDR이라도 Babylon.js와 Three.js에서 느낌이 다르게 나오는 것이 자연스러운 결과다.

---

## 6. 로딩 타임(사용자가 화면을 보기까지) 관점 비교

목표가 **로딩 타임**, 즉 사용자가 화면을 보기까지 걸리는 시간을 최소화하는 것이라면 **Three.js가 구조적으로 더 유리**한 경우가 많다. 다만 엔진 용량만이 아니라 **파일 최적화**와 **초기화 방식**까지 보면, HDR·대용량 에셋을 쓰는 경우 등에서는 선택이 달라질 수 있다.

### 6.1 엔진 자체 무게 (Bundle Size)

초기 로딩 시 JS 다운로드·파싱 시간에서 차이가 난다.

| 엔진 | 특성 |
|------|------|
| **Three.js** | 핵심 라이브러리가 압축 전 약 600KB~1MB 내외. **Tree Shaking**이 잘 되어 있어 필요한 기능만 쓰면 압축 후 **150~200KB** 수준까지 줄이기 쉬움. |
| **Babylon.js** | “모든 기능을 갖춘” 구조라 기본 용량이 크다. 전체를 불러오면 **3MB~5MB** 이상. `@babylonjs/core` 등 모듈화는 되었지만 Three.js만큼 가볍게 잘라내기는 구조적으로 어렵다. |

→ **JS 번들 크기만 보면 Three.js가 유리**하다.

### 6.2 초기화 및 셰이더 컴파일 속도

엔진 파일을 받은 뒤, GPU가 첫 프레임을 그리기까지 걸리는 시간이다.

| 엔진 | 특성 |
|------|------|
| **Three.js** | 렌더링 파이프라인이 단순하고 셰이더가 가벼운 편이라, **엔진 기동 후 첫 프레임까지 매우 빠르다**. |
| **Babylon.js** | 물리 엔진·GUI·다양한 셰이더 라이브러리 등 **초기 오버헤드**가 있다. 빈 화면 하나만 띄워도 Three.js보다 **0.몇 초 정도 더 걸리는** 경우가 있다. |

→ **첫 프레임까지의 체감 속도는 Three.js가 유리**한 경우가 많다.

### 6.3 HDR 및 에셋 로딩 최적화 (실질 대기 시간)

사용자가 가장 길게 느끼는 지연은 보통 **HDR 파일**과 **3D 모델(.glb)** 다운로드·처리 시간이다. 여기서는 Babylon.js 쪽 도구가 강점을 보인다.

| 항목 | Three.js | Babylon.js |
|------|----------|------------|
| HDR 사용 | 주로 `.hdr`·`.exr`을 그대로 쓰거나, 런타임에 **PMREMGenerator**로 변환. 이 과정이 저사양·모바일에서 로딩 바를 오래 멈추게 하는 원인이 되기도 한다. | **`.env`** 라는 전용 포맷 지원. HDR을 미리 계산·압축해 두면 **전송량·GPU 준비 시간**을 크게 줄일 수 있다. (예: 10MB HDR → 1MB 미만 .env) |
| 에셋 최적화 | Draco 압축 등 **외부 도구**에 의존. | `.env` 외에도 **점진적 로딩(.incremental)** 등 자체 포맷·도구를 제공. |

→ **HDR·대용량 에셋을 적극 쓰고, 미리 빌드 타임에 최적화할 수 있다면 Babylon.js의 .env 등이 실질 로딩 타임을 줄이는 데 유리**할 수 있다.

### 6.4 로딩 타임 최적화 비교표

| 비교 항목 | Three.js | Babylon.js | 유리한 쪽 |
|-----------|----------|------------|-----------|
| JS 파일 용량 | 매우 가벼움 (Tree Shaking) | 무거움 (기능 다수 포함) | Three.js |
| 엔진 초기화·첫 프레임 | 매우 빠름 | 보통 (내부 준비 과정 존재) | Three.js |
| 에셋 최적화 도구 | 외부 도구 의존 (Draco 등) | 자체 전용 포맷(.env, .incremental) | Babylon.js |
| 가벼운 웹·모바일 페이지 | 가벼운 번들·빠른 기동에 유리 | 무거운 앱·풀 3D 환경에 유리 | Three.js (가벼운 웹 기준) |

정리하면, **“화면 보기까지 시간”만 최소화하려면** JS 용량과 첫 프레임 속도 면에서 **Three.js가 유리**한 경우가 많고, **HDR·대용량 씬을 미리 .env 등으로 최적화할 수 있는 파이프라인**이 있다면 Babylon.js 선택 시 실질 로딩 타임을 줄이는 데 도움이 될 수 있다.

### 6.5 "Babylon을 Three.js처럼 맞추면" 로딩이 더 오래 걸리는 이유

이 문서의 **sandbox 예시**에서는 Babylon 쪽을 톤매핑·IBL·반사 스케일·포스트프로세스 등으로 **Three.js와 최대한 비슷하게 보이도록** 맞춰 두었다. 그 결과, **같은 glTF + HDR 씬**에서도 로딩 타임이 예를 들어 **Babylon 8초대 vs Three.js 2~3초대**처럼 차이가 크게 나는 경우가 있다.

- **왜 Babylon이 더 오래 걸리나**  
  Three.js와 **동일한 퀄리티/느낌**을 내려면 Babylon 기본 파이프라인만으로는 부족해, **Image Processing 설정, ACES 톤매핑, 반사만 스케일하는 MaterialPlugin, Sharpen 포스트프로세스** 등 추가 초기화와 셰이더 컴파일이 들어간다. 즉 **"엔진 기본값" 비교가 아니라 "Three.js와 비슷하게 보이게 만드는 비용"**이 Babylon 쪽에 더 붙은 것이다.

- **그럼 Three.js가 더 좋은 건가**  
  **퀄리티는 비슷한데 로딩만 더 빠르다**면, 그 기준에서는 **Three.js가 더 좋다고 보는 것이 맞다**. 같은 퀄리티를 보여줄 때 로딩 타임이 짧다는 것은, 사용자 경험·번들·초기화 비용 면에서 **그 목표(동일 퀄리티 + 빠른 화면 도달)에 Three.js가 더 잘 맞는다**는 뜻이다.  
  이 문서 sandbox처럼 **동일한 glTF + HDR 퀄리티**를 전제로 하면, Three.js는 기본 설정에 가깝게 도달하고 Babylon은 추가 튜닝·플러그인·포스트프로세스가 들어가 로딩이 길어지므로, **“같은 퀄을 더 빨리 보여주고 싶다”**는 요구에는 Three.js 선택이 합리적이다.  
  다만 **“모든 용도에서 Three.js가 무조건 더 좋다”**는 말은 아니다.  
  - **같은 퀄리티 + 로딩 최소화**를 우선하면 → Three.js가 유리하다.  
  - **.env, 물리, VR, 풀 3D 에디터/툴링** 등 Babylon이 강한 기능을 쓸 계획이면 → Babylon이 맞는 선택이 된다.

요약하면, **같은 퀄리티를 더 빠르게 보여줄 때 Three.js가 유리하다면 그 기준에서는 Three.js가 더 좋다고 보면 되고**, “동일 퀄리티”라는 목표를 Three.js는 기본에 가깝게, Babylon은 추가 작업으로 달성한다는 점만 구분해 두면 된다.

---

## 7. Babylon.js vs Three.js 장단점 (구체 비교)

### 7.1 Three.js — 구체적 장단점

**장점 (구체)**

- **번들**  
  `three` 코어만 넣고 `OrbitControls`, `GLTFLoader`, `RGBELoader` 등은 `three/addons/...`에서 필요한 것만 import하면 된다. 번들러가 사용하지 않은 export를 제거해 **압축 후 150~250KB** 수준까지 줄이기 쉽다. glTF만 보여주는 최소 예제는 코어 + 로더 몇 개면 된다.
- **첫 프레임·로딩**  
  `WebGLRenderer` 생성 → `scene`·`camera`·`light` → `renderer.render()` 한 번이면 화면이 나온다. 셰이더는 재질별로 필요할 때 컴파일되며, **ACES 톤매핑·Equirectangular 환경맵**은 설정만으로 바로 쓸 수 있어, “같은 퀄리티” 목표일 때 추가 플러그인 없이 로딩이 짧게 나오는 편이다.
- **HDR 사용 방식**  
  `RGBELoader`로 `.hdr` 파일을 읽고, `EquirectangularReflectionMapping` + `PMREMGenerator`로 런타임에 cubemap·mipmap을 만든다. 2k HDR이면 보통 **몇 MB 다운로드 + CPU/GPU에서 변환**이 한 번 일어난다. 코드는 단순하지만, 4k·다수 환경맵은 용량·변환 시간이 커질 수 있다.
- **커뮤니티**  
  공식 예제(`webgl_loader_gltf` 등), 스택오버플로·GitHub 이슈·블로그 글이 많아 **“three.js gltf hdr”** 같은 키워드로 검색하면 예제·해결책을 찾기 쉽다.

**단점 (구체)**

- **물리**  
  물리 엔진이 없어 **Cannon.js / Rapier / Ammo.js** 등을 직접 붙여야 한다. RigidBody·충돌 그룹·트리거를 직접 관리하고, 물리 월드의 위치/회전을 `Object3D.position`·`quaternion`에 매 프레임 동기화하는 코드를 작성해야 한다.
- **HDR 대량·저사양**  
  `.hdr`을 그대로 쓰므로 **파일 크기·PMREM 생성 비용**이 그대로 온다. 환경맵을 여러 개 쓰거나 모바일에서 4k HDR을 쓰면, 다운로드·파싱·GPU 업로드 시간이 눈에 띄게 늘어난다. 미리 cubemap으로 구워 두는 파이프라인은 직접 만들거나 외부 도구에 의존해야 한다.
- **디버깅 UI**  
  씬·재질·조명을 **실시간으로 보면서 수정하는 공식 인스펙터**는 없다. `lil-gui`·`dat.GUI` 등으로 직접 슬라이더를 붙이거나, 예제에서 쓰는 방식을 참고해야 한다.
- **VR/WebGPU**  
  WebXR은 `three/addons/webxr.js`로 제공되지만, 세션 생성·입력·레이어 바인딩 등은 직접 연결해야 한다. WebGPU 렌더러는 실험 단계라, 프로덕션에서 쓰려면 버전·API 변경을 감수해야 한다.

---

### 7.2 Babylon.js — 구체적 장단점

**장점 (구체)**

- **물리**  
  `@babylonjs/core`에 **Cannon.js 기반 플러그인**이 포함된다. `scene.enablePhysics()` 후 `Impostor`(Box/Sphere/Mesh)를 메시에 붙이고, `setLinearVelocity`·`applyImpulse` 등으로 움직이면 된다. 물리 월드와 씬 그래프가 엔진 안에서 맞춰져 있어, **별도 라이브러리 추가·위치 동기화 루프**를 안 써도 된다. (Ammo.js 플러그인으로 교체 가능.)
- **HDR·환경맵**  
  **`.env`** 포맷을 쓸 수 있다. HDR을 미리 equirectangular → cubemap + 필터링해 두고 압축한 파일이라, **같은 해상도 대비 .hdr보다 용량이 작고**, 로드 후 곧바로 `CubeTexture`로 쓸 수 있어 **런타임 PMREM 단계가 없다**. `EnvironmentTextureTools`로 빌드 타임에 .env를 만들 수 있다.
- **점진적 로딩**  
  **`.incremental`** 파일로 씬을 쪼개 두고, `SceneLoader.Append()`로 필요한 부분만 순차 로드할 수 있다. 큰 씬을 “한 번에 한 glb”가 아니라 **LOD·영역별로 나눠 받는** 워크플로를 공식 지원한다. Three.js에서는 이런 방식을 직접 설계하거나 외부 스크립트로 구현해야 한다.
- **인스펙터**  
  `scene.debugLayer.show()` 한 줄로 **공식 인스펙터**를 띄울 수 있다. 노드 트리, 재질·텍스처·조명·카메라를 선택해서 속성을 바꾸면 화면에 바로 반영된다. 프로토타이핑·디버깅 시 재질 이름·숫자를 코드에서 찾지 않고 UI로 확인할 수 있다.
- **VR/WebXR·WebGPU**  
  WebXR 경험(입력·레이어·컨트롤러)이 **엔진 API와 연결**되어 있고, WebGPU 엔진 옵션으로 렌더러를 바꿀 수 있다. 실험 단계 구간은 있지만, “VR 버튼 하나로 진입” 같은 플로우는 문서·예제가 있다.
- **사운드·입력**  
  `Sound`·`PositionalSound`가 코어에 있어, **공간 음향**을 별도 라이브러리 없이 붙일 수 있다. 키보드·게임패드 입력은 `ActionManager`·`InputManager`로 처리할 수 있다.

**단점 (구체)**

- **번들 크기**  
  `@babylonjs/core` + `@babylonjs/loaders`만 해도 **압축 후 500KB~1MB 이상** 나오는 경우가 많다. 물리·GUI·인스펙터까지 쓰면 더 커진다. “glTF 하나만 보여주는 랜딩용 3D”처럼 **최소 기능만** 필요할 때는 Three.js보다 무겁다.
- **동일 퀄리티 맞출 때 비용**  
  Three.js와 비슷한 톤·반사감을 내려면 **Image Processing(ACES 톤매핑)·반사만 스케일하는 MaterialPlugin·Sharpen 포스트프로세스** 등을 넣게 되고, 그만큼 **초기화·셰이더 컴파일**이 늘어나 로딩 타임이 길어질 수 있다**(이 문서 sandbox에서 8초대 vs 2~3초대 차이)**.
- **학습 자료**  
  Three.js만큼 “glTF + HDR 한 화면” 같은 **단순 예제·블로그**가 상대적으로 적고, 공식 문서·Playground 위주로 보게 되는 경우가 많다.

---

### 7.3 Babylon.js가 Three.js보다 나은 점 — 기능별로 보면

| 항목 | Three.js (구체) | Babylon.js (구체) |
|------|------------------|-------------------|
| **HDR 환경맵** | `RGBELoader` + `.hdr` → 런타임에 `PMREMGenerator`로 cubemap 생성. 2k/4k 파일 그대로 전송·변환. | `.env` 사용 시 미리 구운 cubemap 전송, 런타임 변환 없음. `EnvironmentTextureTools`로 제작. |
| **물리** | Cannon/Rapier 등 **외부 라이브러리** 연동, RigidBody ↔ `Object3D` 위치·회전 **직접 동기화** 필요. | **내장 물리 플러그인**(Cannon 기반). `Impostor` 붙이면 씬과 자동 연동. |
| **큰 씬 로딩** | 한 번에 한 glb/gltf 로드하는 방식이 기본. LOD·순차 로드는 **직접 설계**하거나 스크립트로 구현. | **`.incremental`** + `SceneLoader.Append()`로 **공식 지원**. 씬을 나눠 순차 로드. |
| **디버깅 UI** | 공식 인스펙터 없음. `lil-gui` 등으로 **직접 슬라이더·트리** 구현. | **`scene.debugLayer.show()`** 로 노드·재질·조명 실시간 편집. |
| **VR/WebXR** | `three/addons/webxr.js`로 기능 제공, **세션·레이어·입력** 연결은 직접 코드 작성. | 엔진에 **WebXR 경험** 통합, 문서·예제 있음. |
| **사운드** | **별도 라이브러리**(Howler 등) 또는 Web Audio 직접 사용. | **`Sound`·`PositionalSound`** 코어 포함. |
| **번들·첫 화면** | 필요한 addon만 import 시 **150~250KB** 수준 가능. 첫 프레임까지 짧음. | 코어+로더만 해도 **500KB~1MB+**. 동일 퀄 맞추면 초기화 더 길어질 수 있음. |

**한 줄 요약**  
- **Three.js**: **로딩 타임 최소화**·가벼운 번들·**작은 규모** 프로젝트(랜딩용 3D, 단일 모델 뷰어 등)에 유리하다.  
- **Babylon.js**: **높은 퀄리티와 안정적인 프레임**을 유지해야 하는, **큰 규모·풀 3D**(게임, 에디터, 복잡한 씬·물리·VR 등)에 유리하다. 로딩을 “빨리”보다는 **.env·점진적 로딩으로 큰 씬을 다루는 것**이 강점이다.

즉 **로딩 최소화·작은 규모 → Three.js**, **고퀄리티·안정 프레임·큰 규모 → Babylon.js**라고 보면 된다.
