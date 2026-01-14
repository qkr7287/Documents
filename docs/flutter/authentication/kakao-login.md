# Flutter Android Kakao 로그인 구현 가이드

Flutter 앱에서 **안드로이드 카카오 로그인** 기능을 구현하는 과정을 정리한 문서입니다.

## 직접 하면서 느낀점
- **코드 구현 자체는 어렵지 않았지만**, 실제로 막히는 지점은 대부분 **Kakao Developers 콘솔 설정(준비 작업)**이었습니다.
- 특히 처음 해보는 경우 **패키지명/키 해시/네이티브 앱 키** 개념이 한 번에 안 잡혀서 헤매기 쉬웠고, 이 부분이 제일 버거웠습니다.

## 목차
- [카카오 개발자 콘솔 설정](#카카오-개발자-콘솔-설정)
- [Flutter 패키지 추가](#flutter-패키지-추가)
- [Flutter 코드 구현](#flutter-코드-구현)
- [테스트 및 확인](#테스트-및-확인)

## 카카오 개발자 콘솔 설정

### 준비물
- **앱의 패키지명**: 예) `com.example.myapp`
- **키 해시(Key Hash)**: 디버그/릴리즈 각각 필요할 수 있음

### 1) Kakao Developers 가입
- [Kakao Developers](https://developers.kakao.com/)에 가입/로그인합니다.

### 2) 애플리케이션 추가하기
- **내 애플리케이션** → **애플리케이션 추가하기**에서 앱을 생성합니다.
<img src="../../../assets/images/flutter/authentication/kakao-login/앱 생성.png" alt="카카오 앱 생성 화면" width="500"/>



### 3) 네이티브 앱 키 확인
- 이후 설정에서 계속 쓰이므로 먼저 확인합니다.
- **진입 경로**: 메뉴 → 앱 선택 → **앱 키**(또는 플랫폼 키) → **네이티브 앱 키**

### 4) Android 플랫폼 등록(패키지명 + 키 해시)
- **진입 경로**: 메뉴 → 앱 선택 → **플랫폼** → **Android 플랫폼 등록**
- 아래 정보를 입력합니다.
  - **패키지명**: `android/app/src/main/AndroidManifest.xml`의 `package` 또는 앱 설정에 있는 applicationId와 동일해야 합니다.
  - **키 해시**: 아래 방법으로 확인한 값을 등록합니다.

#### 키 해시 확인(권장: Git Bash/WSL 사용)
Windows PowerShell에서는 `openssl`이 없을 수 있어서, **Git Bash** 또는 **WSL**에서 실행하는 방식을 추천합니다.

- **디버그 키 해시**:

```bash
keytool -exportcert -alias androiddebugkey -keystore ~/.android/debug.keystore -storepass android -keypass android | openssl sha1 -binary | openssl base64
```

- **릴리즈 키 해시**(릴리즈 키스토어를 쓰는 경우):

```bash
keytool -exportcert -alias <YOUR_KEY_ALIAS> -keystore <YOUR_KEYSTORE_PATH> | openssl sha1 -binary | openssl base64
```

### 5) 카카오 로그인 활성화
- **진입 경로**: 메뉴 → 앱 선택 → **제품 설정** → **카카오 로그인**
  - **활성화 설정**: ON
  - (필요 시) Redirect URI 등 추가 설정

### 6) 카카오톡 동의 항목 설정
- **진입 경로**: 메뉴 → 앱 선택 → **제품 설정** → **카카오 로그인** → **동의 항목**
- 앱에서 받을 정보(예: 프로필, 이메일 등)에 맞게 설정합니다.
  - “필수”로 걸어두면, 사용자에게 반드시 동의를 받아야 로그인 완료가 됩니다.

## Flutter 패키지 추가

### 1) 패키지 설치
버전 고정 대신, 아래 명령으로 프로젝트에 최신 버전을 추가하는 방식을 권장합니다.

```bash
flutter pub add kakao_flutter_sdk
```

### 2) 의존성 가져오기

```bash
flutter pub get
```

## Flutter 코드 구현

### 1) SDK 초기화
`main()`에서 SDK를 초기화합니다. (최소 `nativeAppKey`는 필요합니다.)

```dart
import 'package:flutter/material.dart';
import 'package:kakao_flutter_sdk/kakao_flutter_sdk.dart';

void main() {
  KakaoSdk.init(
    nativeAppKey: 'YOUR_NATIVE_APP_KEY',
  );
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return const MaterialApp(
      home: Scaffold(
        body: Center(child: Text('Kakao Login')),
      ),
    );
  }
}
```

### 2) 카카오톡 로그인(설치되어 있으면) + 폴백(카카오계정)

```dart
import 'package:flutter/services.dart';
import 'package:kakao_flutter_sdk/kakao_flutter_sdk.dart';

Future<void> signInWithKakao() async {
  try {
    final bool isInstalled = await isKakaoTalkInstalled();
    if (isInstalled) {
      await UserApi.instance.loginWithKakaoTalk();
    } else {
      await UserApi.instance.loginWithKakaoAccount();
    }

    final user = await UserApi.instance.me();
    final nickname = user.kakaoAccount?.profile?.nickname;
    final email = user.kakaoAccount?.email;

    // 필요 시: 여기서 닉네임/이메일 등을 서버로 전송하거나, 앱 상태에 저장
    print('로그인 성공: nickname=$nickname, email=$email');
  } catch (error) {
    if (error is PlatformException && error.code == 'CANCELED') {
      print('사용자가 로그인 취소');
      return;
    }
    print('카카오 로그인 실패: $error');
    rethrow;
  }
}
```

### 3) 로그아웃

```dart
Future<void> signOutKakao() async {
  await UserApi.instance.logout();
}
```

### 4) AndroidManifest.xml 확인(필요 시)
대부분은 패키지가 처리하지만, 리다이렉션 관련 이슈가 생기면 아래 설정이 필요한지 확인합니다.

```xml
<application>
  <activity
    android:name="com.kakao.sdk.auth.AuthCodeHandlerActivity"
    android:exported="true">
    <intent-filter>
      <action android:name="android.intent.action.VIEW" />
      <category android:name="android.intent.category.DEFAULT" />
      <category android:name="android.intent.category.BROWSABLE" />
      <data android:scheme="kakao${YOUR_NATIVE_APP_KEY}" />
    </intent-filter>
  </activity>
</application>
```

## 테스트 및 확인

### 1) 실행 환경
- **실기기**에서 먼저 테스트하는 것을 추천합니다. (에뮬레이터 환경에서 카카오톡 설치/연동이 번거로울 수 있음)

### 2) 체크리스트
- **키 해시가 정확히 등록**되어 있는지(디버그/릴리즈 혼동 가장 흔함)
- **패키지명이 정확히 일치**하는지(applicationId 포함)
- **네이티브 앱 키**가 코드와 콘솔에서 동일한지
- **카카오 로그인 활성화 ON**인지
- 동의 항목에서 **필수/선택** 설정이 요구사항과 맞는지

### 3) 자주 겪는 오류와 해결

#### "Invalid key hash"
- **원인**: 디버그/릴리즈 키 해시 불일치, 다른 키스토어로 빌드됨, 콘솔에 누락 등록
- **해결**:
  - 현재 빌드가 어떤 키(디버그/릴리즈)를 쓰는지 확인
  - 해당 키 해시를 콘솔 Android 플랫폼에 추가
  - 앱 **재설치 후 재실행**

#### "KakaoTalk not installed"
- **원인**: 기기에 카카오톡이 없음
- **해결**: 코드에서 `loginWithKakaoAccount()`로 폴백(위 구현 참고)

#### "Required scopes not agreed"
- **원인**: 동의 항목이 “필수”인데, 사용자 동의를 못 받음/항목 설정이 바뀜
- **해결**:
  - 콘솔 동의 항목 설정 재확인
  - 사용자 재로그인 유도(필요 시 연결 끊기 후 재동의)

## 참고 자료
- [Kakao Flutter SDK 공식 문서](https://developers.kakao.com/docs/latest/ko/flutter/getting-started)
- [Kakao Developers 콘솔](https://developers.kakao.com/)
