
// === Backend: routes/contracts.js ===
import express from 'express';
import {
    getAllContracts, createContract,
    getContractById,   // <- Importação da nova função
    updateContract    // <- Importação da nova função
} from '../controllers/contractController.js';
const router = express.Router();

router.get('/', getAllContracts);
router.post('/', createContract);
// Novas rotas para operações com um contrato específico
router.get('/:id', getContractById);     // GET para buscar um contrato por ID
router.put('/:id', updateContract);      // PUT para atualizar um contrato por ID (substituição completa)
// Você pode considerar PATCH se suas atualizações forem parciais,
// mas PUT é comum para formulários de edição onde você envia o objeto completo.
export default router;