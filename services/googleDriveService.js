import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getAuthorizedOAuthClient } from './googleOAuthService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMP_DIR = path.join(__dirname, '..', 'data');

// Google Drive multipart 업로드 URL
const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id';

// 파일 권한 부여 URL
const getDrivePermissionUrl = (fileId) =>
    `https://www.googleapis.com/drive/v3/files/${fileId}/permissions`;

// 파일 정보 조회 URL
const getDriveFileUrl = (fileId) =>
    `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,webViewLink,webContentLink`;

// data 폴더 보장
const ensureTempDir = async () => {
    await fs.promises.mkdir(TEMP_DIR, { recursive: true });
};

// multipart body 생성
const buildMultipartBody = ({ boundary, metadata, buffer, mimeType }) => {
    const metadataPart =
        `--${boundary}\r\n` +
        `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
        `${JSON.stringify(metadata)}\r\n`;

    const fileHeaderPart =
        `--${boundary}\r\n` +
        `Content-Type: ${mimeType}\r\n\r\n`;

    const endPart = `\r\n--${boundary}--`;

    return Buffer.concat([
        Buffer.from(metadataPart, 'utf-8'),
        Buffer.from(fileHeaderPart, 'utf-8'),
        buffer,
        Buffer.from(endPart, 'utf-8'),
    ]);
};

// 저장된 refresh token으로 access token을 갱신해서 업로드
const uploadImageBuffer = async ({
    buffer,
    fileName,
    mimeType = 'image/png'
}) => {
    // 저장된 refresh token 기반 OAuth client 가져오기
    const oauth2Client = await getAuthorizedOAuthClient();

    // 현재 시점 access token 발급/갱신
    const accessTokenResponse = await oauth2Client.getAccessToken();
    const accessToken = accessTokenResponse?.token;

    if (!accessToken) {
        throw new Error('Google Drive access token 발급에 실패했습니다.');
    }

    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    if (!folderId) {
        throw new Error('GOOGLE_DRIVE_FOLDER_ID 환경변수가 설정되지 않았습니다.');
    }

    const boundary = `sehanFilmBoundary_${Date.now()}`;

    const metadata = {
        name: fileName,
        parents: [folderId],
    };

    const multipartBody = buildMultipartBody({
        boundary,
        metadata,
        buffer,
        mimeType,
    });

    // 1. 파일 업로드
    const uploadResponse = await fetch(DRIVE_UPLOAD_URL, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartBody,
    });

    if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        const error = new Error(`Google Drive 업로드 실패: ${errorText}`);
        error.status = uploadResponse.status;
        throw error;
    }

    const uploadResult = await uploadResponse.json();
    const fileId = uploadResult.id;

    // 2. 누구나 읽기 가능 권한 부여
    const permissionResponse = await fetch(getDrivePermissionUrl(fileId), {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            role: 'reader',
            type: 'anyone',
        }),
    });

    if (!permissionResponse.ok) {
        const errorText = await permissionResponse.text();
        const error = new Error(`Google Drive 권한 부여 실패: ${errorText}`);
        error.status = permissionResponse.status;
        throw error;
    }

    // 3. 다운로드/보기 링크 조회
    const fileResponse = await fetch(getDriveFileUrl(fileId), {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });

    if (!fileResponse.ok) {
        const errorText = await fileResponse.text();
        const error = new Error(`Google Drive 파일 정보 조회 실패: ${errorText}`);
        error.status = fileResponse.status;
        throw error;
    }

    const fileResult = await fileResponse.json();

    return {
        fileId: fileResult.id,
        webViewLink: fileResult.webViewLink,
        webContentLink: fileResult.webContentLink,
        downloadUrl:
            fileResult.webContentLink ||
            `https://drive.google.com/uc?export=download&id=${fileResult.id}`,
    };
};

export {
    ensureTempDir,
    uploadImageBuffer,
};