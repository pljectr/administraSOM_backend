import express from 'express';
import { getActivitiesByDocId } from '../controllers/activityController.js';

const router = express.Router();

// Middleware para garantir que o usuário está autenticado


// Rotas

router.get('/:docId', getActivitiesByDocId);



export default router;
