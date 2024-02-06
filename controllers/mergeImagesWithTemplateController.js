import { shots, overlay } from '../config/overlayPositions.js';
import fs from 'fs';
import sharp from 'sharp';
import moment from 'moment';

const mergeImagesWithTemplateController =  async (req, res, next) => {
    const imagesData = req.body.images;
    const frameData = req.body.frame;
    const ImageName = `sehanFilm_${moment().format('YYMMDD_HHmmss')}.png`;

    // 템플릿 이미지 로드
    const templatePath = `./public/image/${frameData}/frame.jpg`;
    const template = sharp(templatePath);

    /* 1차 이미지 */
    // 템플릿 상에 각 이미지를 배치할 위치 정의
    let shotPositions = shots[frameData];

    // 업로드된 base64 이미지 데이터를 버퍼로 변환하여 오버레이 배열 생성
    const imageOverlays = imagesData.map((data, index) => {
        const base64Data = data.replace(/^data:image\/png;base64,/, "");
        const imgBuffer = Buffer.from(base64Data, 'base64');
        return {
            input: imgBuffer,
            left: shotPositions[index].left,
            top: shotPositions[index].top
        };
    });

    // 1차 합성 이미지 생성
    const mergedImageBuffer = await template.composite(imageOverlays).toBuffer();
    const firstOutputPath = `./public/${frameData !== 'film_frame_h' && frameData !== 'film_frame_v' ? 'firstOutput' : 'finalOutput'}/${ImageName}`;

    // 1차 합성된 이미지 저장
    await fs.promises.writeFile(firstOutputPath, mergedImageBuffer);

    // 2차 이미지 (1차 생성된 이미지 위에 png 파일 오버레이)
    if (frameData !== 'film_frame_h' && frameData !== 'film_frame_v') {
        const overlayImage = `./public/image/${frameData}/overlay.png`;
        const finalOutputPath = `./public/finalOutput/${ImageName}`;
        
        // 이미 합성된 기본 이미지 로드
        let layerPosition = overlay[frameData];
        let compositeImage = sharp(firstOutputPath);

        // 오버레이 이미지를 기본 이미지에 합성
        const overlayOptions = { 
            input: overlayImage, 
            left: layerPosition.left, 
            top: layerPosition.top 
        };
        compositeImage = await compositeImage.composite([overlayOptions]).toBuffer();

        // sharp 캐시 비활성화
        sharp.cache(false);

        // 최종 이미지 파일 저장
        await fs.promises.writeFile(finalOutputPath, compositeImage)
        .then(() => {
            // 임시 파일이 필요한 경우에만 삭제
            fs.unlink(firstOutputPath, err => {
                if (err) {
                    console.error(`Error while deleting file ${firstOutputPath}:`, err);
                }
            });
        });
    }

    console.log(`[ ${moment().format("YYYY-MM-DD hh:mm:ss")} ] ${ImageName} merged complete`)
    res.json({ message: 'All images saved successfully!', imageName: ImageName });
};

export default mergeImagesWithTemplateController;