// src/routes/cardRoutes.js
import express from 'express';
import {
    createCard,
    getCards,
    getCardById,
    updateCard,
    deleteCard
} from '../controllers/cardController.js'; // Importa as funções do controller

const router = express.Router();

// Rotas para a coleção principal de cards (/api/cards)
router.route('/')
    .post(createCard)    // POST para criar um novo card
    .get(getCards);      // GET para listar (com filtros/paginação)

// Rotas para operações em um card específico por ID (/api/cards/:id)
router.route('/:id')
    .get(getCardById)    // GET para obter um card específico
    .put(updateCard)     // PUT para atualizar um card
    .delete(deleteCard); // DELETE para deletar um card

export default router;