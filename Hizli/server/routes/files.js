// server/routes/files.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const File = require('../models/file');

// Multer ayarları
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

// Dosya türü filtreleme
const fileFilter = (req, file, cb) => {
  const allowedFileTypes = ['image/jpeg', 'image/png', 'application/pdf'];
  if (allowedFileTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Desteklenmeyen dosya türü! Yalnızca JPEG, PNG ve PDF dosyaları yükleyebilirsiniz.'), false);
  }
};

const upload = multer({ 
  storage: storage, 
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// Dosya yükleme
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Lütfen bir dosya yükleyin' });
    }

    const newFile = new File({
      filename: req.file.filename,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: `/uploads/${req.file.filename}`
    });

    await newFile.save();
    res.status(201).json(newFile);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// Tüm dosyaları listeleme
router.get('/', async (req, res) => {
  try {
    const files = await File.find().sort({ uploadDate: -1 });
    res.json(files);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// Dosya silme
router.delete('/:id', async (req, res) => {
  try {
    const file = await File.findById(req.id);
    
    if (!file) {
      return res.status(404).json({ message: 'Dosya bulunamadı' });
    }

    // Veritabanından dosya kaydını sil
    await File.findByIdAndDelete(req.params.id);
    
    // Fiziksel dosyayı da sil
    const filePath = path.join(__dirname, '..', 'uploads', file.filename);
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error('Dosya silinirken hata oluştu:', err);
      }
    });

    res.json({ message: 'Dosya başarıyla silindi' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

module.exports = router;