let frame = 'frame_2.jpg';

document.querySelectorAll('input[name="frame"]').forEach((elem) => {
    elem.addEventListener("click", function(event) {
        document.getElementById("frame-text").style.display = "none";
        document.querySelector(".frame-choice").style.display = "none";
        document.getElementById("camera-text").style.display = "block";
        document.querySelector(".camera-ui").style.display = "block";
        document.querySelector(".reset-frame").style.display = "flex";

        frame = this.value;
    });
});

document.getElementById('select-frame').addEventListener('click', () => {
    document.getElementById("frame-text").style.display = "block";
    document.querySelector(".frame-choice").style.display = "flex";
    document.getElementById("camera-text").style.display = "none";
    document.querySelector(".camera-ui").style.display = "none";
    document.querySelector(".reset-frame").style.display = "none";
});

document.getElementById('capture').addEventListener('click', () => {
    let count = 5; // 타이머를 5초로 설정
    let timerDiv = document.getElementById('timer') || document.createElement('div');
    let photoCount = 0; // 찍은 사진의 수를 추적
    let imagesToSend = []; // 서버로 보낼 이미지 데이터를 담을 배열
    let captureButton = document.getElementById('controls'); 
    captureButton.style.display = 'none'; 
    document.getElementById('select-frame').style.display = 'none'; 
    document.getElementById('timer')
    const resetFrame = document.getElementById('reset-frame');
    if (!document.getElementById('timer')) {
        // 타이머를 표시할 요소 설정
        timerDiv.setAttribute('id', 'timer');
        timerDiv.style.position = 'absolute';
        timerDiv.style.transform = 'translate(-50%, -50%)';
        timerDiv.style.fontSize = '3rem'; 
        timerDiv.style.fontFamily = 'seolleimcool-SemiBold';
        timerDiv.style.color = 'cornflowerblue';
        timerDiv.style.zIndex = '1000';
        timerDiv.style.textShadow = '1px 1px 8px white'; 
        resetFrame.appendChild(timerDiv);
    }

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
        const canvas = document.getElementById('canvas');
        const shutterSound = document.getElementById('shutterSound');

        // 비디오에서 텍스처 생성
        let videoTexture = fxCanvas.texture(video);

        // 필터 적용
        fxCanvas.draw(videoTexture)
            .hueSaturation(0, 0.1) // saturate(110%)와 유사한 효과
            .sepia(0.1) // sepia(10%)
            .brightnessContrast(0.1, -0.1) // brightness, contrast
            .update();

        // 비디오를 숨기고 캔버스를 표시
        video.style.display = 'none';
        canvas.style.display = 'block';

        // 캔버스에 결과 그리기
        const context = canvas.getContext('2d');
        context.drawImage(fxCanvas, 0, 0, canvas.width, canvas.height);
        

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
        body: JSON.stringify({ images: images, frame: frame })
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
navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => {
        // 접근이 허용되면, 비디오 스트림을 'webcam'이라는 id를 가진 video 요소의 srcObject에 연결
        document.getElementById('webcam').srcObject = stream;
    })
    .catch(error => {
        console.error("Error accessing the webcam", error);
    });
