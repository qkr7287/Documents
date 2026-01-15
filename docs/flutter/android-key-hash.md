# Android 키 해시(Key Hash) 확인 방법

카카오 로그인 등 OAuth 인증을 위해 필요한 Android 키 해시를 확인하는 방법입니다.

## 준비물
- keytool (이미 설치되어 있을 수 있음)
- OpenSSL 설치

## keytool 확인 및 설치

### 1) keytool이 이미 설치되어 있는지 확인

PowerShell 또는 명령 프롬프트에서 다음 명령어로 확인:

```powershell
keytool -help
```

**예시 출력:**
```
키 및 인증서 관리 도구

명령어:
 -certreq            인증서 요청 생성
 -changealias        기존 항목의 별칭 변경
 -delete             키스토어 항목 삭제
 -exportcert         인증서 내보내기
 -genkeypair         키 쌍 생성
 -gencert            인증서 요청에서 인증서 생성
...
```

명령어가 실행되면 이미 설치되어 있는 것입니다.

### 2) Android Studio가 설치되어 있다면

Android Studio를 설치했다면 내장된 keytool을 사용할 수 있습니다. 다음 경로에서 keytool을 찾을 수 있습니다:

```
C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe
```

또는 Android Studio의 JDK 경로를 직접 사용:

```powershell
& "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe" -help
```

### 3) keytool이 없는 경우

keytool은 Java JDK에 포함되어 있습니다. 최소한의 JDK만 설치하면 됩니다:

1. [OpenJDK](https://adoptium.net/) 다운로드 (가장 가벼운 옵션)
2. 설치 파일 실행 후 설치 진행
3. 설치 후 시스템 PATH에 Java bin 폴더가 자동으로 추가되는지 확인
4. PowerShell 또는 명령 프롬프트를 재시작 후 `keytool -help`로 확인

## Windows에서 openssl 설치

1. [OpenSSL 공식 사이트](https://slproweb.com/products/Win32OpenSSL.html)에서 Windows용 설치 파일 다운로드
2. 설치 후 시스템 PATH에 추가
3. PowerShell 또는 명령 프롬프트에서 `openssl version` 명령어로 확인

**예시 출력:**
```
OpenSSL 3.2.0 23 Nov 2023 (Library: OpenSSL 3.2.0 23 Nov 2023)
```

## 키 해시 확인 방법

### 디버그 키 해시 확인

#### keytool이 PATH에 등록된 경우
PowerShell 또는 명령 프롬프트에서 실행:

```powershell
keytool -exportcert -alias androiddebugkey -keystore $env:USERPROFILE\.android\debug.keystore -storepass android -keypass android | openssl sha1 -binary | openssl base64
```

**예시 출력:**
```
ABCD1234EFGH5678IJKL9012MNOP3456QRST7890=
```

> **참고**: 실제 키 해시 값은 위와 같은 형태의 Base64 인코딩된 문자열입니다. 이 값을 복사하여 사용하세요.

#### Android Studio의 keytool을 직접 사용하는 경우
```powershell
& "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe" -exportcert -alias androiddebugkey -keystore $env:USERPROFILE\.android\debug.keystore -storepass android -keypass android | openssl sha1 -binary | openssl base64
```

**예시 출력:**
```
ABCD1234EFGH5678IJKL9012MNOP3456QRST7890=
```

> **참고**: Android Studio 설치 경로가 다른 경우, 실제 경로로 변경하세요.

### 릴리즈 키 해시 확인

릴리즈 키스토어를 사용하는 경우:

#### keytool이 PATH에 등록된 경우
```powershell
keytool -exportcert -alias <YOUR_KEY_ALIAS> -keystore <YOUR_KEYSTORE_PATH> | openssl sha1 -binary | openssl base64
```

**예시:**
```powershell
keytool -exportcert -alias upload -keystore .\upload-keystore.jks | openssl sha1 -binary | openssl base64
```

**예시 출력:**
```
WXYZ9876STUV5432RQPON1098MLKJ7654IHGF3210=
```

> **참고**: 릴리즈 키 해시는 디버그 키 해시와 다릅니다. 배포 시에는 릴리즈 키 해시도 등록해야 합니다.

#### Android Studio의 keytool을 직접 사용하는 경우
```powershell
& "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe" -exportcert -alias <YOUR_KEY_ALIAS> -keystore <YOUR_KEYSTORE_PATH> | openssl sha1 -binary | openssl base64
```

**예시:**
```powershell
& "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe" -exportcert -alias upload -keystore .\upload-keystore.jks | openssl sha1 -binary | openssl base64
```

**예시 출력:**
```
WXYZ9876STUV5432RQPON1098MLKJ7654IHGF3210=
```

## 키 해시 확인 후
확인된 키 해시 값을 복사하여:
- **Kakao Developers 콘솔** → 플랫폼 → Android 플랫폼 등록에서 등록
- **Google Cloud Console** → OAuth 2.0 클라이언트 ID 설정에서 등록 (Google 로그인 사용 시)

**키 해시 값 예시:**
```
ABCD1234EFGH5678IJKL9012MNOP3456QRST7890=
```

이런 형태의 Base64 인코딩된 문자열이 출력됩니다. 이 전체 값을 복사하여 개발자 콘솔에 등록하세요.

## 주의사항
- **디버그 키 해시**와 **릴리즈 키 해시**는 다릅니다
- 개발 중에는 디버그 키 해시를 등록
- 배포 시에는 릴리즈 키 해시도 함께 등록해야 합니다
- 키 해시를 변경한 후에는 앱을 **재설치**해야 반영됩니다

## 문제 해결

### "keytool을 찾을 수 없습니다"
- 위의 "keytool 확인 및 설치" 섹션 참고
- Android Studio가 설치되어 있다면 그 경로의 keytool 사용
- 없을 경우 OpenJDK 최소 설치 또는 Android Studio 설치

### "openssl을 찾을 수 없습니다"
- 위의 openssl 설치 방법 참고
- 시스템 PATH에 OpenSSL이 추가되었는지 확인
- PowerShell 또는 명령 프롬프트를 재시작 후 재시도

### 키 해시가 일치하지 않음
- 현재 빌드가 사용하는 키스토어 확인
- 디버그/릴리즈 빌드 구분 확인
- 앱 재설치 후 재시도
