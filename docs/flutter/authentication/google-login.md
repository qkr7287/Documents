# Flutter Google 로그인 구현 가이드

## 개요
Flutter 앱에서 Google 로그인 기능을 구현하는 방법과 문제 해결 과정을 정리한 문서입니다.

## 목차
- [필수 패키지](#필수-패키지)
- [설정 방법](#설정-방법)
- [구현 코드](#구현-코드)
- [문제 해결](#문제-해결)

## 필수 패키지

### pubspec.yaml
```yaml
dependencies:
  google_sign_in: ^latest_version
  firebase_auth: ^latest_version  # Firebase를 사용하는 경우
```

## 설정 방법

### Android 설정
1. Google Cloud Console에서 OAuth 2.0 클라이언트 ID 생성
2. `android/app/build.gradle`에 SHA-1 인증서 지문 추가
3. `google-services.json` 파일 다운로드 및 배치

### iOS 설정
1. Google Cloud Console에서 iOS 클라이언트 ID 생성
2. `ios/Runner/Info.plist`에 URL Scheme 추가
3. `GoogleService-Info.plist` 파일 다운로드 및 배치

## 구현 코드

### 기본 구현
```dart
import 'package:google_sign_in/google_sign_in.dart';

final GoogleSignIn _googleSignIn = GoogleSignIn(
  scopes: ['email', 'profile'],
);

Future<void> signInWithGoogle() async {
  try {
    final GoogleSignInAccount? googleUser = await _googleSignIn.signIn();
    if (googleUser == null) {
      // 사용자가 로그인 취소
      return;
    }
    
    final GoogleSignInAuthentication googleAuth = 
        await googleUser.authentication;
    
    // Firebase Auth와 연동하는 경우
    // final credential = GoogleAuthProvider.credential(
    //   accessToken: googleAuth.accessToken,
    //   idToken: googleAuth.idToken,
    // );
    // await FirebaseAuth.instance.signInWithCredential(credential);
    
  } catch (error) {
    print('Google 로그인 오류: $error');
  }
}
```

## 문제 해결

### 문제 1: SHA-1 인증서 지문 오류
**증상**: Android에서 "DEVELOPER_ERROR" 발생

**해결 방법**:
1. 디버그 키스토어의 SHA-1 확인:
   ```bash
   keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
   ```
2. Google Cloud Console에 SHA-1 추가
3. 앱 재빌드

### 문제 2: iOS에서 로그인 후 앱으로 돌아오지 않음
**증상**: Safari에서 로그인 후 앱으로 리다이렉트되지 않음

**해결 방법**:
1. `Info.plist`에 URL Scheme 확인:
   ```xml
   <key>CFBundleURLTypes</key>
   <array>
     <dict>
       <key>CFBundleURLSchemes</key>
       <array>
         <string>com.googleusercontent.apps.YOUR_CLIENT_ID</string>
       </array>
     </dict>
   </array>
   ```
2. 클라이언트 ID가 올바른지 확인

### 문제 3: "Sign in with Google temporarily disabled"
**증상**: 일시적으로 Google 로그인이 비활성화됨

**해결 방법**:
1. Google Cloud Console에서 API 사용량 확인
2. 할당량 초과 여부 확인
3. 몇 시간 후 재시도

### 문제 4: 네트워크 오류
**증상**: 인터넷 연결은 되지만 Google 로그인 실패

**해결 방법**:
1. 디바이스의 Google Play Services 업데이트 확인
2. 네트워크 방화벽 설정 확인
3. VPN 사용 중인 경우 비활성화 후 재시도

## 참고 자료
- [Google Sign-In for Flutter 공식 문서](https://pub.dev/packages/google_sign_in)
- [Firebase Authentication 가이드](https://firebase.google.com/docs/auth)
