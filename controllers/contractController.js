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
