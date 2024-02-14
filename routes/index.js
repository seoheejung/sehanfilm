import express from 'express';
import moment from 'moment';
import mergeImagesWithTemplate from '../controllers/mergeImagesWithTemplateController.js';
const router = express.Router();

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
        // IP 변경 필요
        const imageUrl = `${process.env.HTTPIP}/finalOutput/${imageName}`;
        res.render('qrcode', { imageUrl: imageUrl });
    } catch (err) {
        next(err);
    }
});

router.post('/mergeImages', async (req, res, next) => {
    try {
        console.log(`[ ${moment().format("YYYY-MM-DD hh:mm:ss")} ] merge Images Start`)
        await mergeImagesWithTemplate(req, res, next);
        
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Error saving images", error: err });
    }
});

export default router;
