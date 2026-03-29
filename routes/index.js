import express from 'express';
import moment from 'moment';
import mergeImagesWithTemplate from '../controllers/mergeImagesWithTemplateController.js';

const router = express.Router();

// 메인 페이지
router.get('/', (req, res, next) => {
    try {
        res.render('webcam', {
            googleClientId: process.env.GOOGLE_DRIVE_CLIENT_ID
        });
    } catch (err) {
        next(err);
    }
});

// QR 코드 출력 페이지
router.get('/qrcode', (req, res, next) => {
    try {
        // 로컬 미리보기 이미지 파일명
        const imageName = req.query.imageName;

        // Google Drive 업로드 후 받은 다운로드 링크
        const googleUrl = req.query.googleUrl || '';

        // 로컬 미리보기 이미지 URL 생성
        const imageUrl = `${process.env.HTTPIP}/2026_finalOutput/${imageName}`;

        // QR 페이지 렌더링
        res.render('qrcode', { imageUrl, googleUrl });
    } catch (err) {
        next(err);
    }
});

// 이미지 합성 + Drive 업로드 API
router.post('/mergeImages', async (req, res, next) => {
    try {
        console.log(`[ ${moment().format('YYYY-MM-DD HH:mm:ss')} ] merge Images Start`);

        // 실제 합성 + Google Drive 업로드 처리
        await mergeImagesWithTemplate(req, res, next);
    } catch (err) {
        next(err);
    }
});

// 라우터 export
export default router;