import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
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

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Sadece JPEG, PNG ve WEBP formatları desteklenir.'));
  }
};

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: fileFilter 
});

router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, username: true, email: true, teaBalance: true, role: true, avatarUrl: true, favoriteClub: true }
    });
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Kullanıcı bilgileri alınamadı.' });
  }
});

router.post('/avatar', verifyToken, (req, res, next) => {
  upload.single('avatar')(req, res, function (err) {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Dosya yüklenemedi.' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (user?.avatarUrl) {
      const oldAvatarPath = path.join(process.cwd(), 'public', user.avatarUrl);
      if (fs.existsSync(oldAvatarPath)) {
        fs.unlinkSync(oldAvatarPath);
      }
    }

    const avatarUrl = '/avatars/' + req.file.filename;
    await prisma.user.update({
      where: { id: req.user.id },
      data: { avatarUrl }
    });
    res.status(200).json({ success: true, data: avatarUrl });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Avatar güncellenirken hata oluştu.' });
  }
});

export default router;
