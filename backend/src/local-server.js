const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3001;

// CORS設定
app.use(cors());
app.use(express.json());

// アップロード用のディレクトリを作成
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer設定（ローカルファイル保存用）
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${req.body.name || 'anonymous'}_${timestamp}_${Math.random().toString(36).substring(7)}${path.extname(file.originalname)}`;
    cb(null, filename);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('画像ファイルのみアップロード可能です'));
    }
  }
});

// モックデータ
let photos = [];
const config = {
  confirmationItems: [
    {
      id: "public_agreement",
      text: "この画像をパブリックに公開することに同意します",
      required: true
    },
    {
      id: "code_of_conduct",
      text: "JAWS-UG行動規範に従うことを確認しました",
      required: true
    },
    {
      id: "auto_deletion",
      text: "30日後に自動削除されることを理解しました",
      required: true
    }
  ]
};

// API エンドポイント
app.post('/api/upload', upload.single('image'), (req, res) => {
  try {
    console.log('アップロードリクエスト受信:', {
      file: req.file ? req.file.originalname : 'なし',
      body: req.body
    });

    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        error: {
          code: 'MISSING_FILE',
          message: '画像ファイルが必要です'
        }
      });
    }

    // チェックリスト項目の検証
    let checkedItems = {};
    try {
      if (req.body.checkedItems) {
        checkedItems = JSON.parse(req.body.checkedItems);
      }
    } catch (e) {
      console.warn('チェックリスト項目の解析に失敗:', req.body.checkedItems);
    }

    const photo = {
      id: Date.now().toString(),
      filename: req.file.filename,
      originalName: req.file.originalname,
      name: req.body.name || '',
      comment: req.body.comment || '',
      uploadedAt: new Date().toISOString(),
      url: `http://localhost:${port}/uploads/${req.file.filename}`,
      checkedItems: checkedItems
    };

    photos.unshift(photo); // 新着順
    
    console.log('画像アップロード成功:', photo);
    
    res.json({ 
      success: true, 
      data: {
        id: photo.id,
        filename: photo.filename,
        url: photo.url
      }
    });
  } catch (error) {
    console.error('アップロードエラー:', error);
    res.status(500).json({ 
      success: false,
      error: {
        code: 'UPLOAD_ERROR',
        message: 'アップロードに失敗しました',
        details: error.message
      }
    });
  }
});

app.get('/api/photos', (req, res) => {
  console.log('画像一覧取得リクエスト受信:', {
    photosCount: photos.length,
    photos: photos.map(p => ({ id: p.id, name: p.name, filename: p.filename }))
  });
  
  // フロントエンドのPhoto型に合わせる
  const formattedPhotos = photos.map(photo => {
    const uploadTime = new Date(photo.uploadedAt);
    return {
      id: photo.id,
      s3Key: photo.filename, // ローカルではファイル名を使用
      uploaderName: photo.name || 'Anonymous',
      comment: photo.comment || '',
      uploadTime: photo.uploadedAt,
      uploadTimeUnix: uploadTime.getTime(),
      presignedUrl: photo.url // 直接アクセス可能なURL
    };
  });
  
  console.log('レスポンス送信:', { success: true, photosCount: formattedPhotos.length });
  
  res.json({ 
    success: true,
    photos: formattedPhotos
  });
});

app.get('/api/config', (req, res) => {
  console.log('設定取得リクエスト受信');
  
  const response = {
    success: true,
    data: config
  };
  
  console.log('設定レスポンス送信:', response);
  res.json(response);
});

// 管理者認証チェック
const validateAdmin = (req, res, next) => {
  const adminParam = req.query.admin;
  if (adminParam !== '19931124') {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Unauthorized access'
      }
    });
  }
  next();
};

// 管理者用 - 画像削除
app.delete('/api/admin/photos/:photoId', validateAdmin, (req, res) => {
  const photoId = req.params.photoId;
  console.log('管理者画像削除リクエスト受信:', photoId);
  
  const photoIndex = photos.findIndex(p => p.id === photoId);
  
  if (photoIndex === -1) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: '画像が見つかりません'
      }
    });
  }
  
  const photo = photos[photoIndex];
  
  // ローカルファイルを削除
  const filePath = path.join(uploadDir, photo.filename);
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      console.log('ローカルファイル削除成功:', filePath);
    } catch (error) {
      console.error('ローカルファイル削除エラー:', error);
    }
  }
  
  // メモリから削除
  photos.splice(photoIndex, 1);
  
  console.log('画像削除成功:', photoId);
  
  res.json({
    success: true,
    message: '画像が削除されました'
  });
});

// 管理者用 - 画像情報更新
app.patch('/api/admin/photos/:photoId', validateAdmin, (req, res) => {
  const photoId = req.params.photoId;
  const updates = req.body;
  console.log('管理者画像更新リクエスト受信:', photoId, updates);
  
  const photo = photos.find(p => p.id === photoId);
  
  if (!photo) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: '画像が見つかりません'
      }
    });
  }
  
  // メタデータ更新
  if (updates.uploaderName !== undefined) {
    photo.name = updates.uploaderName;
  }
  
  if (updates.comment !== undefined) {
    photo.comment = updates.comment;
  }
  
  // 画像回転処理（ローカル環境では実際の処理はスキップ）
  if (updates.rotation && updates.rotation !== 0) {
    console.log(`画像回転処理（モック）: ${updates.rotation}度`);
  }
  
  // レスポンス用データ作成
  const uploadTime = new Date(photo.uploadedAt);
  const responseData = {
    id: photo.id,
    uploaderName: photo.name || 'Anonymous',
    comment: photo.comment || '',
    uploadTime: photo.uploadedAt,
    uploadTimeUnix: uploadTime.getTime(),
    presignedUrl: photo.url
  };
  
  console.log('画像更新成功:', responseData);
  
  res.json({
    success: true,
    data: responseData
  });
});

// 静的ファイル配信（アップロードされた画像）
app.use('/uploads', express.static(uploadDir));

// ヘルスチェック
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(port, () => {
  console.log(`🚀 ローカルAPIサーバーが起動しました: http://localhost:${port}`);
  console.log(`📁 アップロードディレクトリ: ${uploadDir}`);
  console.log(`🔗 API エンドポイント:`);
  console.log(`   POST   /api/upload - 画像アップロード`);
  console.log(`   GET    /api/photos - 画像一覧取得`);
  console.log(`   GET    /api/config - 設定取得`);
  console.log(`   DELETE /api/admin/photos/:id?admin=19931124 - 管理者画像削除`);
  console.log(`   PATCH  /api/admin/photos/:id?admin=19931124 - 管理者画像更新`);
  console.log(`   GET    /health - ヘルスチェック`);
});