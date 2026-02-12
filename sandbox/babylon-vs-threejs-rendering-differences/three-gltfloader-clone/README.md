# three.js 예제: `webgl_loader_gltf` 클론

`three.js` 공식 예제([`webgl_loader_gltf.html`](https://github.com/mrdoob/three.js/blob/master/examples/webgl_loader_gltf.html))를 참고해, 같은 구조로 동작하는 **별도 샘플 프로젝트**입니다. (나중에 쉽게 삭제 가능하도록 `sandbox/` 아래에 분리)

## 포함 기능
- `RGBELoader`로 `royal_esplanade_2k.hdr` 로드 → `scene.background`, `scene.environment` 설정
- `GLTFLoader`로 Khronos glTF Sample Assets의 모델 목록을 가져와 GUI로 선택해서 로드
- `OrbitControls` + `fitCameraToSelection` 로 모델 크기에 맞춰 카메라 자동 맞춤
- `ACESFilmicToneMapping` 적용

## 실행

```bash
cd sandbox/three-gltfloader-clone
npm install
npm run dev
```

## HDR 위치
- `public/env/royal_esplanade_2k.hdr`

