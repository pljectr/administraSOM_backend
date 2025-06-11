// src/controllers/cardController.js
import Card from '../models/cards.js'; // Importa o modelo Card do Mongoose
import mongoose from 'mongoose';      // Para validação de ObjectId

// --- Definições de Raias (Lanes/Card Types) e Estágios (Stages) Válidos ---
// Estes arrays definem os valores permitidos para 'lane' e 'currentStage' dos cards.
// Eles devem ser consistentes com as definições usadas no frontend (e.g., em availableCardTypes, availableStages).
// Em um sistema mais complexo, esses valores poderiam vir de uma tabela de configuração no banco de dados.
const AVAILABLE_CARD_TYPES = [
    "Tasks", "Notas", "Medição", "Aditivo", "Diário de Observações", "Viagens",
    "Nota de Crédito", "Nota de Empenho", "Requisição", "Notificação", "Reajuste",
    "Processo Administrativo", "Atestado", "As-Built", "Termo Recebimento Definitivo",
    "Termo Recebimento Provisório", "Termo Recebimento de Obra"
];

const AVAILABLE_STAGES = [
    "A fazer", "Em andamento", "Em análise", "Concluído"
];

// --- Helper para Respostas de Erro Consistentes ---
// Centraliza a formatação das respostas de erro para manter um padrão na API.
const sendError = (res, statusCode, message, error = null) => {
    res.status(statusCode).json({
        success: false,
        message: message,
        error: error ? error.message || String(error) : null // Converte o erro para string se não for um objeto com .message
    });
};

/**
 * @route POST /api/cards
 * @desc Cria um novo card no sistema.
 * @access Privado (assumindo que há um middleware de autenticação antes desta rota).
 * @requestBody
 *   - title (String, obrigatório): Título do card.
 *   - description (String, opcional): Descrição detalhada do card.
 *   - contractId (ObjectId, obrigatório): ID do contrato ao qual o card pertence.
 *   - lane (String, obrigatório): Tipo de processo (raia) do card. Deve ser um dos AVAILABLE_CARD_TYPES.
 *   - currentStage (String, obrigatório): Estágio atual do card. Deve ser um dos AVAILABLE_STAGES.
 *   - createdBy (ObjectId, obrigatório): ID do usuário que criou o card.
 *   - customFields (Object, opcional): Dados adicionais específicos do card.
 *
 * @example Request (body):
 *   {
 *     "title": "Medição Mensal Julho 2025",
 *     "description": "Elaborar planilha e solicitar assinatura do fiscal.",
 *     "contractId": "660000000000000000000001",
 *     "lane": "Medição",
 *     "currentStage": "A fazer",
 *     "createdBy": "660000000000000000000002",
 *     "customFields": {
 *       "valorPrevisto": 105000,
 *       "dataVencimento": "2025-07-20T00:00:00.000Z"
 *     }
 *   }
 *
 * @example Response (201 Created - success):
 *   {
 *     "success": true,
 *     "data": {
 *       "_id": "66901a93e36e7a2b9a7f34c3",
 *       "title": "Medição Mensal Julho 2025",
 *       "description": "Elaborar planilha e solicitar assinatura do fiscal.",
 *       "contractId": "660000000000000000000001",
 *       "lane": "Medição",
 *       "currentStage": "A fazer",
 *       "createdBy": "660000000000000000000002",
 *       "customFields": { "valorPrevisto": 105000, "dataVencimento": "2025-07-20T00:00:00.000Z" },
 *       "history": [ { "stage": "A fazer", "enteredAt": "2025-07-11T18:37:56.273Z" } ],
 *       "createdAt": "2025-07-11T18:37:56.273Z",
 *       "updatedAt": "2025-07-11T18:37:56.273Z",
 *       "__v": 0
 *     }
 *   }
 *
 * @example Response (400 Bad Request - validation error):
 *   { "success": false, "message": "Campos obrigatórios faltando: title, contractId, lane, currentStage, createdBy." }
 *   { "success": false, "message": "Tipo de raia (lane) inválido: InvalidLane. Tipos permitidos: Medição, Notificação, ...", "error": "..." }
 */
export const createCard = async (req, res) => {

    try {
        const { title, description, contractId, lane, currentStage, createdBy, customFields } = req.body;

        // 1. Validação de campos obrigatórios
        if (!title || !contractId || !lane || !currentStage || !createdBy) {
            return sendError(res, 400, 'Campos obrigatórios faltando: title, contractId, lane, currentStage, createdBy.');
        }

        // 2. Validação de ObjectId para contractId e createdBy (melhor que tentar salvar e pegar o erro de validação do Mongoose)
        if (!mongoose.Types.ObjectId.isValid(contractId)) {
            return sendError(res, 400, 'ID do contrato inválido.');
        }
        if (!mongoose.Types.ObjectId.isValid(createdBy)) {
            return sendError(res, 400, 'ID do criador inválido.');
        }

        // 3. Validação da 'lane' (raia/cardType) contra os tipos permitidos
        if (!AVAILABLE_CARD_TYPES.includes(lane)) {
            return sendError(res, 400, `Tipo de raia (lane) inválido: '${lane}'. Tipos permitidos: ${AVAILABLE_CARD_TYPES.join(', ')}.`);
        }

        // 4. Validação do 'currentStage' (coluna/estágio) contra os estágios permitidos
        if (!AVAILABLE_STAGES.includes(currentStage)) {
            return sendError(res, 400, `Estágio (currentStage) inválido: '${currentStage}'. Estágios permitidos: ${AVAILABLE_STAGES.join(', ')}.`);
        }

        // Cria uma nova instância do modelo Card
        const newCard = new Card({
            title,
            description,
            contractId,
            lane,
            currentStage,
            createdBy,
            customFields: customFields || {}, // Garante que customFields seja um objeto vazio se não fornecido
        });

        // Salva o card no banco de dados
        const savedCard = await newCard.save();
        res.status(201).json({ success: true, data: savedCard }); // Retorna o card criado com status 201

    } catch (error) {
        // Captura e trata erros gerais ou de validação (se algum passar pelas validações manuais)
        if (error.name === 'ValidationError') {
            return sendError(res, 400, 'Erro de validação ao criar card.', error);
        }
        sendError(res, 500, 'Erro interno ao criar card.', error);
    }
};

/**
 * @route GET /api/cards
 * @desc Lista todos os cards, opcionalmente filtrados por contractId e/ou lane, com paginação.
 * @access Público (ou Privado).
 * @queryParam {string} [contractId] - Filtra cards por um contrato específico.
 * @queryParam {string} [lane] - NOVO: Filtra cards por um tipo de raia/lane específico.
 * @queryParam {number} [page=1] - Número da página para paginação (baseado em 1).
 * @queryParam {number} [limit=10] - Número de cards por página.
 *
 * @example Request:
 *   GET /api/cards?contractId=660000000000000000000001&lane=Medição&page=1&limit=5
 *   GET /api/cards (para todos os cards sem filtro)
 *
 * @example Response (200 OK - success):
 *   {
 *     "success": true,
 *     "data": [
 *       { "_id": "66901a93e36e7a2b9a7f34c3", "title": "Card 1", "lane": "Medição", ... },
 *       { "_id": "66901a93e36e7a2b9a7f34c4", "title": "Card 2", "lane": "Medição", ... }
 *     ],
 *     "pagination": { "totalPages": 2, "currentPage": 1, "totalCards": 8 }
 *   }
 *
 * @example Response (400 Bad Request - invalid input):
 *   { "success": false, "message": "ID do contrato inválido." }
 *   { "success": false, "message": "Tipo de raia (lane) inválido: 'InvalidType'. Tipos permitidos: ...", "error": "..." }
 */
export const getCards = async (req, res) => {
    try {
        const { contractId, lane, page = 1, limit = 10 } = req.query;

        const query = {}; // Objeto para construir a query de busca no MongoDB

        // Adiciona filtro por contractId, se fornecido
        if (contractId) {
            if (!mongoose.Types.ObjectId.isValid(contractId)) {
                return sendError(res, 400, 'ID do contrato inválido.');
            }
            query.contractId = contractId;
        }

        // Adiciona filtro por lane (tipo de raia), se fornecido
        if (lane) {
            if (!AVAILABLE_CARD_TYPES.includes(lane)) {
                return sendError(res, 400, `Tipo de raia (lane) inválido: '${lane}'. Tipos permitidos: ${AVAILABLE_CARD_TYPES.join(', ')}.`);
            }
            query.lane = lane;
        }

        // Configura opções de paginação
        const options = {
            page: parseInt(page, 10), // Converte para inteiro
            limit: parseInt(limit, 10), // Converte para inteiro
            sort: { createdAt: -1 } // Ordena por data de criação, do mais novo para o mais antigo
        };

        // Calcula o número de documentos a pular (offset)
        const skip = (options.page - 1) * options.limit;

        // Busca os cards aplicando a query, limite e skip
        const cards = await Card.find(query)
                                .limit(options.limit)
                                .skip(skip)
                                .exec();

        // Conta o total de documentos que correspondem à query (para paginação)
        const totalCards = await Card.countDocuments(query);
        const totalPages = Math.ceil(totalCards / options.limit); // Calcula o total de páginas

        res.status(200).json({
            success: true,
            data: cards,
            pagination: {
                totalPages,
                currentPage: options.page,
                totalCards
            }
        });

    } catch (error) {
        sendError(res, 500, 'Erro interno ao buscar cards.', error);
    }
};

/**
 * @route GET /api/cards/:id
 * @desc Obtém um único card pelo seu ID.
 * @access Público (ou Privado).
 *
 * @example Request:
 *   GET /api/cards/66901a93e36e7a2b9a7f34c3
 *
 * @example Response (200 OK - success):
 *   {
 *     "success": true,
 *     "data": {
 *       "_id": "66901a93e36e7a2b9a7f34c3",
 *       "title": "Medição Mensal Julho 2025",
 *       "description": "Elaborar planilha e solicitar assinatura do fiscal.",
 *       "contractId": "660000000000000000000001",
 *       "lane": "Medição",
 *       "currentStage": "A fazer",
 *       "createdBy": "660000000000000000000002",
 *       "customFields": {},
 *       "history": [ { "stage": "A fazer", "enteredAt": "2025-07-11T18:37:56.273Z" } ],
 *       "createdAt": "2025-07-11T18:37:56.273Z",
 *       "updatedAt": "2025-07-11T18:37:56.273Z",
 *       "__v": 0
 *     }
 *   }
 *
 * @example Response (404 Not Found):
 *   { "success": false, "message": "Card não encontrado." }
 *
 * @example Response (400 Bad Request - invalid ID):
 *   { "success": false, "message": "ID do card inválido." }
 */
export const getCardById = async (req, res) => {
    try {
        const { id } = req.params;

        // Valida se o ID fornecido na URL é um ObjectId válido do MongoDB
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendError(res, 400, 'ID do card inválido.');
        }

        const card = await Card.findById(id);

        if (!card) {
            return sendError(res, 404, 'Card não encontrado.'); // Retorna 404 se o card não existir
        }

        res.status(200).json({ success: true, data: card });

    } catch (error) {
        sendError(res, 500, 'Erro interno ao buscar card.', error);
    }
};

/**
 * @route PUT /api/cards/:id
 * @desc Atualiza um card existente pelo ID. Permite atualizar 'currentStage' (movendo o card)
 *       e outros campos. A movimentação de estágio atualiza o histórico do card.
 * @access Privado.
 * @requestBody
 *   - currentStage (String, opcional): Novo estágio do card. Se diferente do atual, aciona a movimentação.
 *   - Qualquer outro campo do CardSchema (title, description, customFields, etc., opcional)
 *
 * @example Request (body - update stage):
 *   {
 *     "currentStage": "Em análise"
 *   }
 *
 * @example Request (body - update other fields):
 *   {
 *     "title": "Medição Julho - Revisada",
 *     "description": "Descrição atualizada para incluir nova data.",
 *     "customFields": { "valorMedido": 15000 }
 *   }
 *
 * @example Response (200 OK - success):
 *   {
 *     "success": true,
 *     "data": {
 *       "_id": "66901a93e36e7a2b9a7f34c3",
 *       "title": "Medição Julho - Revisada",
 *       "description": "Descrição atualizada para incluir nova data.",
 *       "currentStage": "Em análise",
 *       "history": [
 *         { "stage": "A fazer", "enteredAt": "2025-07-11T18:37:56.273Z", "exitedAt": "2025-07-11T19:00:00.000Z" },
 *         { "stage": "Em análise", "enteredAt": "2025-07-11T19:00:00.000Z" }
 *       ],
 *       "...outros campos atualizados..."
 *     }
 *   }
 *
 * @example Response (404 Not Found):
 *   { "success": false, "message": "Card não encontrado." }
 *
 * @example Response (400 Bad Request - invalid input):
 *   { "success": false, "message": "ID do card inválido." }
 *   { "success": false, "message": "Estágio (currentStage) inválido: 'InvalidStage'. Estágios permitidos: ...", "error": "..." }
 */
export const updateCard = async (req, res) => {
    try {
        const { id } = req.params;
        const { currentStage, ...updateData } = req.body; // Separa 'currentStage' para tratamento especial

        // Valida se o ID do card é um ObjectId válido
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendError(res, 400, 'ID do card inválido.');
        }

        const card = await Card.findById(id);

        if (!card) {
            return sendError(res, 404, 'Card não encontrado.'); // Retorna 404 se o card não existir
        }

        let needsExplicitSave = false; // Flag para controlar se o card precisa de .save()

        // Se 'currentStage' foi fornecido e é diferente do estágio atual do card
        if (currentStage && currentStage !== card.currentStage) {
            // Valida o novo 'currentStage' contra os estágios permitidos
            if (!AVAILABLE_STAGES.includes(currentStage)) {
                return sendError(res, 400, `Estágio (currentStage) inválido: '${currentStage}'. Estágios permitidos: ${AVAILABLE_STAGES.join(', ')}.`);
            }
            // Usa o método 'moveToStage' definido no Schema do Card.
            // Este método atualiza o 'currentStage', registra no histórico e já salva o card.
            await card.moveToStage(currentStage);
            // Após moveToStage, 'card' já reflete as mudanças e está salvo.
        } else {
            // Se 'currentStage' não foi alterado ou não foi fornecido, outros campos
            // devem ser atualizados e precisaremos de um .save() explícito.
            needsExplicitSave = true;
        }

        // Aplica outras atualizações de campos (title, description, customFields, etc.)
        // Itera sobre os dados recebidos no corpo da requisição (excluindo currentStage)
        Object.keys(updateData).forEach(key => {
            // Valida 'lane' se for tentado alterar (geralmente 'lane' é um campo fixo após a criação do card)
            if (key === 'lane') {
                 if (!AVAILABLE_CARD_TYPES.includes(updateData[key])) {
                     return sendError(res, 400, `Tipo de raia (lane) inválido: '${updateData[key]}'. Tipos permitidos: ${AVAILABLE_CARD_TYPES.join(', ')}.`);
                 }
                 // Se a lane for válida e diferente, atualiza
                 card[key] = updateData[key];
                 needsExplicitSave = true; // Se lane for alterada, precisa salvar explicitamente
            } else if (card[key] !== undefined) { // Garante que a propriedade existe no schema do card
                card[key] = updateData[key];
                needsExplicitSave = true; // Se outros campos são atualizados, precisa salvar explicitamente
            }
        });

        // Salva o card se houver outras atualizações ou se moveToStage não foi chamado
        if (needsExplicitSave) {
            await card.save(); // Salva as modificações de outros campos
        }

        // Retorna o card atualizado (que já foi salvo, seja por moveToStage ou por save explícito)
        res.status(200).json({ success: true, data: card });

    } catch (error) {
        if (error.name === 'ValidationError') {
            return sendError(res, 400, 'Erro de validação ao atualizar card.', error);
        }
        sendError(res, 500, 'Erro interno ao atualizar card.', error);
    }
};

/**
 * @route DELETE /api/cards/:id
 * @desc Deleta um card existente pelo ID.
 * @access Privado.
 *
 * @example Request:
 *   DELETE /api/cards/66901a93e36e7a2b9a7f34c3
 *
 * @example Response (200 OK - success):
 *   { "success": true, "message": "Card deletado com sucesso." }
 *
 * @example Response (404 Not Found):
 *   { "success": false, "message": "Card não encontrado." }
 *
 * @example Response (400 Bad Request - invalid ID):
 *   { "success": false, "message": "ID do card inválido." }
 */
export const deleteCard = async (req, res) => {
    try {
        const { id } = req.params;

        // Valida se o ID fornecido na URL é um ObjectId válido
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendError(res, 400, 'ID do card inválido.');
        }

        const deletedCard = await Card.findByIdAndDelete(id);

        if (!deletedCard) {
            return sendError(res, 404, 'Card não encontrado.'); // Retorna 404 se o card não existir
        }

        res.status(200).json({ success: true, message: 'Card deletado com sucesso.' });

    } catch (error) {
        sendError(res, 500, 'Erro interno ao deletar card.', error);
    }
};