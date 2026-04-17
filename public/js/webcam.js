// 웹캠 초기화
const initializeWebcam = async () => {
    try {
        const videoElement = document.getElementById('webcam');

        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            },
            audio: false
        });

        videoElement.srcObject = stream;

        videoElement.onloadedmetadata = async () => {
            const track = stream.getVideoTracks()[0];

            console.log('video actual:', videoElement.videoWidth, videoElement.videoHeight);
            console.log('track settings:', track.getSettings());
            console.log('track capabilities:', track.getCapabilities?.());
            console.log('track constraints:', track.getConstraints());
        };
    } catch (error) {
        console.error('Error accessing webcam:', error);

        Swal.fire({
            icon: 'error',
            title: '웹캠 연결 실패',
            text: '카메라 권한, 브라우저 권한, 다른 프로그램 점유 여부를 확인하세요.'
        });
    }
};

initializeWebcam();