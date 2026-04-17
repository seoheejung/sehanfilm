// 웹캠 초기화 함수
const initializeWebcam = async () => {
    try {
        // 웹캠 비디오 DOM
        const videoElement = document.getElementById('webcam');

        // 가장 먼저 기본 카메라 접근 시도
        const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                },
            audio: false
        });

        // video 태그에 스트림 연결
        videoElement.srcObject = stream;

        // 연결 확인 로그
        videoElement.onloadedmetadata = async () => {
            const track = stream.getVideoTracks()[0];

            console.log('video actual:', videoElement.videoWidth, videoElement.videoHeight);
            console.log('track settings:', track.getSettings());
            console.log('track capabilities:', track.getCapabilities?.());
            console.log('track constraints:', track.getConstraints());

            await applyManualExposure();
        };
    } catch (error) {
        // 콘솔에 상세 오류 출력
        console.error('Error accessing webcam:', error);

        // 사용자에게 오류 표시
        Swal.fire({
            icon: 'error',
            title: '웹캠 연결 실패',
            text: '카메라 권한, 브라우저 권한, 다른 프로그램 점유 여부를 확인하세요.'
        });
    }
};

// 페이지 로드 후 웹캠 초기화
initializeWebcam();
