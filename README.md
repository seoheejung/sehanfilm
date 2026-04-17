# 📫 웹캠과 node.JS로 인생네컷 만들기

## 시스템 개요

웹캠 촬영 기반 인생네컷 이미지 생성 시스템

- 브라우저: 촬영 UI 및 사용자 인터랙션
- Node.js 서버: 이미지 합성 및 Google Drive 업로드
- Google Drive: 결과 이미지 저장소

---

## OAuth 인증 구조 (중요)

### 구조

- 브라우저 인증 제거
- 서버 1회 인증 후 refresh token 저장
- 이후 모든 업로드는 서버 단독 수행

### 인증 흐름

```
1. /auth/google/start 호출
2. Google 계정 승인
3. /auth/google/callback에서 code 수신
4. 서버가 token 교환
5. refresh token 로컬 저장
6. 이후 인증 없이 자동 업로드
```

### 추가 동작 구현
1. 서버 시작 시 refresh token 유효성 검사
2. 유효하면 계속 사용
3. 무효면 삭제
4. 화면에 재인증 필요 표시
5. 운영 중 무효화돼도 다음 실패 시 즉시 감지 후 폐기

---

## 필요 패키지
```
npm install sharp nodemon moment dotenv ejs googleapis
```

## 디렉토리 구조
```
sehanfilm/
├── app.js
├── config
│   └── overlayPositions.js
├── controllers
│   └── mergeImagesWithTemplateController.js
├── data
│   └── google-drive-token.json   # 자동 생성, git 제외
├── public
│   ├── 2026_finalOutput      # 자동 생성, git 제외
│   ├── css
│   ├── image
│   ├── js
│   └── lib
├── routes
│   └── index.js
├── services
│   ├── googleDriveService.js
│   └── googleOAuthService.js
└── views
    ├── partials
    ├── qrcode.ejs
    └── webcam.ejs
```

## 서버 실행
```
npm run dev
```

### 사이트 주소
http://localhost:3003

---

## 처리 흐름

```
브라우저
 -> 웹캠 촬영 (4장)
 -> 서버 /mergeImages 요청

서버
 -> 이미지 합성
 -> Google Drive 업로드
 -> 공유 링크 생성
 -> QR 페이지 반환
```

### 전체 동작 순서

1. 서버 실행
2. 관리자 1회 Google Drive 인증 수행
3. 사용자가 프레임 선택
4. 웹캠으로 4장 촬영
5. 서버가 이미지 합성
6. 서버가 refresh token으로 access token 발급
7. Google Drive 업로드 수행
8. 공개 링크 생성
9. QR 페이지 제공

---

## 필수 환경 변수
```
HTTPIP=http://localhost:3003
HTTPPORT=3003

GOOGLE_DRIVE_CLIENT_ID=
GOOGLE_DRIVE_CLIENT_SECRET=
GOOGLE_DRIVE_REDIRECT_URI=http://127.0.0.1:3003/auth/google/callback
GOOGLE_DRIVE_FOLDER_ID=
```
| 변수 | 설명 |
| --- | --- |
| GOOGLE_DRIVE_CLIENT_ID | OAuth 클라이언트 ID |
| GOOGLE_DRIVE_CLIENT_SECRET | OAuth client secret |
| GOOGLE_DRIVE_REDIRECT_URI | OAuth callback URL |
| GOOGLE_DRIVE_FOLDER_ID | 업로드 대상 Drive 폴더 ID |
| HTTPIP | QR 이미지 URL 생성용 |
| HTTPPORT | 서버 포트 |

---

## Google Cloud Console 설정
### 1. API 설정

- Google Drive API 활성화

### 2. OAuth 동의 화면

- External 또는 Internal 설정
- 테스트 계정 등록

### 3. OAuth 클라이언트 생성

타입:

```
Web application
```

### 4. Redirect URI 등록

```
http://127.0.0.1:3003/auth/google/callback
```

---

## Google Drive 설정
1. 업로드 전용 폴더 생성
2. 폴더 ID 추출
3. .env에 설정
```
https://drive.google.com/drive/folders/폴더ID
```

---

## 인증 토큰 관리

```
data/google-drive-token.json
```

### 동작

- 최초 인증 시 생성
- refresh token 포함
- access token 자동 갱신

### 주의

```
.gitignore 필수
```

```
data/google-drive-token.json
```

--- 

## 오류 처리 정책

| 상황 | 처리 |
| --- | --- |
| 인증 없음 | 401 + authUrl 반환 |
| refresh token 없음 | 인증 유도 |
| Drive 업로드 실패 | 500 반환 |
| 이미지 오류 | 400 반환 |

---

## 보안 기준

- refresh token은 서버 내부 저장
- 브라우저로 token 전달 금지
- token 파일 git 업로드 금지
- 공개 링크는 Drive 권한(anyone) 기반 생성

---

## 변경 사항 요약

| 항목 | 변경 |
| --- | --- |
| OAuth 방식 | 브라우저 → 서버 |
| 인증 시점 | 촬영 시 → 서버 1회 |
| 토큰 처리 | access token → refresh token |
| 업로드 방식 | 브라우저 전달 → 서버 직접 업로드 |

---

## 📷 OBS 색상 조절 (필수 설정)

### 구조

1. 카메라 드라이버 설정 (하드웨어)
    - 드라이버 설정 → 웹에도 영향 있음
2. OBS 필터 (소프트웨어 후처리)
    - OBS 필터 → OBS 화면에만 적용됨

### 카메라 드라이버 설정 (중요)

#### 경로
```
OBS → 비디오 캡처 장치 → 속성 → 카메라 컨트롤
```

#### 기준값 (RPC-20F 기준 튜닝값)

```
밝기: 15
대비: 21
채도: 55
선명도: 7
감마: 110
화이트 밸런스: 4790
후광 보정: 0
```

### 특징

- 이 값은 **카메라 자체에 적용됨**
- 브라우저(Node.js 웹캠)에도 동일하게 반영됨
- 색감 문제는 여기서 먼저 잡아야 함

---

## 향후 개선 항목

1. 토큰 암호화 저장
2. Drive 업로드 retry 정책
3. 이미지 압축 옵션 분리
4. QR 페이지 캐싱 전략
5. 업로드 로그 구조화