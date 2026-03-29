import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMP_DIR = path.join(__dirname, '..', 'data');
// Google Drive 업로드 URL
const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id';
// Google Drive 권한 부여 URL 생성
const getDrivePermissionUrl = (fileId) =>
    `https://www.googleapis.com/drive/v3/files/${fileId}/permissions`;
// Google Drive 파일 정보 조회 URL 생성
const getDriveFileUrl = (fileId) =>
    `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,webViewLink,webContentLink`;

// 임시 폴더 보장
const ensureTempDir = async () => {
    await fs.promises.mkdir(TEMP_DIR, { recursive: true });
};

// access token 존재 여부만 확인
const isDriveAuthorized = (accessToken) => {
    return Boolean(accessToken);
};

// multipart/related 업로드 바디 생성
const buildMultipartBody = ({ boundary, metadata, buffer, mimeType }) => {
    // 메타데이터 파트
    const metadataPart =
        `--${boundary}\r\n` +
        `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
        `${JSON.stringify(metadata)}\r\n`;

    // 바이너리 파일 파트 헤더
    const fileHeaderPart =
        `--${boundary}\r\n` +
        `Content-Type: ${mimeType}\r\n\r\n`;

    // 마지막 boundary
    const endPart = `\r\n--${boundary}--`;

    // 문자열 파트 + 바이너리 버퍼를 하나로 합침
    return Buffer.concat([
        Buffer.from(metadataPart, 'utf-8'),
        Buffer.from(fileHeaderPart, 'utf-8'),
        buffer,
        Buffer.from(endPart, 'utf-8'),
    ]);
};

// Google Drive 업로드
const uploadImageBuffer = async ({
    accessToken,
    buffer,
    fileName,
    mimeType = 'image/png'
}) => {
    // access token 없으면 인증 안 된 상태
    if (!accessToken) {
        const error = new Error('Google Drive 인증 토큰이 없습니다.');
        error.code = 'DRIVE_AUTH_REQUIRED';
        throw error;
    }

    // 업로드 대상 폴더 ID 읽기
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    // 폴더 ID 없으면 실패
    if (!folderId) {
        throw new Error('GOOGLE_DRIVE_FOLDER_ID 환경변수가 설정되지 않았습니다.');
    }

    // multipart 경계 문자열 생성
    const boundary = `sehanFilmBoundary_${Date.now()}`;

    // Drive 파일 메타데이터
    const metadata = {
        name: fileName,
        parents: [folderId],
    };

    // multipart body 생성
    const multipartBody = buildMultipartBody({
        boundary,
        metadata,
        buffer,
        mimeType,
    });

    // 1차: Drive 파일 업로드
    const uploadResponse = await fetch(DRIVE_UPLOAD_URL, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartBody,
    });

    // 업로드 실패 시 본문까지 읽어서 에러에 포함
    if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        const error = new Error(`Google Drive 업로드 실패: ${errorText}`);
        error.status = uploadResponse.status;
        throw error;
    }

    // 업로드 결과 JSON 파싱
    const uploadResult = await uploadResponse.json();

    // 생성된 파일 ID 추출
    const fileId = uploadResult.id;

    // 2차: anyone reader 권한 부여
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

    // 권한 부여 실패 시 에러
    if (!permissionResponse.ok) {
        const errorText = await permissionResponse.text();
        const error = new Error(`Google Drive 권한 부여 실패: ${errorText}`);
        error.status = permissionResponse.status;
        throw error;
    }

    // 3차: 공유 링크 조회
    const fileResponse = await fetch(getDriveFileUrl(fileId), {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });

    // 파일 정보 조회 실패 시 에러
    if (!fileResponse.ok) {
        const errorText = await fileResponse.text();
        const error = new Error(`Google Drive 파일 정보 조회 실패: ${errorText}`);
        error.status = fileResponse.status;
        throw error;
    }

    // 파일 정보 JSON 파싱
    const fileResult = await fileResponse.json();

    // QR 생성과 다운로드에 필요한 정보 반환
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
    isDriveAuthorized,
    uploadImageBuffer,
};