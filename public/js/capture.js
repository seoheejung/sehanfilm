// =========================
// 프레임/촬영 설정
// =========================

// 현재 선택된 프레임 값
let frame = '';

// 현재 촬영 방향 상태
let shot = '';

// 촬영 상태
let photoCount = 0;
let imagesToSend = [];
let isCaptureTimerActive = false;
let isCapturing = false;

// 재업로드용 이미지 이름 저장
let retryImageName = '';

// 업로드 중복 요청 방지 플래그
let isUploading = false;

// 프레임별 비디오/캔버스 크기
const FRAME_SIZE = {
    horizontal: {
        width: 735,
        height: 551
    },
    vertical: {
        width: 569,
        height: 759
    },
    dongbak: {
        width: 822,
        height: 654
    }
};

// 프레임별 필요 촬영 장수
const FRAME_CAPTURE_COUNT = {
    film_frame_v: 4,
    film_frame_h: 4,
    gosim_frame_v: 4,
    gosim_frame_h: 4,
    lovekeykey_frame_v: 4,
    lovekeykey_frame_h: 4,
    dongbak_shots: 3
};

// =========================
// DOM 유틸
// =========================

const getElements = () => ({
    video: document.getElementById('webcam'),
    canvas: document.getElementById('canvas'),
    captureButton: document.getElementById('controls'),
    captureTrigger: document.getElementById('capture'),
    selectFrameButton: document.getElementById('select-frame'),
    cameraUi: document.querySelector('.camera-ui'),
    resetFrame: document.querySelector('.reset-frame'),
    frameText: document.getElementById('frame-text'),
    frameChoice: document.getElementById('frame-choice'),
    frameChoice1: document.getElementById('frame-choice1'),
    frameChoice2: document.getElementById('frame-choice2'),
    loadingOverlay: document.getElementById('loadingOverlay'),
    shutterSound: document.getElementById('shutterSound')
});

// 공통 display 제어
const toggleDisplay = (selectors, displayStyle) => {
    selectors.forEach((selector) => {
        const element = document.querySelector(selector);

        if (element) {
            element.style.display = displayStyle;
        }
    });
};

// 촬영 UI 숨김
const hideCaptureUi = () => {
    const { captureButton, selectFrameButton } = getElements();

    if (captureButton) {
        captureButton.style.display = 'none';
    }

    if (selectFrameButton) {
        selectFrameButton.style.display = 'none';
    }
};

// 촬영 UI 복구
const restoreCaptureUi = () => {
    const { captureButton, selectFrameButton, cameraUi } = getElements();

    if (cameraUi) {
        cameraUi.style.display = 'block';
    }

    if (captureButton) {
        captureButton.style.display = 'flex';
    }

    if (selectFrameButton) {
        selectFrameButton.style.display = 'flex';
    }
};

// =========================
// 프레임/레이아웃 처리
// =========================

// 프레임 선택에 맞게 비디오/캔버스 크기 변경
const updateLayoutForFrameSelection = (frameValue) => {
    const { video, canvas } = getElements();

    if (!video || !canvas) {
        return;
    }

    // 공통: 미리보기 박스는 CSS style로 제어
    video.style.objectFit = 'cover';

    if (frameValue === 'dongbak_shots') {
        shot = 'dongbakShot';

        canvas.width = FRAME_SIZE.dongbak.width;
        canvas.height = FRAME_SIZE.dongbak.height;

        video.style.width = `${FRAME_SIZE.dongbak.width}px`;
        video.style.height = `${FRAME_SIZE.dongbak.height}px`;

        canvas.style.width = `${FRAME_SIZE.dongbak.width}px`;
        canvas.style.height = `${FRAME_SIZE.dongbak.height}px`;
        return;
    }

    if (frameValue.endsWith('_h')) {
        shot = 'horizontalShot';

        canvas.width = FRAME_SIZE.horizontal.width;
        canvas.height = FRAME_SIZE.horizontal.height;

        video.style.width = `${FRAME_SIZE.horizontal.width}px`;
        video.style.height = `${FRAME_SIZE.horizontal.height}px`;

        canvas.style.width = `${FRAME_SIZE.horizontal.width}px`;
        canvas.style.height = `${FRAME_SIZE.horizontal.height}px`;
        return;
    }

    if (frameValue.endsWith('_v')) {
        shot = 'verticalShot';

        canvas.width = FRAME_SIZE.vertical.width;
        canvas.height = FRAME_SIZE.vertical.height;

        video.style.width = `${FRAME_SIZE.vertical.width}px`;
        video.style.height = `${FRAME_SIZE.vertical.height}px`;

        canvas.style.width = `${FRAME_SIZE.vertical.width}px`;
        canvas.style.height = `${FRAME_SIZE.vertical.height}px`;
    }
};

// 촬영 상태 초기화
const resetCaptureState = () => {
    photoCount = 0;
    imagesToSend = [];
    isCaptureTimerActive = false;
    isCapturing = false;
};

// 프레임 선택 적용
const applySelectedFrame = (selectedFrame) => {
    updateLayoutForFrameSelection(selectedFrame);

    toggleDisplay(['#frame-text', '#frame-choice', '#frame-choice1', '#frame-choice2'], 'none');
    toggleDisplay(['.camera-ui'], 'block');
    toggleDisplay(['.reset-frame'], 'flex');

    frame = selectedFrame;
    resetCaptureState();
};

// 프레임 선택 화면으로 복귀
const resetFrameSelection = () => {
    toggleDisplay(['#frame-text'], 'block');
    toggleDisplay(['#frame-choice1', '#frame-choice2'], 'flex');
    toggleDisplay(['.camera-ui', '.reset-frame'], 'none');

    frame = '';
    shot = '';
    resetCaptureState();
};

// =========================
// 타이머/촬영 처리
// =========================

// 타이머 숫자 UI 설정
const setupTimer = (timerDiv) => {
    timerDiv.setAttribute('id', 'timer');
    timerDiv.style.position = 'absolute';
    timerDiv.style.top = '50%';
    timerDiv.style.left = '50%';
    timerDiv.style.transform = 'translate(-50%, -50%)';
    timerDiv.style.fontSize = '4rem';
    timerDiv.style.fontFamily = 'seolleimcool-SemiBold';
    timerDiv.style.color = 'white';
    timerDiv.style.zIndex = '1000';
    timerDiv.style.textShadow = '1px 1px 8px white';
    timerDiv.style.pointerEvents = 'none';

    return timerDiv;
};

// 중앙 크롭용
const drawImageCoverFromVideo = (context, video, targetWidth, targetHeight) => {
    const sourceWidth = video.videoWidth;
    const sourceHeight = video.videoHeight;

    const sourceRatio = sourceWidth / sourceHeight;
    const targetRatio = targetWidth / targetHeight;

    let sx = 0;
    let sy = 0;
    let sWidth = sourceWidth;
    let sHeight = sourceHeight;

    if (sourceRatio > targetRatio) {
        sWidth = sourceHeight * targetRatio;
        sx = (sourceWidth - sWidth) / 2;
    } else if (sourceRatio < targetRatio) {
        sHeight = sourceWidth / targetRatio;
        sy = (sourceHeight - sHeight) / 2;
    }

    context.drawImage(
        video,
        sx,
        sy,
        sWidth,
        sHeight,
        0,
        0,
        targetWidth,
        targetHeight
    );
};

// 실제 1장 촬영
const captureSinglePhoto = () => {
    const { video, canvas, shutterSound } = getElements();

    if (!video || !canvas || !shutterSound) {
        return false;
    }

    const context = canvas.getContext('2d');

    if (!video.videoWidth || !video.videoHeight) {
        console.error('video metadata not ready');
        return false;
    }

    canvas.style.display = 'block';
    video.style.display = 'none';

    // 이전 프레임 잔상 제거
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.save();

    // 좌우 반전
    context.scale(-1, 1);
    context.translate(-canvas.width, 0);

    if (
        shot === 'horizontalShot' ||
        shot === 'verticalShot' ||
        shot === 'dongbakShot'
    ) {
        drawImageCoverFromVideo(context, video, canvas.width, canvas.height);
    }

    context.restore();

    shutterSound.play();

    const imageData = canvas.toDataURL('image/png');
    imagesToSend.push(imageData);

    setTimeout(() => {
        canvas.style.display = 'none';
        video.style.display = 'block';
    }, 1000);

    return true;
};

// 현재 프레임에 필요한 촬영 수 반환
const getRequiredPhotoCount = () => {
    return FRAME_CAPTURE_COUNT[frame] || 4;
};

// 촬영 완료 후 서버 전송
const submitCapturedImages = () => {
    uploadImages({
        isMerge: true,
        images: imagesToSend,
        frame,
        loadingMessage: '사진 생성 중...'
    });
};

// 타이머 촬영
const captureTimerEvent = () => {
    if (isCaptureTimerActive) {
        return;
    }

    isCaptureTimerActive = true;
    hideCaptureUi();

    let timerDiv = document.getElementById('timer') || document.createElement('div');
    const { cameraUi } = getElements();

    if (!document.getElementById('timer') && cameraUi) {
        cameraUi.appendChild(setupTimer(timerDiv));
    }

    photoCount = 0;
    imagesToSend = [];
    let count = 5;

    timerDiv.textContent = count;

    const timerInterval = setInterval(() => {
        count--;
        timerDiv.textContent = count > 0 ? count : '';

        const requiredPhotoCount = getRequiredPhotoCount();

        if (photoCount < requiredPhotoCount && count === 0) {
            const captured = captureSinglePhoto();

            if (captured) {
                photoCount++;
            }

            count = 6;
            return;
        }

        if (photoCount === requiredPhotoCount) {
            clearInterval(timerInterval);
            isCaptureTimerActive = false;
            timerDiv.textContent = '';
            submitCapturedImages();
        }
    }, 1000);
};

// 수동 촬영
const captureButtonEvent = () => {
    if (isCapturing) {
        return;
    }

    hideCaptureUi();

    if (photoCount === 0) {
        imagesToSend = [];
    }

    const requiredPhotoCount = getRequiredPhotoCount();

    if (photoCount < requiredPhotoCount) {
        const captured = captureSinglePhoto();

        if (!captured) {
            restoreCaptureUi();
            return;
        }

        photoCount++;
        isCapturing = true;

        setTimeout(() => {
            isCapturing = false;
        }, 1000);
    }

    if (photoCount === requiredPhotoCount) {
        setTimeout(() => {
            submitCapturedImages();
        }, 1000);
    }
};

// =========================
// 업로드/UI 처리
// =========================

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

// mergeImages 공통 요청
const requestMergeImages = async (payload) => {
    const response = await fetch('/mergeImages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    let data = {};

    try {
        data = await response.json();
    } catch {
        data = {};
    }

    if (!response.ok) {
        throw {
            status: response.status,
            data
        };
    }

    return data;
};

// 성공 시 QR 페이지 이동
const redirectToQrPage = (data) => {
    if (data.imageName && data.googleUrl) {
        window.location.href = `/qrcode?imageName=${encodeURIComponent(data.imageName)}&googleUrl=${encodeURIComponent(data.googleUrl)}`;
        return true;
    }

    return false;
};

// 업로드 실패 팝업 공통 처리
const showUploadErrorModal = ({ error, images, frame }) => {
    // 합성까지 성공한 경우 재업로드용 imageName 저장
    if (error.data?.previewSaved && error.data?.imageName) {
        retryImageName = error.data.imageName;
    }

    // 업로드 실패 상황별 메시지 분기
    const errorMessage = error.data?.previewSaved
        ? '이미지 합성은 완료됐지만 Google Drive 업로드에 실패했습니다. 재시도해주세요.'
        : (error.data?.message || '이미지 처리 중 오류 발생');

    Swal.fire({
        icon: 'error',
        title: '업로드 실패',
        text: errorMessage,
        showCancelButton: true,
        confirmButtonText: '재시도',
        cancelButtonText: '취소'
    }).then((result) => {
        if (!result.isConfirmed) {
            return;
        }

        // preview가 저장된 경우: 업로드만 재시도
        if (error.data?.previewSaved && retryImageName) {
            uploadImages({
                isMerge: false,
                imageName: retryImageName,
                loadingMessage: '재업로드 중...'
            });
            return;
        }

        // preview가 없는 경우: 기존처럼 전체 재실행
        uploadImages({
            isMerge: true,
            images,
            frame,
            loadingMessage: '사진 생성 중...'
        });
    });
};

// 이미지 합성 + 업로드 / 업로드 재시도 공통 처리
const uploadImages = async ({
    isMerge,
    images = [],
    frame = '',
    imageName = '',
    loadingMessage = '사진 생성 중...'
}) => {
    // 최초 합성 요청일 때만 frame 검사
    if (isMerge && frame === '') {
        alert('Frame is not selected.');
        window.location.href = '/';
        return;
    }

    // 업로드 중에는 중복 요청 방지
    if (isUploading) {
        return;
    }

    isUploading = true;

    try {
        showLoadingOverlay(loadingMessage);

        const payload = isMerge
            ? {
                images,
                frame,
                isMerge: true
            }
            : {
                isMerge: false,
                imageName
            };

        const data = await requestMergeImages(payload);

        ToastCheck.fire({
            icon: 'success',
            title: data.message
        });

        if (redirectToQrPage(data)) {
            return;
        }

        hideLoadingOverlay();
    } catch (error) {
        hideLoadingOverlay();
        restoreCaptureUi();

        // 아직 1회 인증이 안 된 경우
        if (error.status === 401 && error.data?.authUrl) {
            redirectToGoogleAuth(error.data.authUrl);
            return;
        }

        showUploadErrorModal({ error, images, frame });
    } finally {
        isUploading = false;
    }
};

// 사진 생성/업로드 중 오버레이 표시
const showLoadingOverlay = (message = '사진 생성 중...') => {
    const { loadingOverlay, cameraUi, frameChoice } = getElements();
    const text = loadingOverlay?.querySelector('.loading-text');

    if (text) {
        text.textContent = message;
    }

    if (cameraUi) {
        cameraUi.style.display = 'none';
    }

    if (frameChoice) {
        frameChoice.style.display = 'none';
    }

    if (loadingOverlay) {
        loadingOverlay.style.display = 'flex';
    }
};

// 로딩 오버레이 숨김
const hideLoadingOverlay = () => {
    const { loadingOverlay } = getElements();

    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
};

// =========================
// 이벤트 바인딩
// =========================

// 프레임 선택 클릭
document.querySelectorAll('.frame-select').forEach((imgElem) => {
    imgElem.addEventListener('click', (event) => {
        const selectedFrame = event.target.getAttribute('data-value');
        applySelectedFrame(selectedFrame);
    });
});

// 프레임 다시 선택
const { selectFrameButton, captureTrigger } = getElements();

if (selectFrameButton) {
    selectFrameButton.addEventListener('click', resetFrameSelection);
}

// 촬영 버튼 클릭
if (captureTrigger) {
    captureTrigger.addEventListener('click', captureTimerEvent);
}

// 키보드 Enter 수동 촬영
document.addEventListener('keydown', (event) => {
    if (!isCaptureTimerActive && event.key === 'Enter') {
        captureButtonEvent();
    }
});