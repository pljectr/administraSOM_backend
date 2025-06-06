import express from 'express';
import multer from 'multer';
import multerConfig from '../config/multer.js';

import { listUploads, uploadFile, deleteUpload } from '../controllers/uploadController.js';

const router = express.Router();

// Lista arquivos de um card dentro de um projeto
// GET /api/uploads/:projectId/:cardId
router.get('/:projectId/:cardId', listUploads);

// Upload de um novo arquivo para um card
// POST /api/uploads/:projectId/:cardId
router.post(
  '/:projectId/:cardId',
  multer(multerConfig).single('file'),
  uploadFile
);

// Deleta um arquivo específico (recebe apenas o ID do upload)
router.delete('/:id', deleteUpload);

export default router;
