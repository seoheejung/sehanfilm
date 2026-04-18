import express from 'express';
import moment from 'moment';
import mergeImagesWithTemplate from '../controllers/mergeImagesWithTemplateController.js';
import {
    createAuthUrl,
    validateOAuthState,
    exchangeCodeAndSaveToken,
} from '../services/googleOAuthService.js';

const router = express.Router();

// 메인 페이지
router.get('/', async (req, res, next) => {
    try {
        // 메인 화면에서 현재 인증 상태를 보여주기 위해 서버에서 확인
        res.render('webcam', {
            isGoogleDriveAuthorized: req.app.locals.isGoogleDriveAuthorized,
        });
    } catch (err) {
        next(err);
    }
});

// Google 승인 시작
router.get('/auth/google/start', async (req, res, next) => {
    try {
        const { authUrl } = await createAuthUrl();
        return res.redirect(authUrl);
    } catch (err) {
        next(err);
    }
});

// Google callback
router.get('/auth/google/callback', async (req, res, next) => {
    try {
        const code = req.query.code;
        const state = req.query.state;

        validateOAuthState(state);
        await exchangeCodeAndSaveToken(code);

        // 인증 성공했으므로 서버 상태 갱신
        req.app.locals.isGoogleDriveAuthorized = true;

        return res.send(
            '<script type="text/javascript">alert("Google Drive 1회 인증이 완료되었습니다. 이제 촬영 후 자동 업로드가 가능합니다."); window.location="/";</script>'
        );
    } catch (err) {
        req.app.locals.isGoogleDriveAuthorized = false;
        next(err);
    }
});

// QR 코드 페이지
router.get('/qrcode', (req, res, next) => {
    try {
        const imageName = req.query.imageName;
        const googleUrl = req.query.googleUrl || '';

        const imageUrl = `${process.env.HTTPIP}/2026_finalOutput/${imageName}`;

        res.render('qrcode', { imageUrl, googleUrl });
    } catch (err) {
        next(err);
    }
});

// 이미지 합성 + 업로드
router.post('/mergeImages', async (req, res, next) => {
    try {
        console.log(`[ ${moment().format('YYYY-MM-DD HH:mm:ss')} ] merge Images Start`);
        await mergeImagesWithTemplate(req, res, next);
    } catch (err) {
        next(err);
    }
});

export default router;