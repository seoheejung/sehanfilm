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
