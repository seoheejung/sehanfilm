import { shots, overlay } from '../config/overlayPositions.js';
import fs from 'fs';
import sharp from 'sharp';
import moment from 'moment';
import { randomUUID } from 'crypto';
import { uploadImageBuffer } from '../services/googleDriveService.js';

// 허용할 프레임 종류 목록
const FRAME_TYPES = new Set([
    'film_frame_v',
    'film_frame_h',
    'gosim_frame_v',
    'gosim_frame_h',
    'lovekeykey_frame_v',
    'lovekeykey_frame_h',
]);

// 요청 데이터 검증
const ensureValidRequest = (imagesData, frameData) => {
    // 이미지 배열이 아니거나 4장이 아니면 실패
    if (!Array.isArray(imagesData) || imagesData.length !== 4) {
        const error = new Error('이미지는 4장이어야 합니다.');
        error.status = 400;
        throw error;
    }

    // 허용하지 않은 프레임이면 실패
    if (!FRAME_TYPES.has(frameData)) {
        const error = new Error('지원하지 않는 프레임입니다.');
        error.status = 400;
        throw error;
    }
};

// base64 PNG 문자열을 Buffer로 변환
const decodeImage = (data) => {
    // PNG base64 접두사 형식 검사
    if (typeof data !== 'string' || !data.startsWith('data:image/png;base64,')) {
        const error = new Error('PNG base64 형식이 아닙니다.');
        error.status = 400;
        throw error;
    }

    // 접두사 제거 후 실제 바이너리 버퍼로 변환
    return Buffer.from(data.replace(/^data:image\/png;base64,/, ''), 'base64');
};

// QR 페이지에서 보여줄 로컬 미리보기 이미지 저장
const savePreviewImage = async (filePath, buffer) => {
    await fs.promises.mkdir('./public/2026_finalOutput', { recursive: true });

    // 로컬 미리보기 파일 저장
    await fs.promises.writeFile(filePath, buffer);
};

// 메인 컨트롤러
const mergeImagesWithTemplateController = async (req, res, next) => {
    try {
        // 클라이언트에서 보낸 4장 이미지 배열
        const imagesData = req.body.images;

        // 선택한 프레임 종류
        const frameData = req.body.frame;

        // 클라이언트에서 보낸 accessToken
        const accessToken = req.body.accessToken;

        // 요청 유효성 검증
        ensureValidRequest(imagesData, frameData);

        // 시간 + UUID 조합으로 충돌 없는 파일명 생성
        const imageName = `sehanFilm_${moment().format('YYMMDD_HHmmss')}_${randomUUID()}.png`;

        // 선택한 프레임 배경 이미지 경로
        const templatePath = `./public/image/${frameData}/frame.jpg`;

        // sharp로 프레임 배경 이미지 로드
        const template = sharp(templatePath);

        // 현재 프레임의 4컷 위치 정보 읽기
        const shotPositions = shots[frameData];

        // 클라이언트가 보낸 4장 이미지를 sharp composite용 배열로 변환
        const imageOverlays = imagesData.map((data, index) => ({
            // base64 이미지를 Buffer로 변환
            input: decodeImage(data),

            // 프레임 안에서 x 좌표
            left: shotPositions[index].left,

            // 프레임 안에서 y 좌표
            top: shotPositions[index].top
        }));

        // 배경 프레임 위에 4장 이미지를 합성
        const mergedImageBuffer = await template.composite(imageOverlays).toBuffer();

        // 기본 최종 버퍼는 1차 합성 결과
        let finalImageBuffer = mergedImageBuffer;

        // film_frame 계열이 아니면 overlay.png를 한 번 더 덮음
        if (frameData !== 'film_frame_h' && frameData !== 'film_frame_v') {
            // 추가 오버레이 이미지 경로
            const overlayImage = `./public/image/${frameData}/overlay.png`;

            // 해당 프레임의 오버레이 좌표
            const layerPosition = overlay[frameData];

            // 2차 오버레이 합성 수행
            finalImageBuffer = await sharp(mergedImageBuffer)
                .composite([
                    {
                        input: overlayImage,
                        left: layerPosition.left,
                        top: layerPosition.top
                    }
                ])
                .toBuffer();
        }

        // QR 페이지에서 보여줄 로컬 미리보기 파일 경로
        const previewPath = `./public/2026_finalOutput/${imageName}`;

        // 미리보기 이미지 로컬 저장
        await savePreviewImage(previewPath, finalImageBuffer);

        // Google Drive에 최종 이미지 업로드
        const driveFile = await uploadImageBuffer({
            accessToken,
            buffer: finalImageBuffer,
            fileName: imageName,
            mimeType: 'image/png'
        });

        console.log(`[ ${moment().format('YYYY-MM-DD HH:mm:ss')} ] ${imageName} merged and uploaded complete`);

        return res.json({
            message: '이미지 합성과 Google Drive 업로드가 완료되었습니다.',
            imageName,
            fileId: driveFile.fileId,
            googleUrl: driveFile.downloadUrl
        });
    } catch (err) {
        // Google Drive 인증이 안 된 경우
        if (err.code === 'DRIVE_AUTH_REQUIRED') {
            return res.status(401).json({
                message: 'Google Drive 인증이 필요합니다.',
                authUrl: err.authUrl
            });
        }

        if (err.status) {
            return res.status(err.status).json({
                message: err.message
            });
        }

        return next(err);
    }
};

export default mergeImagesWithTemplateController;