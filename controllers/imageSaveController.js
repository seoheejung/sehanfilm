const fs = require('fs');

const saveImagesController = async (req, res, next) => {
    try {
        const imagesData = req.body.images;
        
        // 이미지 데이터를 파일로 저장
        for (let i = 0; i < imagesData.length; i++) {
            const base64Data = imagesData[i].replace(/^data:image\/png;base64,/, "");
            const filePath = `./public/uploads/image_${Date.now()}_${i}.png`;
            
            await fs.promises.writeFile(filePath, base64Data, 'base64');
        }

        res.send({ message: 'All images saved successfully!' });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    saveImages: saveImagesController
};
