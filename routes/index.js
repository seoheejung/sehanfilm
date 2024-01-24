const express = require('express');
const moment = require('moment');
const router = express.Router();
const { saveImages } = require('../controllers/imageSaveController');
const { mergeImagesWithTemplate } = require('../controllers/mergeImagesWithTemplateController');


router.get('/', (req, res, next) => {
    try {
        res.render('webcam')
    } catch (err) {
        next(err);
    }
});

router.get('/qrcode', (req, res, next) => {
    try {
        const imageName = req.query.imageName;
        const imageUrl = `http://${process.env.MYIP}/merged/${imageName}`;
        res.render('qrcode', { imageUrl: imageUrl });
    } catch (err) {
        next(err);
    }
});

router.post('/save-images', async (req, res, next) => {
    try {
        console.log(`[ ${moment().format("YYYY-MM-DD hh:mm:ss")} ] save-images Start`)
        await mergeImagesWithTemplate(req, res, next);
        
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Error saving images", error: err });
    }
});

module.exports = router;
