// 현재 선택된 프레임 값
let frame = '';

// 현재 촬영 방향 상태
let shot = '';

// 가로 프레임 비디오/캔버스 너비
const h_value_1 = 735;

// 가로 프레임 비디오/캔버스 높이
const h_value_2 = 551;

// 세로 프레임 비디오/캔버스 높이
const v_value_1 = 759;

// 세로 프레임 비디오/캔버스 너비
const v_value_2 = 569;

// 현재까지 촬영한 사진 수
let photoCount = 0;

// 서버로 전송할 base64 이미지 배열
let imagesToSend = [];

// 타이머 촬영이 진행 중인지 여부
let isCaptureTimerActive = false;

// 수동 촬영 중 중복 입력 방지용 상태
let isCapturing = false;

let accessToken = '';

// Google 토큰 요청
const getGoogleAccessToken = () => {
    return new Promise((resolve, reject) => {
        const client = google.accounts.oauth2.initTokenClient({
            client_id: window.GOOGLE_DRIVE_CLIENT_ID,
            scope: 'https://www.googleapis.com/auth/drive.file',
            callback: (response) => {
                if (response.error) {
                    reject(response);
                } else {
                    accessToken = response.access_token;
                    resolve(accessToken);
                }
            }
        });

        client.requestAccessToken();
    });
};

// 선택한 프레임에 따라 비디오와 캔버스 크기 조정
const updateLayoutForFrameSelection = (frameValue) => {
    // 웹캠 비디오 DOM
    const video = document.getElementById('webcam');

    // 캡처 결과를 그릴 캔버스 DOM
    const canvas = document.getElementById('canvas');

    // 가로 프레임이면 horizontalShot 상태로 설정
    if (frameValue.endsWith('_h')) {
        shot = 'horizontalShot';

        video.width = h_value_1;
        video.height = h_value_2;

        canvas.width = h_value_1;
        canvas.height = h_value_2;

        // 가로에서는 objectFit 기본값 사용
        video.style.objectFit = 'fill';
    }

    // 세로 프레임이면 verticalShot 상태로 설정
    else if (frameValue.endsWith('_v')) {
        shot = 'verticalShot';

        // 세로 비율을 맞추기 위해 cover 사용
        video.style.objectFit = 'cover';

        video.width = v_value_2;
        video.height = v_value_1;

        canvas.width = v_value_2;
        canvas.height = v_value_1;
    }
};

// 화면 표시/숨김 공통 함수
const toggleDisplay = (elements, displayStyle) => {
    elements.forEach((element) => {
        const domElement = document.querySelector(element);

        // DOM이 있으면 display 변경
        if (domElement) {
            domElement.style.display = displayStyle;
        }
    });
};

// 촬영 세션 상태 초기화
const resetCaptureState = () => {
    photoCount = 0;
    imagesToSend = [];
    isCaptureTimerActive = false;
    isCapturing = false;
};

// 프레임 이미지 클릭 시 촬영 화면으로 전환
document.querySelectorAll('.frame-select').forEach((imgElem) => {
    // 각 프레임 썸네일에 클릭 이벤트 등록
    imgElem.addEventListener('click', function(event) {
        const selectedFrame = event.target.getAttribute('data-value');

        // 선택 프레임 기준으로 비디오/캔버스 크기 조정
        updateLayoutForFrameSelection(selectedFrame);

        // 프레임 선택 화면 숨김
        toggleDisplay(['#frame-text', '#frame-choice1', '#frame-choice2'], 'none');

        // 카메라 UI 표시
        toggleDisplay(['#camera-text', '.camera-ui'], 'block');

        // 프레임 재선택 버튼 표시
        toggleDisplay(['.reset-frame'], 'flex');

        // 현재 선택 프레임 저장
        frame = selectedFrame;

        // 새 세션 시작이므로 상태 초기화
        resetCaptureState();
    });
});

// 프레임 다시 선택하기 버튼 클릭
document.getElementById('select-frame').addEventListener('click', () => {
    // 안내 문구 표시
    toggleDisplay(['#frame-text'], 'block');

    // 프레임 선택 목록 다시 표시
    toggleDisplay(['#frame-choice1', '#frame-choice2'], 'flex');

    // 카메라 영역 숨김
    toggleDisplay(['#camera-text', '.camera-ui', '.reset-frame'], 'none');

    // 내부 상태 초기화
    resetCaptureState();
});

// 타이머 숫자 DOM 스타일 적용
const setupTimer = (timerDiv) => {
    timerDiv.setAttribute('id', 'timer');
    timerDiv.style.position = 'absolute';
    timerDiv.style.transform = 'translate(-30%, -75%)';
    timerDiv.style.fontSize = '4rem';
    timerDiv.style.fontFamily = 'seolleimcool-SemiBold';
    timerDiv.style.color = 'white';
    timerDiv.style.zIndex = '1000';
    timerDiv.style.textShadow = '1px 1px 8px white';
    return timerDiv;
};

// 실제 1장 촬영 후 배열에 저장
const takePhotoAndSend = (fxCanvas, imagesToSend) => {
    // 비디오 DOM 참조
    const video = document.getElementById('webcam');

    // 비디오 화면은 좌우 반전 상태 유지
    video.style.transform = 'scaleX(-1)';

    // 캔버스 DOM 참조
    const canvas = document.getElementById('canvas');

    // 셔터 사운드 DOM 참조
    const shutterSound = document.getElementById('shutterSound');

    // 비디오 프레임을 glfx 텍스처로 생성
    const videoTexture = fxCanvas.texture(video);

    // glfx 필터 적용
    fxCanvas.draw(videoTexture)
        .hueSaturation(0.05, -0.01)
        .brightnessContrast(-0.02, -0.02)
        .update();

    video.style.display = 'none';
    canvas.style.display = 'block';

    // 2D 컨텍스트 생성
    const context = canvas.getContext('2d');
    context.save();

    // 좌우 반전 적용
    context.scale(-1, 1);

    // 반전 후 보정 이동
    context.translate(-canvas.width, 0);

    // 가로 프레임이면 fxCanvas를 전체 크기로 그림
    if (shot === 'horizontalShot') {
        context.drawImage(fxCanvas, 0, 0, canvas.width, canvas.height);
    }

    // 세로 프레임도 동일하게 fxCanvas 기준으로 그림
    else if (shot === 'verticalShot') {
        context.drawImage(fxCanvas, 0, 0, canvas.width, canvas.height);
    }

    // 저장했던 컨텍스트 상태 복원
    context.restore();

    // 셔터 소리 재생
    shutterSound.play();

    // 캔버스를 PNG base64로 변환
    const imageData = canvas.toDataURL('image/png');

    // 서버 전송 배열에 추가
    imagesToSend.push(imageData);

    // 1초 후 미리보기 캔버스 숨기고 비디오 복귀
    setTimeout(() => {
        canvas.style.display = 'none';
        video.style.display = 'block';
    }, 1000);
};

// 타이머 촬영 시작
const captureTimerEvent = () => {
    // 중복 타이머 실행 방지
    if (isCaptureTimerActive) {
        return;
    }

    // 타이머 촬영 시작 상태로 전환
    isCaptureTimerActive = true;

    // 촬영 버튼 영역 DOM
    const captureButton = document.getElementById('controls');
    captureButton.style.display = 'none';

    // 프레임 재선택 버튼 숨김
    document.getElementById('select-frame').style.display = 'none';

    // 기존 timer DOM이 있으면 재사용, 없으면 생성
    let timerDiv = document.getElementById('timer') || document.createElement('div');

    // 타이머를 붙일 부모 DOM
    const resetFrame = document.getElementById('reset-frame');

    // timer DOM이 처음 생성되는 경우 스타일 적용 후 append
    if (!document.getElementById('timer')) {
        resetFrame.appendChild(setupTimer(timerDiv));
    }

    // 새 타이머 세션 시작 전 상태 초기화
    photoCount = 0;
    imagesToSend = [];
    let count = 5;
    const fxCanvas = fx.canvas();
    timerDiv.textContent = count;

    // 1초마다 카운트 감소
    const timerInterval = setInterval(() => {
        count--;

        // 0보다 크면 숫자 표시, 아니면 빈칸
        timerDiv.textContent = count > 0 ? count : '';

        // 아직 4장 미만이고 카운트가 끝났으면 촬영
        if (photoCount < 4 && count === 0) {
            takePhotoAndSend(fxCanvas, imagesToSend);
            photoCount++;
            count = 6;
        }

        // 4장 촬영이 끝났으면 업로드
        else if (photoCount === 4) {
            // 타이머 종료
            clearInterval(timerInterval);
            isCaptureTimerActive = false;
            timerDiv.textContent = '';
            sendAllImages(imagesToSend, frame);
            captureButton.style.display = 'flex';
        }
    }, 1000);
};

// 수동 1장 촬영
const captureButtonEvent = () => {
    // 이미 촬영 중이면 무시
    if (isCapturing) return;

    // 촬영 버튼 영역 DOM
    const captureButton = document.getElementById('controls');
    captureButton.style.display = 'none';
    document.getElementById('select-frame').style.display = 'none';

    // glfx 캔버스 생성
    const fxCanvas = fx.canvas();

    // 새 세션 첫 장이면 전송 배열 초기화
    if (photoCount === 0) {
        imagesToSend = [];
    }

    // 4장 미만이면 촬영 진행
    if (photoCount < 4) {
        takePhotoAndSend(fxCanvas, imagesToSend);
        photoCount++;
        isCapturing = true;
        setTimeout(() => {
            isCapturing = false;
        }, 1000);
    }

    // 4장 촬영이 끝났으면 서버로 업로드
    if (photoCount === 4) {
        setTimeout(() => {
            sendAllImages(imagesToSend, frame);
            captureButton.style.display = 'flex';
        }, 1000);
    }
};

// 촬영 버튼 클릭 시 타이머 촬영 시작
document.getElementById('capture').addEventListener('click', captureTimerEvent);

// 키보드 a,b,x,y 입력 시 수동 촬영
document.addEventListener('keydown', (event) => {
    // 타이머 촬영 중이 아닐 때만 허용
    if (!isCaptureTimerActive && ['a', 'b', 'x', 'y'].includes(event.key)) {
        captureButtonEvent();
    }
});

// 중앙 토스트 알림 설정
const ToastCheck = Swal.mixin({
    toast: true,
    position: 'center-center',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer);
        toast.addEventListener('mouseleave', Swal.resumeTimer);
    }
});

// 4장 모두 서버로 전송
const sendAllImages = async (images, frame) => {
    if (frame !== '') {

        try {
            // 먼저 토큰 받기
            if (!accessToken) {
                await getGoogleAccessToken();
            }

            const response = await fetch('/mergeImages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ images, frame, accessToken })
            });

            const data = await response.json();

            if (!response.ok) {
                throw { status: response.status, data };
            }

            ToastCheck.fire({
                icon: 'success',
                title: data.message
            });

            if (data.imageName && data.googleUrl) {
                window.location.href = `/qrcode?imageName=${encodeURIComponent(data.imageName)}&googleUrl=${encodeURIComponent(data.googleUrl)}`;
            }

        } catch (error) {

            Swal.fire({
                icon: 'error',
                title: '업로드 실패',
                text: error.data?.message || '이미지 처리 중 오류 발생'
            });
        }

    } else {
        alert('Frame is not selected.');
        window.location.href = '/';
    }
};