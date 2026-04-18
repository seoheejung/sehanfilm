const fs = require('fs');

const saveImagesController = async (req, res, next) => {
    try {
        const imagesData = req.body.images;

        const baseTime = Date.now();

        for (let i = 0; i < imagesData.length; i++) {
            const base64Data = imagesData[i].replace(/^data:image\/png;base64,/, "");
            const filePath = `./public/uploads/image_${baseTime}_${i}.png`;

            await fs.promises.writeFile(filePath, base64Data, 'base64');
        }

        res.send({ message: 'All images saved successfully!' });
    } catch (err) {
        err.status = err.status || 500;
        err.message = '이미지 저장 중 오류가 발생했습니다.';
        next(err);
    }
};

module.exports = {
    saveImages: saveImagesController
};