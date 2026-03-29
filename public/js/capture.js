// 현재 선택된 프레임 값
let frame = '';

// 현재 촬영 방향 상태
let shot = '';

// 가로 프레임 비디오/캔버스 크기
const h_value_1 = 735;
const h_value_2 = 551;

// 세로 프레임 비디오/캔버스 크기
const v_value_1 = 759;
const v_value_2 = 569;

// 촬영 상태
let photoCount = 0;
let imagesToSend = [];
let isCaptureTimerActive = false;
let isCapturing = false;

// 프레임 선택에 맞게 비디오/캔버스 크기 변경
const updateLayoutForFrameSelection = (frameValue) => {
    const video = document.getElementById('webcam');
    const canvas = document.getElementById('canvas');

    if (frameValue.endsWith('_h')) {
        shot = 'horizontalShot';

        video.width = h_value_1;
        video.height = h_value_2;

        canvas.width = h_value_1;
        canvas.height = h_value_2;

        video.style.objectFit = 'fill';
    } else if (frameValue.endsWith('_v')) {
        shot = 'verticalShot';

        video.style.objectFit = 'cover';

        video.width = v_value_2;
        video.height = v_value_1;

        canvas.width = v_value_2;
        canvas.height = v_value_1;
    }
};

// 공통 display 제어
const toggleDisplay = (elements, displayStyle) => {
    elements.forEach((element) => {
        const domElement = document.querySelector(element);

        if (domElement) {
            domElement.style.display = displayStyle;
        }
    });
};

// 촬영 상태 초기화
const resetCaptureState = () => {
    photoCount = 0;
    imagesToSend = [];
    isCaptureTimerActive = false;
    isCapturing = false;
};

// 프레임 선택 클릭
document.querySelectorAll('.frame-select').forEach((imgElem) => {
    imgElem.addEventListener('click', function(event) {
        const selectedFrame = event.target.getAttribute('data-value');

        updateLayoutForFrameSelection(selectedFrame);

        toggleDisplay(['#frame-text', '#frame-choice1', '#frame-choice2'], 'none');
        toggleDisplay(['#camera-text', '.camera-ui'], 'block');
        toggleDisplay(['.reset-frame'], 'flex');

        frame = selectedFrame;
        resetCaptureState();
    });
});

// 프레임 다시 선택
document.getElementById('select-frame').addEventListener('click', () => {
    toggleDisplay(['#frame-text'], 'block');
    toggleDisplay(['#frame-choice1', '#frame-choice2'], 'flex');
    toggleDisplay(['#camera-text', '.camera-ui', '.reset-frame'], 'none');

    resetCaptureState();
});

// 타이머 숫자 UI 설정
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

// 실제 1장 촬영
const takePhotoAndSend = (fxCanvas, imagesToSend) => {
    const video = document.getElementById('webcam');
    video.style.transform = 'scaleX(-1)';

    const canvas = document.getElementById('canvas');
    const shutterSound = document.getElementById('shutterSound');

    const videoTexture = fxCanvas.texture(video);

    fxCanvas.draw(videoTexture)
        .hueSaturation(0.05, -0.01)
        .brightnessContrast(-0.02, -0.02)
        .update();

    video.style.display = 'none';
    canvas.style.display = 'block';

    const context = canvas.getContext('2d');
    context.save();

    context.scale(-1, 1);
    context.translate(-canvas.width, 0);

    if (shot === 'horizontalShot' || shot === 'verticalShot') {
        context.drawImage(fxCanvas, 0, 0, canvas.width, canvas.height);
    }

    context.restore();

    shutterSound.play();

    const imageData = canvas.toDataURL('image/png');
    imagesToSend.push(imageData);

    setTimeout(() => {
        canvas.style.display = 'none';
        video.style.display = 'block';
    }, 1000);
};

// 타이머 촬영
const captureTimerEvent = () => {
    if (isCaptureTimerActive) {
        return;
    }

    isCaptureTimerActive = true;

    const captureButton = document.getElementById('controls');
    captureButton.style.display = 'none';

    document.getElementById('select-frame').style.display = 'none';

    let timerDiv = document.getElementById('timer') || document.createElement('div');
    const resetFrame = document.getElementById('reset-frame');

    if (!document.getElementById('timer')) {
        resetFrame.appendChild(setupTimer(timerDiv));
    }

    photoCount = 0;
    imagesToSend = [];
    let count = 5;

    const fxCanvas = fx.canvas();
    timerDiv.textContent = count;

    const timerInterval = setInterval(() => {
        count--;
        timerDiv.textContent = count > 0 ? count : '';

        if (photoCount < 4 && count === 0) {
            takePhotoAndSend(fxCanvas, imagesToSend);
            photoCount++;
            count = 6;
        } else if (photoCount === 4) {
            clearInterval(timerInterval);
            isCaptureTimerActive = false;
            timerDiv.textContent = '';
            sendAllImages(imagesToSend, frame);
            captureButton.style.display = 'flex';
        }
    }, 1000);
};

// 수동 촬영
const captureButtonEvent = () => {
    if (isCapturing) return;

    const captureButton = document.getElementById('controls');
    captureButton.style.display = 'none';
    document.getElementById('select-frame').style.display = 'none';

    const fxCanvas = fx.canvas();

    if (photoCount === 0) {
        imagesToSend = [];
    }

    if (photoCount < 4) {
        takePhotoAndSend(fxCanvas, imagesToSend);
        photoCount++;
        isCapturing = true;

        setTimeout(() => {
            isCapturing = false;
        }, 1000);
    }

    if (photoCount === 4) {
        setTimeout(() => {
            sendAllImages(imagesToSend, frame);
            captureButton.style.display = 'flex';
        }, 1000);
    }
};

// 촬영 버튼 클릭
document.getElementById('capture').addEventListener('click', captureTimerEvent);

// 키보드 a,b,x,y로 수동 촬영
document.addEventListener('keydown', (event) => {
    if (!isCaptureTimerActive && ['a', 'b', 'x', 'y'].includes(event.key)) {
        captureButtonEvent();
    }
});

// 중앙 토스트
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

// 1회 인증 필요 시 인증 페이지로 이동
const redirectToGoogleAuth = (authUrl) => {
    Swal.fire({
        icon: 'warning',
        title: 'Google Drive 1회 인증 필요',
        text: '최초 1회 승인 후 다시 촬영하면 자동 업로드됩니다.'
    }).then(() => {
        if (authUrl) {
            window.location.href = authUrl;
        }
    });
};

// 4장 모두 서버로 전송
const sendAllImages = async (images, frame) => {
    if (frame === '') {
        alert('Frame is not selected.');
        window.location.href = '/';
        return;
    }

    // 이제 브라우저는 access token을 직접 받지 않음
    // 서버가 저장한 refresh token으로 업로드함
    try {
        const response = await fetch('/mergeImages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ images, frame })
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
        // 아직 1회 인증이 안 된 경우
        if (error.status === 401 && error.data?.authUrl) {
            redirectToGoogleAuth(error.data.authUrl);
            return;
        }

        Swal.fire({
            icon: 'error',
            title: '업로드 실패',
            text: error.data?.message || '이미지 처리 중 오류 발생'
        });
    }
};