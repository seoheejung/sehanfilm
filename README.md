# 📫 웹캠과 node.JS로 인생네컷 만들기

## 과정
1. 컴퓨터의 웹캠에 접근하여 사진을 4장 촬영한다
2. 촬영된 사진을 인생네컷 프레임(1909*1280) 위치에 맞춰 합성한다
3. 브라우저에서 Google 인증을 진행하고 access token을 발급받는다
4. 합성된 이미지를 Google Drive API로 업로드한다
5. 업로드된 파일의 공유 링크를 생성한다
6. 사용자에게 미리보기 이미지와 다운로드용 QR 코드를 제공한다
7. QR 코드로 접속하면 Google Drive에서 사진을 다운로드할 수 있다

---

## 필요 패키지
```
npm install sharp nodemon moment dotenv ejs googleapis
```

## 프로젝트 구조
```
- config
  - overlayPositions.js # 프레임별 촬영 위치 및 오버레이 위치 설정
- controllers
  - mergeImagesWithTemplateController.js # 촬영 이미지 합성 및 Google Drive 업로드 처리
- public
  - css # 스타일 파일
  - image # 프레임 및 배경 이미지
  - js # 웹캠 촬영 및 업로드 스크립트
  - lib # 외부 라이브러리
  - 2026_finalOutput # QR 페이지 미리보기 이미지 저장 폴더
- routes
  - index.js # 페이지 및 업로드 라우터
- views
  - webcam.ejs # 메인 촬영 화면
  - qrcode.ejs # QR 출력 화면
  - partials # 공통 header / footer
- services
  - googleDriveService.js # Google Drive 업로드 및 공유 링크 생성
- app.js
```

## 서버 실행
```
npm run dev
```

### 사이트 주소
http://localhost:3003

---

## 현재 구조
```
브라우저
 -> 웹캠 촬영
 -> Google access token 발급
 -> 로컬 서버 /mergeImages 요청

로컬 서버
 -> 이미지 합성
 -> Google Drive 업로드
 -> fileId 조회
 -> 공유 링크 생성
 -> QR 페이지 반환
```

## 동작 방식
1. 사용자가 프레임을 선택하고 4장의 촬영을 완료한다
2. 업로드 시점에 브라우저가 Google 인증을 진행한다
3. 브라우저가 access token을 발급받는다
4. 서버가 촬영된 이미지를 합성한다
5. 서버가 전달받은 access token으로 Google Drive 업로드를 수행한다
6. 업로드된 파일의 공개 링크를 생성한다
7. QR 페이지에서 로컬 미리보기 이미지와 Google Drive QR 코드를 보여준다

---

## 필수 환경 변수
```
HTTPIP=http://localhost:3003
HTTPPORT=3003
GOOGLE_DRIVE_CLIENT_ID=
GOOGLE_DRIVE_FOLDER_ID=
```
1. GOOGLE_DRIVE_CLIENT_ID
  - Google Cloud Console에서 생성한 OAuth 클라이언트 ID
2. GOOGLE_DRIVE_FOLDER_ID
  - Google Drive에서 업로드 대상 폴더 URL의 ID
3. HTTPIP
  - QR 페이지에서 미리보기 이미지 URL 생성에 사용
4. HTTPPORT
  - 로컬 서버 실행 포트

---

## Google Cloud Console 설정
1. Google Cloud Console에서 프로젝트를 생성한다
2. Google Drive API를 활성화한다
3. OAuth 동의 화면을 설정한다
4. OAuth 클라이언트를 생성한다
5. 승인된 JavaScript 원본에 url을 등록한다

## Google Drive 폴더 준비
1. Google Drive에서 업로드 전용 폴더를 만든다
2. 폴더 URL에서 폴더 ID를 복사한다
3. .env의 GOOGLE_DRIVE_FOLDER_ID에 넣는다
```
https://drive.google.com/drive/folders/폴더ID
```

--- 

## 정리 예정 항목
1. 구버전 OAuth callback 문서 제거
2. 미사용 컨트롤러 및 불필요 코드 정리
3. 업로드 오류 메시지 정리
4. Drive 공개 권한 정책 재검토
5. 프론트 인증 흐름 정리