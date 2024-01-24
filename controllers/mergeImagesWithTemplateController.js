const fs = require('fs');
const sharp = require('sharp');
const moment = require('moment');

const mergeImagesWithTemplateController =  async (req, res, next) => {
    const imagesData = req.body.images;
    const frameData = req.body.frame;

    // 템플릿 이미지 로드
    const templatePath = `./public/image/${frameData}`;
    const template = sharp(templatePath);

    // 템플릿 이미지의 메타데이터
    // const templateMetadata = await template.metadata();

    // 템플릿 상에 각 이미지를 배치할 위치 정의
    const positions = [
        { left: 54, top: 39 },
        { left: 866, top: 39 },
        { left: 274, top: 657 },
        { left: 1086, top: 657 },
    ];

    // 업로드된 base64 이미지 데이터를 버퍼로 변환하여 오버레이 배열 생성
    const imageOverlays = imagesData.map((data, index) => {
        const base64Data = data.replace(/^data:image\/png;base64,/, "");
        const imgBuffer = Buffer.from(base64Data, 'base64');
        return {
            input: imgBuffer,
            left: positions[index].left,
            top: positions[index].top
        };
    });

    // 템플릿 이미지 위에 이미지들을 합성
    const mergedImageBuffer = await template
        .composite(imageOverlays)
        .toBuffer();

    // 합성된 이미지 저장
    const imageName = `merged_${Date.now()}.png`;
    const outputPath = `./public/merged/${imageName}`;
    await fs.promises.writeFile(outputPath, mergedImageBuffer);

    console.log(`[ ${moment().format("YYYY-MM-DD hh:mm:ss")} ] ${imageName} merged complete`)
    res.json({ message: 'All images saved successfully!', imageName: imageName });
};

module.exports = {
    mergeImagesWithTemplate: mergeImagesWithTemplateController
};
