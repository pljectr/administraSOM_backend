// routes/uploads.js

import express from 'express';
import multer from 'multer';
import multerConfig from '../config/multer.js';

import {
  listUploads,
  uploadFile,
  deleteUpload, // Agora move para a lixeira
  showUpload, // Novo
  updateUpload, // Novo
  permanentDeleteUpload, // Novo
  listTrashs
} from '../controllers/uploadController.js';

const router = express.Router();

// Middleware de autenticação (exemplo, você deve ter o seu)
// const authMiddleware = require('../middlewares/auth');
// router.use(authMiddleware.isAuthenticated); // Descomente e configure seu middleware

// Lista arquivos de um card dentro de um contrato
// GET /api/uploads/:contractId/:cardId
router.get('/:contractId/:cardId', listUploads);
router.get('/trash/:contractId/:cardId', listTrashs);

// Upload de um novo arquivo para um card/item dentro de um contrato
// POST /api/uploads
// Os IDs (contractId, cardId, itemId) virão no corpo da requisição (req.body)
router.post(
  '/', // Rota mais genérica, IDs no body
  multer(multerConfig).single('file'),
  uploadFile
);

// Obter detalhes de um upload específico
// GET /api/uploads/:id
router.get('/:id', showUpload);

// Atualizar metadados de um upload (ex: descrição)
// PUT /api/uploads/:id
router.put('/:id', updateUpload);

// Mover um arquivo específico para a lixeira (soft delete)
// DELETE /api/uploads/:id
router.delete('/:id', deleteUpload);

// Deletar permanentemente um arquivo da lixeira
// DELETE /api/uploads/trash/:id (o ID aqui é do registro em TrashUploads)
router.delete('/trash/:id', permanentDeleteUpload);

export default router;