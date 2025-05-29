import express from 'express';
import multer from 'multer';
import multerConfig from '../config/multer.js';

import { listUploads, uploadFile, deleteUpload } from '../controllers/uploadController.js';

const router = express.Router();

// Lista arquivos de uma pasta
router.get("/:objectId", listUploads);

// Upload de um novo arquivo para uma pasta
router.post(
  "/:objectId", // recebe o objectId também via rota, se quiser usar no req.params
  multer(multerConfig).single("file"),
  uploadFile
);

// Deleta um arquivo específico
router.delete("/:id", deleteUpload);

export default router;
