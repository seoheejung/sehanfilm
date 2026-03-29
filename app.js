import express from 'express';
import routes from './routes/index.js';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

app.use('/', routes);

// 공통 에러 핸들러
app.use((err, req, res, next) => {
    // 서버 콘솔에 전체 스택 로그 출력
    console.error(err.stack);

    // API 요청인지 판별
    const wantsJson =
        req.originalUrl.startsWith('/mergeImages') ||
        req.originalUrl.startsWith('/auth/') ||
        req.headers.accept?.includes('application/json');

    // API 요청이면 JSON 응답
    if (wantsJson) {
        return res.status(500).json({
            message: err.message || '서버에서 에러가 발생했습니다.'
        });
    }

    // 페이지 요청이면 alert 후 메인으로 이동
    return res.status(500).send(
        '<script type="text/javascript">alert("서버에서 에러가 발생했습니다. 확인을 누르면 메인 페이지로 이동합니다."); window.location="/";</script>'
    );
});

// 처리되지 않은 Promise rejection 로그
process.on('unhandledRejection', (reason, promise) => {
    // 어느 Promise에서 실패했는지 출력
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// 서버 시작
app.listen(process.env.HTTPPORT, () => {
    console.log(`Server started on port ${process.env.HTTPPORT} : http://localhost:${process.env.HTTPPORT}`);
});
