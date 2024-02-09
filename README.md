## 📫 웹캠과 node.JS로 인생네컷 만들기

### ✨ 사이트 주소
http://localhost:3003

### 📌 과정
1. 컴퓨터의 웹캠에 접근하여 사진을 4장 찍어 서버로 전송하기
2. 전송된 사진을 인생네컷 프레임(1909*1280)의 위치에 맞춰 병합하기
3. 사용자에게 사진 이미지를 반환하고 다운로드 받을 수 있는 QR코드를 제공하기
4. QR코드로 접속하면 사진을 다운로드 가능

#### 💡 필요 패키지
```
npm install path fs sharp nodemon moment dotenv ejs
```
#### 💡 프로젝트 구조
```
- config
  - overlayPosition.js # 레이어의 위치 저장
- controllers
  - imageSaveController.js # 촬영된 사진 저장 컨트롤러 (임시)
  - mergeImagesWithTemplateController.js # 촬영된 사진 병합 컨트롤러
- public
  - css # css 파일이 있는 폴더
  - image # 이미지 파일이 있는 폴더
  - js # js 파일이 있는 폴더
  - lib # 다른 파일이 있는 폴더
  - merged # 촤종 병합된 이미지가 저장되는 폴더
  - uploads # 1차 변합된 이미지가 저장되는 폴더
- routes # 라우터 관리 폴더
- view # ejs 폴더
- app.js
```

#### 서버 실행
```
npm run dev
```

#### 💬 이후 작업
```
CSS 작업 (완료)
canvas에 필터 적용 (실패)
세로 프레임 추가 (완료)
촬영된 사진 위에 이미지 합성 추가 (완료)
타이머 or 리모컨 사용 로직 분리 (완료)
CommonJS에서 ES modules로 변경
```