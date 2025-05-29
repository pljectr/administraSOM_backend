import express from 'express';
import multer from 'multer';
import multerConfig from '../config/multer.js';

import { listUploads, uploadFile, deleteUpload } from '../controllers/uploadController.js';

const router = express.Router();

// GET: listar arquivos de uma pasta (objectId da pasta)
router.get('/posts/:objectId', listUploads);

// POST: upload de um arquivo para uma pasta
router.post('/posts', multer(multerConfig).single("file"), uploadFile);

// DELETE: deletar arquivo por ID
router.delete('/posts/:id', deleteUpload);

export default router;
