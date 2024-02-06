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
app.use(express.json({ limit: '50mb' })); // JSON 본문 파싱을 위한 설정
app.use(express.static('public'));
app.use('/', routes);
app.use('finalOutput', express.static(path.join(__dirname, 'finalOutput')));
app.use('firstOutput', express.static(path.join(__dirname, 'firstOutput')));

// 에러 핸들링 미들웨어
app.use((err, req, res, next) => {
    console.error(err.stack); // 서버 콘솔에 에러 로그를 출력
    res.status(500).send('<script type="text/javascript">alert("서버에서 에러가 발생했습니다. 확인을 누르면 메인 페이지로 이동합니다."); window.location="/";</script>');
});

// 서버 종료를 방지하기 위해 unhandledRejection 이벤트 처리
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Application specific logging, throwing an error, or other logic here
});

app.listen(process.env.PORT, () => {
    console.log(`Server started on port ${process.env.PORT} : http://localhost:${process.env.PORT}`);
});
