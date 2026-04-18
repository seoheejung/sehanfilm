import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// refresh token을 로컬 파일로 저장할 경로
const TOKEN_PATH = path.join(__dirname, '..', 'data', 'google-drive-token.json');

// OAuth client 생성
const createOAuthClient = () => {
    const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_DRIVE_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
        throw new Error('GOOGLE_DRIVE_CLIENT_ID / GOOGLE_DRIVE_CLIENT_SECRET / GOOGLE_DRIVE_REDIRECT_URI 환경변수가 필요합니다.');
    }

    return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
};

// 토큰 저장 폴더 생성
const ensureTokenDirectory = async () => {
    await fs.promises.mkdir(path.dirname(TOKEN_PATH), { recursive: true });
};

// state 저장용 메모리 저장소
const oauthStateStore = new Map();

// Google 승인 URL 생성
const createAuthUrl = async () => {
    const oauth2Client = createOAuthClient();

    // CSRF 방지용 state 생성
    const state = `drive_auth_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    // 메모리에 잠시 저장
    oauthStateStore.set(state, Date.now());

    // 10분 후 자동 삭제
    setTimeout(() => {
        oauthStateStore.delete(state);
    }, 10 * 60 * 1000);

    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: ['https://www.googleapis.com/auth/drive.file'],
        state,
    });

    return { authUrl, state };
};

// callback에서 받은 state 검증
const validateOAuthState = (state) => {
    if (!state || !oauthStateStore.has(state)) {
        const error = new Error('유효하지 않은 OAuth state 입니다.');
        error.status = 400;
        throw error;
    }

    oauthStateStore.delete(state);
};

// authorization code -> token 교환 후 저장
const exchangeCodeAndSaveToken = async (code) => {
    const oauth2Client = createOAuthClient();

    if (!code) {
        const error = new Error('authorization code가 없습니다.');
        error.status = 400;
        throw error;
    }

    const { tokens } = await oauth2Client.getToken(code);

    // 자동 업로드를 계속 쓰려면 refresh token이 꼭 있어야 함
    if (!tokens.refresh_token) {
        const error = new Error('refresh token을 받지 못했습니다. Google 계정 권한을 해제한 뒤 다시 인증해야 할 수 있습니다.');
        error.status = 400;
        throw error;
    }

    await ensureTokenDirectory();

    await fs.promises.writeFile(
        TOKEN_PATH,
        JSON.stringify(tokens, null, 2),
        'utf-8'
    );

    return tokens;
};

// 저장된 토큰 읽기
const readSavedToken = async () => {
    try {
        const tokenText = await fs.promises.readFile(TOKEN_PATH, 'utf-8');
        return JSON.parse(tokenText);
    } catch (err) {
        if (err.code === 'ENOENT') {
            return null;
        }

        throw err;
    }
};

// 토큰 저장
const saveToken = async (tokenData) => {
    await ensureTokenDirectory();
    await fs.promises.writeFile(
        TOKEN_PATH,
        JSON.stringify(tokenData, null, 2),
        'utf-8'
    );
};

// 토큰 삭제
const deleteSavedToken = async () => {
    try {
        await fs.promises.unlink(TOKEN_PATH);
    } catch (err) {
        if (err.code !== 'ENOENT') {
            throw err;
        }
    }
};

// refresh token 존재 여부만 체크
const hasSavedRefreshToken = async () => {
    const token = await readSavedToken();
    return Boolean(token?.refresh_token);
};

// 저장된 refresh token으로 OAuth client 생성
const getAuthorizedOAuthClient = async () => {
    const savedToken = await readSavedToken();

    if (!savedToken?.refresh_token) {
        const { authUrl } = await createAuthUrl();

        const error = new Error('Google Drive 1회 인증이 필요합니다.');
        error.code = 'DRIVE_AUTH_REQUIRED';
        error.status = 401;
        error.authUrl = authUrl;
        throw error;
    }

    const oauth2Client = createOAuthClient();
    oauth2Client.setCredentials(savedToken);

    // access token 재발급 결과를 파일에 반영
    oauth2Client.on('tokens', async (tokens) => {
        try {
            const latestSavedToken = await readSavedToken();

            const mergedToken = {
                ...latestSavedToken,
                ...tokens,
                refresh_token: tokens.refresh_token || latestSavedToken?.refresh_token,
            };

            await saveToken(mergedToken);
        } catch (err) {
            console.error('Failed to persist refreshed Google token:', err);
        }
    });

    return oauth2Client;
};

// 저장된 refresh token이 실제 사용 가능한지 검증
const validateSavedRefreshToken = async () => {
    const savedToken = await readSavedToken();

    if (!savedToken?.refresh_token) {
        return {
            valid: false,
            reason: 'NO_REFRESH_TOKEN',
        };
    }

    try {
        const oauth2Client = await getAuthorizedOAuthClient();

        // 실제 access token 발급 시도
        const accessTokenResponse = await oauth2Client.getAccessToken();
        const accessToken = accessTokenResponse?.token;

        if (!accessToken) {
            await deleteSavedToken();
            return {
                valid: false,
                reason: 'ACCESS_TOKEN_NOT_ISSUED',
            };
        }

        return {
            valid: true,
            reason: 'OK',
        };
    } catch (err) {
        const rawMessage = err?.response?.data?.error || err?.message || '';
        const message = String(rawMessage);

        // refresh token이 죽은 경우 정리
        if (
            message.includes('invalid_grant') ||
            message.includes('unauthorized_client') ||
            err?.code === 401
        ) {
            await deleteSavedToken();

            return {
                valid: false,
                reason: 'INVALID_REFRESH_TOKEN',
            };
        }

        // 네트워크 장애나 일시 오류는 토큰 폐기 안 함
        return {
            valid: false,
            reason: 'VALIDATION_FAILED_TEMPORARY',
            error: err,
        };
    }
};

export {
    TOKEN_PATH,
    createOAuthClient,
    createAuthUrl,
    validateOAuthState,
    exchangeCodeAndSaveToken,
    readSavedToken,
    saveToken,
    hasSavedRefreshToken,
    getAuthorizedOAuthClient,
    validateSavedRefreshToken,
    deleteSavedToken,
};