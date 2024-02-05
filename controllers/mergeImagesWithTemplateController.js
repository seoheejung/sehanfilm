const fs = require('fs');
const {shots, overlay} = require('../config/overlayPositions.js');
const sharp = require('sharp');
const moment = require('moment');

const mergeImagesWithTemplateController =  async (req, res, next) => {
    const imagesData = req.body.images;
    const frameData = req.body.frame;

    // 템플릿 이미지 로드
    const templatePath = `./public/image/${frameData}/frame.jpg`;
    console.log(templatePath)
    const template = sharp(templatePath);

    // 1차 이미지
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

    // 템플릿 이미지 위에 이미지들을 1차 합성
    const mergedImageBuffer = await template
        .composite(imageOverlays)
        .toBuffer();
    let outputPathUploads = '';
    // 1차 합성된 이미지 저장
    const uploadsImageName = `sehanFilm_${moment().format('YYMMDD_HHmmss')}.png`;
    if (frameData !== 'film_frame_h' && frameData !== 'film_frame_v') {
        outputPathUploads = `./public/uploads/${uploadsImageName}`;
    } else {
        outputPathUploads = `./public/merged/${uploadsImageName}`;
    }
    await fs.promises.writeFile(outputPathUploads, mergedImageBuffer);

    // 2차 이미지
    let mergedImageName = '';
    if (frameData !== 'film_frame_h' && frameData !== 'film_frame_v') {
        let layerPosition = overlay[frameData];
        const overlayImage = `./public/image/${frameData}/overlay.png`; // 오버레이할 이미지 경로

        // 최종 이미지 저장
        mergedImageName = `sehanFilm_${moment().format('YYMMDD_HHmmss')}.png`;
        const outputPathMerged = `./public/merged/${mergedImageName}`;

        // 이미 합성된 기본 이미지 로드
        let compositeImage = sharp(outputPathUploads);

        // 오버레이 이미지 적용
        const overlayOptions = { 
            input: overlayImage, 
            left: layerPosition.left, 
            top: layerPosition.top 
        };

        // 오버레이 이미지를 기본 이미지에 합성
        compositeImage = await compositeImage.composite([overlayOptions]).toBuffer();


        // 최종 이미지 파일 저장
        await fs.promises.writeFile(outputPathMerged, compositeImage);
    } else {
        mergedImageName = uploadsImageName;
    }

    console.log(`[ ${moment().format("YYYY-MM-DD hh:mm:ss")} ] ${mergedImageName} merged complete`)
    res.json({ message: 'All images saved successfully!', imageName: mergedImageName });
};

module.exports = {
    mergeImagesWithTemplate: mergeImagesWithTemplateController
};
