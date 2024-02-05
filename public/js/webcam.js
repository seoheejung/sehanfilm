let frame = '';
let shot = '';  // verticalShot : 세로, horizontalShot : 가로
const h_value_1 = 735;
const h_value_2 = 551;
const v_value_1 = 759;
const v_value_2 = 569;

const updateLayoutForFrameSelection = (frameValue) => {
    const video = document.getElementById('webcam');
    const canvas = document.getElementById('canvas');
    console.log(frameValue.endsWith('_v.jpg'))

    if (frameValue.endsWith('_h')) {
        shot = 'horizontalShot';
        video.width = h_value_1;
        video.height = h_value_2;
        canvas.width = h_value_1;
        canvas.height = h_value_2;
    } else if (frameValue.endsWith('_v')) {
        shot = 'verticalShot';
        video.style.objectFit = 'cover';
        video.width = v_value_2;
        video.height = v_value_1;
        canvas.width = v_value_2;
        canvas.height = v_value_1;
    }
}

/* frame를 선택했을 경우, 촬영 화면이 나오게 작업 */
const toggleDisplay = (elements, displayStyle) => {
    elements.forEach((element) => {
        const domElement = document.querySelector(element);
        if (domElement) {
            domElement.style.display = displayStyle;
        }
    });
}

document.querySelectorAll('.frame-select').forEach((imgElem) => {
    imgElem.addEventListener("click", function(event) {
        const selectedFrame = event.target.getAttribute('data-value');
        console.log(selectedFrame)
        updateLayoutForFrameSelection(selectedFrame);
        toggleDisplay(["#frame-text", "#frame-choice1", "#frame-choice2"], "none");
        toggleDisplay(["#camera-text", ".camera-ui"], "block");
        toggleDisplay([".reset-frame"], "flex");
        frame = selectedFrame;
    });
});

document.getElementById('select-frame').addEventListener('click', () => {
    toggleDisplay(["#frame-text"], "block");
    toggleDisplay(["#frame-choice1", "#frame-choice2"], "flex");
    toggleDisplay(["#camera-text", ".camera-ui", ".reset-frame"], "none");
});

// 타이머 스타일 설정을 위한 함수
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
}

/* 촬영 버튼을 클릭했을 경우 */
document.getElementById('capture').addEventListener('click', () => {
    let captureButton = document.getElementById('controls'); 
    captureButton.style.display = 'none'; 
    document.getElementById('select-frame').style.display = 'none'; 
    let timerDiv = document.getElementById('timer') || document.createElement('div');
    const resetFrame = document.getElementById('reset-frame');
    if (!document.getElementById('timer')) {
        resetFrame.appendChild(setupTimer(timerDiv));
    }
    
    let photoCount = 0; // 찍은 사진의 수를 추적
    let imagesToSend = []; // 서버로 보낼 이미지 데이터를 담을 배열
    let count = 5; // 타이머를 5초로 설정
    // 타이머 시작
    timerDiv.textContent = count;
    let timerInterval = setInterval(function() {
        count--;
        timerDiv.textContent = count > 0 ? count : '';
        if (photoCount < 4 && count === 0) {
            // console.log("photoCount : " + photoCount)
            takePhotoAndSend();
            photoCount++;
            count = 6; // 카운트다운 리셋
        } else if (photoCount === 4){
            clearInterval(timerInterval); // 모든 사진 촬영 완료 후 타이머 중단
            timerDiv.textContent = '';
            sendAllImages(imagesToSend, frame);
            captureButton.style.display = 'flex'; 
        }
    }, 1000);

    // glfx.js 캔버스 생성
    const fxCanvas = fx.canvas();

    const takePhotoAndSend = () => {
        const video = document.getElementById('webcam');
        video.style.transform = 'scaleX(-1)';
        const canvas = document.getElementById('canvas');
        const shutterSound = document.getElementById('shutterSound');

        // 비디오에서 텍스처 생성
        let videoTexture = fxCanvas.texture(video);

        // 필터 적용
        fxCanvas.draw(videoTexture)
            .hueSaturation(-0.05, -0.008)
            .brightnessContrast(0.08, 0.1)
            .update();

        // 비디오를 숨기고 캔버스를 표시
        video.style.display = 'none';
        canvas.style.display = 'block';

        // 캔버스에 결과 그리기
        console.log(shot)
        const context = canvas.getContext('2d');
        context.save(); // 현재 상태 저장
        context.scale(-1, 1); // x축 방향으로 좌우 반전
        context.translate(-canvas.width, 0); // 반전된 상태에서 오른쪽으로 이동하여 정상 위치에 그리기

        if (shot === 'horizontalShot') {
            context.drawImage(fxCanvas, 0, 0, canvas.width, canvas.height);
        } else if (shot === 'verticalShot') {
            // 비디오의 실제 크기
            const videoWidth = video.videoWidth;
            const videoHeight = video.videoHeight;
        
            // 캔버스에 그릴 영역의 크기
            const targetWidth = canvas.width;
            const targetHeight = canvas.height;
        
            // 캡처할 비디오의 영역 계산
            const scale = Math.min(videoWidth / targetWidth, videoHeight / targetHeight);
            const sx = (videoWidth - scale * targetWidth) / 2;
            const sy = (videoHeight - scale * targetHeight) / 2;
            const sWidth = scale * targetWidth;
            const sHeight = scale * targetHeight;
        
            // 캔버스에 비디오의 특정 부분 그리기
            context.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, targetWidth, targetHeight);
        }
        context.restore(); // 캔버스 상태 복원

        shutterSound.play(); // 사진 찍을 때 소리 재생
        const imageData = canvas.toDataURL('image/png');
        // 이미지 데이터를 배열에 추가
        imagesToSend.push(imageData);
        
        // 1초 동안 현재 화면 유지
        setTimeout(() => {
            canvas.style.display = 'none';
            video.style.display = 'block';
        }, 1000);
    }
});

const ToastCheck = Swal.mixin({
    toast: true,
    position: 'center-center',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer)
        toast.addEventListener('mouseleave', Swal.resumeTimer)
    }
})

const sendAllImages = (images, frame) => {
    console.log()
    fetch('/save-images', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ images: images, frame: frame, shot: shot })
    })
    .then(response => response.json())
    .then(data => {
        ToastCheck.fire({
            icon: 'success',
            title: data.message
        })
        if (data.imageName) {
            // 서버로부터 imagePath를 받았다면, qrcode 페이지로 이동
            window.location.href = `/qrcode?imageName=${data.imageName}`;
        } else {
            alert('Error: Image path not received');
        }
    })
    .catch(error => console.error(error));
}

// 비디오(웹캠)에 접근 요청
navigator.mediaDevices.enumerateDevices()
    .then(devices => {
        // videoinput 타입의 장치를 필터링
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        if (videoDevices.length > 0) {
            // 웹캠 선택
            const firstCamera = videoDevices[0];
            // 선택한 웹캠을 사용하여 스트림 가져오기
            return navigator.mediaDevices.getUserMedia({ 
                video: { deviceId: firstCamera.deviceId } 
            });
        } else {
            console.log('No video input devices found');
            // 첫 번째 웹캠을 사용하여 스트림 가져오기
            return navigator.mediaDevices.getUserMedia({ video: true });
        }
    })
    .then(stream => {
        // 스트림을 비디오 요소에 연결
        console.log(stream)
        document.getElementById('webcam').srcObject = stream;
    })
    .catch(error => {
        console.error("Error accessing the webcam", error);
    });
