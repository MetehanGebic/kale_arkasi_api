import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { prisma } from '../core/db.js';
import { verifyToken } from '../middlewares/authMiddleware.js';

const router = Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(process.cwd(), 'public', 'avatars'))
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, req.user.id + '-' + uniqueSuffix + path.extname(file.originalname))
  }
})

const upload = multer({ storage: storage })

router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, username: true, email: true, teaBalance: true, role: true, avatarUrl: true, favoriteClub: true }
    });
    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Kullanýcý bilgileri alýnamadý.' });
  }
});

router.post('/avatar', verifyToken, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Dosya yüklenemedi.' });
    }
    const avatarUrl = '/avatars/' + req.file.filename;
    await prisma.user.update({
      where: { id: req.user.id },
      data: { avatarUrl }
    });
    res.status(200).json({ success: true, avatarUrl });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Avatar güncellenirken hata oluþtu.' });
  }
});

export default router;
