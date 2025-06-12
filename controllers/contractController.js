// src/controllers/contractController.js
import Contract from '../models/contracts.js';
import Item from '../models/items.js';
import axios from 'axios';


export const getAllContracts = async (req, res) => {
  try {
    const contracts = await Contract.find();
    res.json(contracts);
  } catch (err) {
    console.error('Erro ao buscar contratos:', err);
    res.status(500).json({ erro: true, mensagem: 'Erro ao buscar contratos.' });
  }
};
// POST /api/contracts
export const createContract = async (req, res) => {
  try {
    // Primeiro, cria contrato e captura seu ID
    const newContract = await Contract.create(req.body);
    const contractId = newContract._id;

    // Se foi informada URL da planilha base, busca JSON e importa items
    if (newContract.baseSheetUrl) {
      try {
        const response = await axios.get(newContract.baseSheetUrl);
        const rows = Array.isArray(response.data) ? response.data : [];

        // Mapeia cada linha para Item
        const itemsToCreate = rows.map(row => ({
          contractId,
          orderNumber: row.orderNumber,
          macroItem: row.macroItem,
          sheetType: row.sheetType,
          isOriginal: row.isOriginal === 'TRUE' || row.isOriginal === true,
          itemNumber: row.itemNumber,
          compositionCode: row.compositionCode,
          base: row.base,
          description: row.description,
          unit: row.unit,
          contractedQty: Number(row.contractedQty) || 0,
          adminPrices: {
            unitLabor: Number(row.admin_unitLabor) || 0,
            unitMaterial: Number(row.admin_unitMaterial) || 0
          },
          companyPrices: {
            unitLabor: Number(row.company_unitLabor) || 0,
            unitMaterial: Number(row.company_unitMaterial) || 0
          },
          observations: row.observations || ''
        }));

        // Insere todos os items
        await Item.insertMany(itemsToCreate);
      } catch (errSheet) {
        console.error('Erro ao importar planilha base:', errSheet);
        // opcional: retornar erro ou apenas logar
      }
    }

    return res.status(201).json(newContract);
  } catch (err) {
    console.error('Erro ao criar contrato:', err);
    return res.status(400).json({ erro: true, mensagem: err.message });
  }
};

// Nota: lembre de registrar esta função em routes/contracts.js no lugar do createContract original


// Nova função: Obter um contrato por ID
export const getContractById = async (req, res) => {
  try {
    const { id } = req.params; // Captura o ID da URL
    const contract = await Contract.findById(id)
      .populate('fiscal', 'name email') // Opcional: Popula dados do fiscal (usuário)
      .populate('om', 'name'); // Opcional: Popula dados da organização militar (facility)

    if (!contract) {
      return res.status(404).json({ erro: true, mensagem: 'Contrato não encontrado.' });
    }
    res.json(contract);
  } catch (err) {
    console.error('Erro ao buscar contrato por ID:', err);
    // Erro de CastError acontece se o ID não for um ObjectId válido
    if (err.name === 'CastError') {
      return res.status(400).json({ erro: true, mensagem: 'ID de contrato inválido.' });
    }
    res.status(500).json({ erro: true, mensagem: 'Erro interno do servidor ao buscar contrato.' });
  }
};

// Nova função: Atualizar um contrato existente por ID
export const updateContract = async (req, res) => {
  try {
    const { id } = req.params; // Captura o ID da URL

    // 1. Obter o contrato existente ANTES de aplicar as mudanças.
    // Isso é crucial para capturar o "estado antigo" para o log de alterações.
    let contract = await Contract.findById(id);

    if (!contract) {
      return res.status(404).json({ erro: true, mensagem: 'Contrato não encontrado para atualização.' });
    }

    // --- Lógica do Log de Alterações ---
    // IMPORTANTE: Assumimos que o ID do usuário autenticado está disponível em `req.user._id`.
    // Se você não tem um middleware de autenticação que popula `req.user`,
    // você precisará ajustar esta linha para obter o ID do usuário de outra forma.
    const userId = req.user ? req.user._id : null; // Exemplo para Passport.js

    if (!userId) {
        // Se o usuário não está autenticado ou o ID não está disponível, retorne um erro.
        // Ou, se a regra de negócio permitir, pode usar um ID padrão ou null.
        return res.status(401).json({ erro: true, mensagem: 'Usuário não autenticado ou ID de usuário não disponível para registrar a alteração.' });
    }

    // Capturar o estado ANTERIOR do contrato para o log de mudanças.
    // Usamos .toObject() para obter um objeto JS puro, e excluímos 'changes' para evitar recursão.
    const oldContractState = contract.toObject();
    delete oldContractState.changes; // Não queremos o array 'changes' dentro do 'oldState'

    // Criar a entrada de log de mudança.
    const changeLogEntry = {
      changedBy: userId,
      changedAt: new Date(),
      oldState: oldContractState,
    };

    // Adicionar a nova entrada de log ao array 'changes' do contrato.
    contract.changes.push(changeLogEntry);
    // Fim da Lógica do Log de Alterações ---

    // Aplicar os dados do req.body ao documento do contrato.
    // Usamos `contract.set()` para garantir que as modificações sejam rastreadas pelo Mongoose.
    // Removemos '_id' e 'changes' do req.body para que não sejam sobrescritos acidentalmente.
    const updatesToApply = { ...req.body };
    delete updatesToApply._id;
    delete updatesToApply.changes; // Não permitimos a modificação direta do array 'changes' via body

    contract.set(updatesToApply);

    // Salvar o contrato modificado.
    // Isso executa as validações do schema e salva o documento com o novo log de alteração.
    const updatedContract = await contract.save();

    // --- Lógica opcional para baseSheetUrl ---
    // Se o baseSheetUrl foi alterado e não estava vazio, você pode querer reimportar os itens.
    // Atenção: Isso é uma lógica complexa, pois pode significar deletar itens antigos e inserir novos.
    // Para uma primeira versão de edição, você pode ignorar essa complexidade ou desabilitar a edição
    // desse campo após a criação inicial se for muito sensível.
    /*
    if (req.body.baseSheetUrl && updatedContract.baseSheetUrl !== req.body.baseSheetUrl) {
      // Implementar lógica de re-importação ou atualização de itens.
      // Ex: await Item.deleteMany({ contractId: id });
      // await importItemsFromSheet(id, req.body.baseSheetUrl); // Função auxiliar
      console.log(`baseSheetUrl alterada para o contrato ${id}. Lógica de re-importação necessária.`);
    }
    */

    res.json(updatedContract); // Retorna o contrato atualizado
  } catch (err) {
    console.error('Erro ao atualizar contrato:', err);
    if (err.name === 'CastError') {
      return res.status(400).json({ erro: true, mensagem: 'ID de contrato inválido.' });
    }
    if (err.name === 'ValidationError') { // Erros de validação do Mongoose
      const messages = Object.values(err.errors).map(val => val.message);
      return res.status(400).json({ erro: true, mensagem: messages.join(', ') });
    }
    // Adicione tratamento para erro de duplicidade se 'contractNumber' for unique no schema
    if (err.code === 11000 && err.keyPattern && err.keyPattern.contractNumber) {
        return res.status(409).json({ erro: true, mensagem: 'Número de contrato já existe.' });
    }
    res.status(500).json({ erro: true, mensagem: 'Erro interno do servidor ao atualizar contrato.' });
  }
};