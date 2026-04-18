import { shots, overlay } from '../config/overlayPositions.js';
import fs from 'fs';
import sharp from 'sharp';
import moment from 'moment';
import path from 'path';
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
    'dongbak_shots',
]);

// 프레임별 필요 촬영 장수
const FRAME_IMAGE_COUNT = {
    film_frame_v: 4,
    film_frame_h: 4,
    gosim_frame_v: 4,
    gosim_frame_h: 4,
    lovekeykey_frame_v: 4,
    lovekeykey_frame_h: 4,
    dongbak_shots: 3,
};

// overlay를 실제로 사용하는 프레임만 추가 합성
const FRAMES_WITHOUT_OVERLAY = new Set([
    'film_frame_h',
    'film_frame_v',
]);

// 요청 유효성 검사
const ensureValidRequest = (imagesData, frameData) => {
    if (!FRAME_TYPES.has(frameData)) {
        const error = new Error('지원하지 않는 프레임입니다.');
        error.status = 400;
        throw error;
    }

    const requiredImageCount = FRAME_IMAGE_COUNT[frameData];

    if (!Array.isArray(imagesData) || imagesData.length !== requiredImageCount) {
        const error = new Error(`이미지는 ${requiredImageCount}장이어야 합니다.`);
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
    // 업로드 실패 시에도 어떤 파일이 저장됐는지 추적하기 위한 preview 경로
    let previewPath = null;

    // 응답/재시도에 사용할 이미지 이름
    let imageName = '';

    try {
        const { images: imagesData, frame: frameData, isMerge = true, imageName: retryImageName } = req.body;

        // 합성 없이 재업로드만 수행하는 경우
        if (isMerge === false) {
            if (!retryImageName) {
                const error = new Error('재업로드할 이미지 이름이 없습니다.');
                error.status = 400;
                error.previewSaved = false;
                error.imageName = null;
                throw error;
            }

            previewPath = path.join('./public/2026_finalOutput', retryImageName);
            imageName = retryImageName;

            // 저장된 preview 파일 존재 여부 확인
            await fs.promises.access(previewPath);

            // 저장된 preview 파일을 읽어서 업로드만 다시 시도
            const previewBuffer = await fs.promises.readFile(previewPath);

            const driveFile = await uploadImageBuffer({
                buffer: previewBuffer,
                fileName: imageName,
                mimeType: 'image/png',
                app: req.app,
            });

            console.log(`[ ${moment().format('YYYY-MM-DD HH:mm:ss')} ] ${imageName} retry upload complete`);

            return res.json({
                message: 'Google Drive 재업로드가 완료되었습니다.',
                imageName,
                fileId: driveFile.fileId,
                googleUrl: driveFile.downloadUrl
            });
        }

        // 요청 유효성 검사
        ensureValidRequest(imagesData, frameData);

        // 결과 이미지 이름 생성
        imageName = `sehanDongbak_${moment().format('YYMMDD_HHmmss')}_${randomUUID()}.png`;

        // 프레임 원본 이미지 경로 선택
        const templatePath =
            frameData === 'dongbak_shots'
                ? `./public/image/${frameData}/frame_small.png`
                : `./public/image/${frameData}/frame.jpg`;

        const template = sharp(templatePath);
        const shotPositions = shots[frameData];

        // 프레임 좌표 설정 검증
        if (!Array.isArray(shotPositions) || shotPositions.length !== FRAME_IMAGE_COUNT[frameData]) {
            const error = new Error('프레임 좌표 설정이 올바르지 않습니다.');
            error.status = 500;
            throw error;
        }

        // 촬영 이미지를 프레임 좌표에 맞게 합성용 데이터로 변환
        const imageOverlays = await Promise.all(
            imagesData.map(async (data, index) => {
                const resizedBuffer = frameData === 'dongbak_shots'
                    ? await sharp(decodeImage(data))
                        .resize(822, 654)
                        .png()
                        .toBuffer()
                    : decodeImage(data);

                return {
                    input: resizedBuffer,
                    left: shotPositions[index].left,
                    top: shotPositions[index].top
                };
            })
        );

        // 1차 합성
        const mergedImageBuffer = await template.composite(imageOverlays).toBuffer();

        let finalImageBuffer = mergedImageBuffer;

        // overlay가 필요한 프레임만 2차 합성
        if (!FRAMES_WITHOUT_OVERLAY.has(frameData)) {
            const overlayImage =
                frameData === 'dongbak_shots'
                    ? `./public/image/${frameData}/overlay_small.png`
                    : `./public/image/${frameData}/overlay.png`;

            const layerPosition = overlay[frameData];

            // overlay 좌표 설정 검증
            if (!layerPosition || typeof layerPosition.left !== 'number' || typeof layerPosition.top !== 'number') {
                const error = new Error('오버레이 좌표 설정이 올바르지 않습니다.');
                error.status = 500;
                throw error;
            }

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
        previewPath = `./public/2026_finalOutput/${imageName}`;
        await savePreviewImage(previewPath, finalImageBuffer);

        // 서버가 저장한 refresh token으로 자동 업로드
        const driveFile = await uploadImageBuffer({
            buffer: finalImageBuffer,
            fileName: imageName,
            mimeType: 'image/png',
            app: req.app,
        });

        console.log(`[ ${moment().format('YYYY-MM-DD HH:mm:ss')} ] ${imageName} merged and uploaded complete`);

        return res.json({
            message: '이미지 합성과 Google Drive 업로드가 완료되었습니다.',
            imageName,
            fileId: driveFile.fileId,
            googleUrl: driveFile.downloadUrl
        });
    } catch (err) {
        // 글로벌 핸들러에서 응답할 수 있게 메타데이터만 보강
        if (err.code === 'DRIVE_AUTH_REQUIRED') {
            err.status = 401;
            err.message = 'Google Drive 1회 인증이 필요합니다.';
            err.authUrl = err.authUrl;
        }

        if (err.code === 'ENOENT') {
            err.status = 404;
            err.message = '재업로드할 로컬 이미지가 없습니다.';
            err.previewSaved = false;
            err.imageName = null;
        }

        if (!err.status) {
            err.status = 500;
            err.message = err.message || '이미지 합성 또는 업로드 중 서버 오류가 발생했습니다.';
        }

        // 프론트 재시도 판단에 필요한 값 부착
        if (typeof err.previewSaved === 'undefined') {
            err.previewSaved = Boolean(previewPath);
        }

        if (typeof err.imageName === 'undefined') {
            err.imageName = previewPath ? imageName : null;
        }

        return next(err);
    }
};

export default mergeImagesWithTemplateController;