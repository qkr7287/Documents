# Babylon.js 예제: three.js `webgl_loader_gltf` 느낌 따라하기

이 폴더는 나중에 쉽게 지울 수 있도록 **sandbox**로 분리된 예제 프로젝트입니다.

## 목표
- glTF(예: DamagedHelmet) 로드
- `royal_esplanade_4k.hdr` 환경맵으로 IBL 적용(배경 스카이박스 포함)
- Orbit(ArcRotateCamera)로 회전/줌
- 톤매핑/노출 조절로 “떼깔” 맞추기

## 준비물
- Node.js 18+ 권장

## 실행

```bash
cd sandbox/babylon-gltfloader-clone
npm install
npm run dev
```

브라우저에서 출력되는 URL로 접속하세요.

## HDR 위치
- `public/env/royal_esplanade_4k.hdr`

