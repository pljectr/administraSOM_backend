import express from 'express';
import { registerUser, loginUser, logoutUser, checkAuth,updatePassword  } from '../controllers/userController.js';

const router = express.Router();

// Middleware para garantir que o usuário está autenticado


// Rotas
router.post('/registration/newUser', registerUser);
router.post('/login', loginUser);
router.get('/auth', checkAuth);
router.post('/update-password', updatePassword);
router.get('/logout', logoutUser);

export default router;
