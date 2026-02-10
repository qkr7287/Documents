# Flutter Android Google 로그인 구현 가이드

Flutter 앱에서 **안드로이드 Google 로그인** 기능을 구현하는 과정을 정리한 문서입니다.

## 직접 하면서 느낀점
- 코드 구현 자체도 헷갈리는게 많았음. 왜냐하면 현재 패키지 7.2.0 버전을 사용하나 AI 또는 블로그 문서들이 7.0.0 이전껄 (7.0.0 기준으로 사용방법이 바뀜)알려줘서 헷갈렸음.
- **가장 큰 삽질**: Android 앱을 개발하는데 당연히 Android 클라이언트만 있으면 될 줄 알았지만, `google_sign_in` 패키지의 작동 방식을 보니 **Android 클라이언트와 Web 클라이언트가 모두 필요**하다는 것을 나중에 알게 되었습니다. 패키지의 작동 방식을 미리 이해하지 않고 구현에 급급했던 것이 원인이었고, 이 과정에서 많은 시간을 소비했지만 패키지의 내부 동작 원리를 이해하는 좋은 공부가 되었습니다.

## 목차
- [google_sign_in 패키지 정보](#google_sign_in-패키지-정보)
- [패키지 작동 방식](#패키지-작동-방식)
- [Google Cloud Console 설정](#google-cloud-console-설정)
- [Flutter 패키지 추가](#flutter-패키지-추가)
- [Flutter 코드 구현](#flutter-코드-구현)
- [테스트 및 확인](#테스트-및-확인)

## google_sign_in 패키지 정보

### 공식 패키지
- **패키지명**: [google_sign_in](https://pub.dev/packages/google_sign_in)
- **최신 버전**: 7.2.0 (2024년 기준)
- **플랫폼 지원**: Android (SDK 21+), iOS (12.0+), macOS (10.15+), Web
- **공식 문서**: [pub.dev/packages/google_sign_in](https://pub.dev/packages/google_sign_in)

### 패키지 개요
`google_sign_in`은 Google 계정으로 안전하게 로그인할 수 있는 Flutter 플러그인입니다. Google의 인증 시스템을 사용하여 사용자 인증을 처리합니다.

## 패키지 작동 방식

### 중요: Android와 Web 클라이언트 모두 필요

**핵심 포인트**: Android 앱을 개발하더라도 `google_sign_in` 패키지는 내부적으로 **Web 클라이언트도 함께 사용**합니다. 따라서 Google Cloud Console에서 다음 두 가지 클라이언트를 모두 생성해야 합니다:

1. **Android OAuth 클라이언트 ID**
   - 패키지명과 SHA-1 인증서 지문 필요
   - Android 앱 인증에 사용

2. **Web OAuth 클라이언트 ID**
   - 리다이렉트 URI 설정 필요
   - 패키지 내부에서 웹뷰를 통한 인증에 사용

### 실제 인증 과정 (내부 동작)

`google_sign_in` 패키지가 실제로 어떻게 동작하는지 단계별로 설명합니다:

#### 1단계: 앱에서 로그인 요청
```dart
final GoogleSignInAccount? googleUser = await GoogleSignIn().signIn();
```

#### 2단계: 패키지 내부 처리
1. **WebView 기반 인증 시작**
   - 패키지가 내부적으로 **WebView를 열어서** Google 로그인 페이지를 표시합니다
   - 이때 **Web OAuth 클라이언트 ID**를 사용하여 OAuth 2.0 인증 플로우를 시작합니다
   - 사용자가 Google 계정으로 로그인하고 권한을 승인합니다

2. **인증 토큰 획득**
   - WebView를 통해 받은 인증 코드나 토큰을 처리합니다
   - **Android 클라이언트 ID**를 사용하여 최종 인증을 완료합니다

3. **사용자 정보 반환**
   - 인증이 완료되면 `GoogleSignInAccount` 객체를 반환합니다

### 왜 Web 클라이언트가 필요한가?

#### 1. OAuth 2.0 인증 플로우의 특성
- Google의 OAuth 2.0은 **웹 기반 인증 플로우**를 기본으로 합니다
- 사용자가 브라우저나 웹뷰에서 직접 로그인하고 권한을 승인하는 방식입니다
- Android 네이티브 SDK만으로는 이 전체 플로우를 완전히 구현하기 어렵습니다

#### 2. 플랫폼 간 일관성
- `google_sign_in` 패키지는 **Android, iOS, Web** 등 여러 플랫폼을 지원합니다
- 모든 플랫폼에서 동일한 인증 방식을 사용하기 위해 **웹 기반 인증을 공통으로 사용**합니다
- 이렇게 하면 코드가 플랫폼에 독립적이고 유지보수가 쉬워집니다

#### 3. 기능의 완전성
- Android 네이티브 인증만으로는 일부 고급 기능(예: 추가 권한 요청, 서버 인증 코드 등)을 제공하기 어렵습니다
- Web 기반 인증을 사용하면 Google의 모든 OAuth 2.0 기능을 완전히 활용할 수 있습니다

#### 4. 보안 및 유연성
- Web 기반 인증은 Google이 직접 관리하는 보안 정책을 따릅니다
- 새로운 보안 기능이나 정책 변경 시에도 패키지 업데이트만으로 대응할 수 있습니다

### 실제 동작 예시

```
[앱] GoogleSignIn().signIn() 호출
    ↓
[패키지] WebView 열기 (Web 클라이언트 ID 사용)
    ↓
[Google 서버] 로그인 페이지 표시
    ↓
[사용자] Google 계정으로 로그인 및 권한 승인
    ↓
[Google 서버] 인증 코드 반환
    ↓
[패키지] 인증 코드를 토큰으로 교환 (Android 클라이언트 ID 사용)
    ↓
[앱] GoogleSignInAccount 반환
```

**결론**: Android 앱이더라도 패키지가 내부적으로 WebView를 통해 웹 기반 인증을 수행하므로, **Web OAuth 클라이언트 ID가 반드시 필요**합니다. 이는 패키지의 설계 방식이며, Google의 OAuth 2.0 인증 시스템의 특성 때문입니다.

## Google Cloud Console 설정

### 준비물
- **앱의 패키지명**: 예) `com.example.myapp`
- **SHA-1 인증서 지문**: 디버그/릴리즈 각각 필요할 수 있음

### 1) Google Cloud Console 프로젝트 생성
1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 새 프로젝트 생성 또는 기존 프로젝트 선택

### 2) OAuth 동의 화면 설정
1. **API 및 서비스** → **OAuth 동의 화면** 이동
<img src="../../assets/images/flutter/authentication/google-login/동의화면 경로.png" alt="동의화면 경로 화면" width="500"/>
2. 사용자 유형 선택 (외부 또는 내부)
3. 앱 정보 입력 (앱 이름, 사용자 지원 이메일 등)
4. 범위 추가 (필요한 경우)

### 3) 데이터 액세스(Scopes) 설정 (가져올 데이터/권한 범위)
- Google 로그인만 기본으로 쓰면 보통 `email`, `profile` 정도로 충분합니다.
- 특정 Google API(예: People API, Drive 등)를 호출할 계획이 있다면 해당 **Scope**를 추가해야 합니다.
- 민감/제한 범위를 추가하면 검증(Verification)이 필요할 수 있으니, 처음에는 필요한 것만 최소로 추가하는 것을 추천합니다.

   <img src="../../assets/images/flutter/authentication/google-login/데이터 액세스.png" alt="데이터 액세스 화면" width="500"/>

### 4) 게시 상태(테스트/게시) 설정 + 테스트 사용자 이메일 등록
OAuth 동의 화면은 **테스트 상태**와 **게시 상태**에 따라 로그인 가능한 사용자가 달라집니다.

1. **OAuth 동의 화면** 설정 페이지에서 **게시 상태**를 확인합니다.
2. **테스트 상태**라면:
   - **테스트 사용자(Test users)**에 로그인할 Google 계정 이메일을 추가합니다.
   - 추가한 이메일 계정만 로그인 테스트가 가능합니다.
3. **게시 상태**로 전환하면:
   - 원칙적으로 **누구나 로그인**할 수 있습니다.
   - (단, 앱 검증/승인/정책 설정에 따라 제한이 걸릴 수 있습니다.)
   <img src="../../assets/images/flutter/authentication/google-login/게시 상태.png" alt="게시 상태 화면" width="500"/>

### 5) OAuth 2.0 클라이언트 ID 생성

**중요**: Android 앱이더라도 **Android 클라이언트와 Web 클라이언트를 모두 생성**해야 합니다.

#### 5-1) Android OAuth 클라이언트 ID 생성
1. **API 및 서비스** → **사용자 인증 정보** 이동
2. **사용자 인증 정보 만들기** → **OAuth 클라이언트 ID** 선택
<img src="../../assets/images/flutter/authentication/google-login/클라이언트 만들기.png" alt="클라이언트 만들기 화면" width="500"/>
3. 애플리케이션 유형: **Android** 선택
4. 다음 정보 입력:
   - **이름**: 예) "My Flutter App - Android"
   - **패키지 이름**: `android/app/build.gradle`의 `applicationId`와 동일해야 합니다
   - **SHA-1 인증서 지문**: [Android 키 해시 확인 방법](../../android-key-hash.md) 문서를 참고하여 확인한 값을 입력

**예시:**
- 이름: `My Flutter App - Android`
- 패키지 이름: `com.example.myapp`
- SHA-1 인증서 지문: `AB:CD:EF:12:34:56:78:90:AB:CD:EF:12:34:56:78:90:AB:CD:EF:12`

#### 5-2) Web OAuth 클라이언트 ID 생성 (필수!)
1. **사용자 인증 정보** 페이지에서 **사용자 인증 정보 만들기** → **OAuth 클라이언트 ID** 선택
2. 애플리케이션 유형: **웹 애플리케이션** 선택
3. 다음 정보 입력:
   - **이름**: 예) "My Flutter App - Web"
   - **승인된 리디렉션 URI**: (입력 안 해도 됨)
     - `http://localhost` (개발용)
     - 또는 실제 도메인 (배포용)
     <img src="../../assets/images/flutter/authentication/google-login/웹 클라이언트 만들기.png" alt="웹 클라이언트 만들기 화면" width="500"/>

**예시:**
- 이름: `My Flutter App - Web`
- 승인된 리디렉션 URI: `http://localhost`

> **왜 Web 클라이언트가 필요한가?**  
> `google_sign_in` 패키지는 내부적으로 웹 기반 인증 플로우를 사용하므로, Android 앱이더라도 Web 클라이언트가 반드시 필요합니다. 이 점을 모르고 Android 클라이언트만 생성하면 인증이 실패합니다.

### 6) SHA-1 인증서 지문 확인 및 등록
SHA-1 인증서 지문은 [Android 키 해시 확인 방법](../../android-key-hash.md) 문서를 참고하세요.

**중요**: 디버그 빌드와 릴리즈 빌드의 SHA-1이 다르므로, 개발 중에는 디버그 SHA-1을, 배포 시에는 릴리즈 SHA-1도 함께 등록해야 합니다.

> **중요 (Play Store 배포 시)**  
> Google Play Store에 업로드하면(특히 **Play App Signing**을 사용하는 경우) **스토어에 올라간 앱의 서명 인증서 SHA-1**이 로컬(디버그/릴리즈 키스토어)와 **달라질 수 있습니다.**  
> 그래서 **디버그에서는 잘 되다가**, Play Store 업로드 후에는 **Google 로그인(소셜 로그인)이 갑자기 실패**할 수 있어요.  
> 이 경우 **Google Cloud Console의 Android OAuth 클라이언트**에 **Play Console의 “앱 서명 키(App signing key)” SHA-1**도 **추가로 등록**해야 합니다.

## Flutter 패키지 추가

### 1) 패키지 설치
버전 고정 대신, 아래 명령으로 프로젝트에 최신 버전을 추가하는 방식을 권장합니다.

```bash
flutter pub add google_sign_in
```

Firebase를 사용하는 경우:
```bash
flutter pub add firebase_auth
```

### 2) 의존성 가져오기

```bash
flutter pub get
```

## Flutter 코드 구현

### 1) SDK 초기화 및 설정
`main()`에서 Google Sign-In을 초기화합니다. (별도 초기화 코드는 필요 없지만, 패키지 설정은 필요합니다.)

### 2) Google 로그인 구현

```dart
import 'package:flutter/material.dart';
import 'package:google_sign_in/google_sign_in.dart';

final GoogleSignIn _googleSignIn = GoogleSignIn(
  scopes: ['email', 'profile'],
);

Future<void> signInWithGoogle() async {
  try {
    final GoogleSignInAccount? googleUser = await _googleSignIn.signIn();
    if (googleUser == null) {
      // 사용자가 로그인 취소
      print('사용자가 로그인 취소');
      return;
    }
    
    final GoogleSignInAuthentication googleAuth = 
        await googleUser.authentication;
    
    // 사용자 정보 가져오기
    final email = googleUser.email;
    final displayName = googleUser.displayName;
    final photoUrl = googleUser.photoUrl;
    
    print('로그인 성공: email=$email, name=$displayName');
    
    // 필요 시: 여기서 이메일/이름 등을 서버로 전송하거나, 앱 상태에 저장
    
  } catch (error) {
    print('Google 로그인 오류: $error');
    rethrow;
  }
}
```

**예시 출력:**
```
로그인 성공: email=user@example.com, name=홍길동
```

### 4) 로그아웃

```dart
Future<void> signOutGoogle() async {
  await _googleSignIn.signOut();
  // Firebase를 사용하는 경우
  // await FirebaseAuth.instance.signOut();
}
```

## 테스트 및 확인

### 1) 실행 환경
- **실기기**에서 먼저 테스트하는 것을 추천합니다. (에뮬레이터 환경에서 Google Play Services 문제가 발생할 수 있음)

### 2) 체크리스트
- **SHA-1 인증서 지문이 정확히 등록**되어 있는지(디버그/릴리즈 혼동 가장 흔함)
- **(Play Store 배포 시) Play App Signing의 SHA-1도 등록**되어 있는지 (디버그에서 되다가 업로드 후 실패하는 경우 흔함)
- **패키지명이 정확히 일치**하는지(applicationId 포함)
- **Android OAuth 클라이언트 ID**가 올바르게 생성되었는지
- **Web OAuth 클라이언트 ID**가 생성되었는지 (중요!)
- **OAuth 동의 화면** 설정이 완료되었는지

### 3) 겪었던 오류와 해결

#### 28444 에러: `GoogleSignInExceptionCode.unknownError, [28444]`

**증상**
- Google 로그인 시 아래와 같은 형태의 에러가 발생하며 로그인 실패

**에러 예시**
```
GoogleSignInExceptionCode.unknownError, [28444]
```

**차근차근 체크할 항목**
1. **Android OAuth 클라이언트가 정상 생성되어 있는지**
   - Google Cloud Console → 사용자 인증 정보에서 **Android** 타입 OAuth 클라이언트 ID가 있는지 확인
   - 패키지명/ SHA-1이 실제 빌드(디버그/릴리즈)와 일치하는지 확인
2. **Web OAuth 클라이언트가 생성되어 있는지 (중요)**
   - Google Cloud Console → 사용자 인증 정보에서 **웹 애플리케이션** 타입 OAuth 클라이언트 ID가 있는지 확인
3. **앱 코드/설정에서 Web 클라이언트 키(serverClientId)가 반영되어 있는지**
   - `google_sign_in` 패키지를 사용하는 경우, Android만 설정해두면 인증이 실패할 수 있음
4. **Google Cloud Console의 OAuth 동의 화면이 완료되어 있는지**
   - 동의 화면이 미완료면 인증 과정에서 실패할 수 있음
5. **OAuth 동의 화면의 게시 상태가 “테스트”인지 “게시”인지**
   - **테스트 상태**: “테스트 사용자(Test users)”에 **로그인할 이메일을 등록**해야 해당 계정으로 로그인 가능
   - **게시 상태**: 원칙적으로 **누구나 로그인 가능** (단, 앱 검증/승인/정책 설정에 따라 제한이 걸릴 수 있음)

**결론(내 케이스)**
- 저는 **Android OAuth 클라이언트만 만들어서** 설정하고 있었고, 그 상태에서 위 **28444 에러**가 계속 발생했습니다.
- 문제 해결 자료를 찾아보니 **Web OAuth 클라이언트(웹 클라이언트 키)**도 필요하다는 내용을 확인했고,
  Web 클라이언트를 생성한 뒤 **웹 클라이언트 키를 설정에 추가**하니 정상적으로 동작했습니다.

#### (주의) `google_sign_in` 7.0.0+ 버전부터 사용 방식이 바뀜
- 제가 쓰던 버전은 `google_sign_in` **7.2.0**이었는데, AI/블로그 글 중에 **7.0.0 이전 방식**으로 설명하는 글이 많아서 더 헷갈렸습니다.
- 그래서 문제 해결할 때는 “내가 쓰는 패키지 버전”을 먼저 확인하고, 공식 문서/공식 예제 기준으로 맞추는 것을 추천합니다.
- 특히 아래 공식 예제 코드가 7.x 흐름을 이해하는 데 큰 도움이 됐습니다:
  - [google_sign_in 공식 예제 `main.dart`](https://github.com/flutter/packages/blob/main/packages/google_sign_in/google_sign_in/example/lib/main.dart)

## 참고 자료
- [google_sign_in 패키지 공식 문서](https://pub.dev/packages/google_sign_in) - 패키지 사용법, API 레퍼런스, 예제 코드
- [google_sign_in 공식 예제 `main.dart`](https://github.com/flutter/packages/blob/main/packages/google_sign_in/google_sign_in/example/lib/main.dart) - 7.x 기준 흐름 이해에 도움
- [google_sign_in Android 가이드](https://pub.dev/packages/google_sign_in_android) - Android 플랫폼별 설정
- [google_sign_in Web 가이드](https://pub.dev/packages/google_sign_in_web) - Web 플랫폼별 설정
- [Firebase Authentication 가이드](https://firebase.google.com/docs/auth) - Firebase와 연동하는 방법
- [Google Cloud Console](https://console.cloud.google.com/) - OAuth 클라이언트 ID 생성 및 관리
- [Android 키 해시 확인 방법](../../android-key-hash.md) - SHA-1 인증서 지문 확인 방법