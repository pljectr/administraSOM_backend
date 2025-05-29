import Activity from '../models/activities.js';
import mongoose from 'mongoose';
// GET /api/activities/:docId
export const getActivitiesByDocId = async (req, res) => {
  const { docId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
/* Assim, sua rota fica flexível e aceita URLs com ou sem os parâmetros de paginação:

/api/activities/all → vai usar página 1 e limite 50 por padrão

/api/activities/all?page=3 → página 3, limite 50

/api/activities/all?limit=10 → página 1, limite 10

/api/activities/all?page=2&limit=20 → página 2, limite 20
 */
  try {
    let query = {};

    if (docId !== "all") {
      if (!mongoose.Types.ObjectId.isValid(docId)) {
        return res.status(400).json({
          erro: true,
          mensagem: "documentId inválido",
        });
      }
      query.documentId = docId;
    }

    const activities = await Activity.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const totalCount = await Activity.countDocuments(query);

    return res.json({
      erro: false,
      quantidade: activities.length,
      pagina: page,
      totalPaginas: Math.ceil(totalCount / limit),
      totalRegistros: totalCount,
      atividades: activities,
    });
  } catch (err) {
    console.error("Erro ao buscar atividades:", err);
    return res.status(500).json({
      erro: true,
      mensagem: "Erro ao buscar atividades.",
    });
  }
};