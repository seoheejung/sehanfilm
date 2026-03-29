import { shots, overlay } from '../config/overlayPositions.js';
import fs from 'fs';
import sharp from 'sharp';
import moment from 'moment';
import { randomUUID } from 'crypto';
import { uploadImageBuffer } from '../services/googleDriveService.js';

// 허용 프레임 목록
const FRAME_TYPES = new Set([
    'film_frame_v',
    'film_frame_h',
    'gosim_frame_v',
    'gosim_frame_h',
    'lovekeykey_frame_v',
    'lovekeykey_frame_h',
]);

// 요청 유효성 검사
const ensureValidRequest = (imagesData, frameData) => {
    if (!Array.isArray(imagesData) || imagesData.length !== 4) {
        const error = new Error('이미지는 4장이어야 합니다.');
        error.status = 400;
        throw error;
    }

    if (!FRAME_TYPES.has(frameData)) {
        const error = new Error('지원하지 않는 프레임입니다.');
        error.status = 400;
        throw error;
    }
};

// base64 -> Buffer 변환
const decodeImage = (data) => {
    if (typeof data !== 'string' || !data.startsWith('data:image/png;base64,')) {
        const error = new Error('PNG base64 형식이 아닙니다.');
        error.status = 400;
        throw error;
    }

    return Buffer.from(data.replace(/^data:image\/png;base64,/, ''), 'base64');
};

// QR 페이지 미리보기 이미지 저장
const savePreviewImage = async (filePath, buffer) => {
    await fs.promises.mkdir('./public/2026_finalOutput', { recursive: true });
    await fs.promises.writeFile(filePath, buffer);
};

// 메인 컨트롤러
const mergeImagesWithTemplateController = async (req, res, next) => {
    try {
        const imagesData = req.body.images;
        const frameData = req.body.frame;

        // 이제 accessToken은 브라우저에서 받지 않음
        ensureValidRequest(imagesData, frameData);

        const imageName = `sehanFilm_${moment().format('YYMMDD_HHmmss')}_${randomUUID()}.png`;

        const templatePath = `./public/image/${frameData}/frame.jpg`;
        const template = sharp(templatePath);

        const shotPositions = shots[frameData];

        const imageOverlays = imagesData.map((data, index) => ({
            input: decodeImage(data),
            left: shotPositions[index].left,
            top: shotPositions[index].top
        }));

        // 1차 합성
        const mergedImageBuffer = await template.composite(imageOverlays).toBuffer();

        let finalImageBuffer = mergedImageBuffer;

        // 필름 프레임이 아니면 overlay.png 한 번 더 덮기
        if (frameData !== 'film_frame_h' && frameData !== 'film_frame_v') {
            const overlayImage = `./public/image/${frameData}/overlay.png`;
            const layerPosition = overlay[frameData];

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

        // QR 페이지용 로컬 미리보기 저장
        const previewPath = `./public/2026_finalOutput/${imageName}`;
        await savePreviewImage(previewPath, finalImageBuffer);

        // 서버가 저장한 refresh token으로 자동 업로드
        const driveFile = await uploadImageBuffer({
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
        // 아직 1회 인증 안 된 상태
        if (err.code === 'DRIVE_AUTH_REQUIRED') {
            return res.status(401).json({
                message: 'Google Drive 1회 인증이 필요합니다.',
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