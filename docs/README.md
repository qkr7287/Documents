# 개발 가이드 문서

개발 과정에서 얻은 지식과 문제 해결 경험을 공유하는 문서 모음입니다.

## 구조

```
docs/
├── flutter/
│   └── authentication/
│       ├── google-login.md      # Google 로그인 구현 가이드
│       └── kakao-login.md       # Kakao 로그인 구현 가이드
├── 3d/
│   ├── babylon-vs-threejs-rendering-differences.md  # Babylon.js vs Three.js 렌더링·로딩 비교
│   └── loading-and-hardware.md   # 웹 3D 로딩과 하드웨어 이해
├── devops/
│   └── ci-cd/
│       └── ci-cd.md              # CI/CD 문서
├── assets/
│   └── images/                  # 문서에 사용되는 이미지 파일
│       └── flutter/
│           └── authentication/
│               ├── google-login/
│               └── kakao-login/
└── README.md                     # 이 파일
```

## 카테고리

### Flutter
- **인증 (Authentication)**
  - [Google 로그인](./flutter/authentication/google-login.md)
  - [Kakao 로그인](./flutter/authentication/kakao-login.md)

### 3D
- **웹 3D**
  - [Babylon.js vs Three.js 렌더링 차이 (로직·로딩·장단점)](./3d/babylon-vs-threejs-rendering-differences.md)
  - [3D 로딩과 하드웨어 이해하기](./3d/loading-and-hardware.md)

### DevOps
- **CI/CD**
  - [Self-hosted CI/CD 가이드](./devops/ci-cd/ci-cd.md)

## 문서 작성 가이드

새로운 문서를 추가할 때는 다음 구조를 참고하세요:

1. **개요**: 문서의 목적과 범위
2. **목차**: 문서 내 주요 섹션
3. **설정 방법**: 필요한 설정 및 구성
4. **구현 코드**: 실제 구현 예제
5. **문제 해결**: 자주 발생하는 문제와 해결 방법
6. **참고 자료**: 관련 문서 및 링크

## 기여 방법

1. 적절한 카테고리 폴더에 문서 생성
2. 마크다운 형식으로 작성
3. 실제 경험과 문제 해결 과정 포함
4. 코드 예제는 실행 가능하도록 작성
