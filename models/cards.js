// src/models/cards.js

import mongoose from "mongoose";

const StageHistorySchema = new mongoose.Schema({
  stage: {
    type: String,
    required: true,
    trim: true
    // Nome exato da coluna (status) para esta entrada histórica
  },
  enteredAt: {
    type: Date,
    required: true,
    default: Date.now
    // Momento em que o card entrou nesta coluna
  },
  exitedAt: {
    type: Date,
    default: null
    // Momentos em que o card saiu desta coluna (preenchido
    // quando ele mudar para outra coluna). Se null, ainda está ativo nesta coluna.
  }
}, { _id: false });

const CardSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: "",
    trim: true
  },

  // ----------------------------------
  // Vínculo ao contrato (pai)
  // ----------------------------------
  contractId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Contracts",
    required: true
  },

  // ----------------------------------
  // “Raia” fixa: tipo de processo a que o card pertence
  // (não pode ser alterado para outra raia depois de criado)
  // ----------------------------------
  lane: {
    type: String,
    required: true,
    enum: [
      "Medição",
      "Aditivo",
      "Diário de Observações",
      "Viagens",
      "Nota de Crédito",
      "Nota de Empenho",
      "Requisição",
      "Notificação",
      "Reajuste",
      "Processo Administrativo",
      "Atestado",
      "As-Built",
      "Termo Recebimento Definitivo",
      "Termo Recebimento Provisório",
      "Termo Recebimento de Obra"
    ]
  },

  // ----------------------------------
  // “Coluna” dinâmica: em qual etapa/status este card está atualmente
  // Ex: para lane = "Medição", poderia ser ["Iniciado", "Analisando", "Aprovado", "Concluído"] etc
  // ----------------------------------
  currentStage: {
    type: String,
    required: true,
    trim: true
    // Você poderá definir um enum específico no seu código de aplicação,
    // pois as etapas variam conforme a “raia”. Aqui, mantemos livre para
    // permitir diferentes conjuntos de estágios conforme o lane.
  },

  // ----------------------------------
  // Histórico de mudanças de coluna (para calcular duração)
  // array de subdocumentos: cada objeto registra estágio, hora de entrada
  // e hora de saída (null enquanto estiver ativo naquele estágio)
  // ----------------------------------
  history: {
    type: [StageHistorySchema],
    default: []
  },

  // ----------------------------------
  // Outros campos do card (por exemplo, campos personalizados)
  // ----------------------------------
  customFields: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
    // Use este objeto para guardar qualquer conjunto livre de campos
    // específicos do seu card (datas, valores, responsáveis etc).
  },

  attachments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Uploads"
    // IDs de uploads atrelados a este card
  }],

  commentCount: {
    type: Number,
    default: 0
    // contador de comentários, para estatísticas rápidas
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Users",
    required: true
  }
}, {
  timestamps: true,        // gera createdAt e updatedAt automaticamente
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ***************************************
// 1) Antes de salvar um novo card:
//    — definimos o estágio inicial e já criamos a primeira entrada em history
// ***************************************
CardSchema.pre("validate", function(next) {
  if (this.isNew) {
    // Ao criar o card, inserimos logo no history o estágio inicial
    // assumindo que `currentStage` já esteja atribuído no momento da criação.
    this.history.push({
      stage: this.currentStage,
      enteredAt: new Date(),
      exitedAt: null
    });
  }
  next();
});

// ***************************************
// 2) Método para alterar a etapa (coluna) do card
//    — fecha a entrada atual em history (preenche exitedAt) e adiciona nova entrada
//    — atualiza currentStage
// ***************************************
CardSchema.methods.moveToStage = async function(newStage) {
  // Se for a mesma etapa, nada a fazer
  if (this.currentStage === newStage) return;

  // Fecha o último histórico de estágio
  const lastEntry = this.history[this.history.length - 1];
  if (lastEntry && !lastEntry.exitedAt) {
    lastEntry.exitedAt = new Date();
  }

  // Atualiza currentStage
  this.currentStage = newStage;

  // Cria nova entrada em history
  this.history.push({
    stage: newStage,
    enteredAt: new Date(),
    exitedAt: null
  });

  // Salva as mudanças
  await this.save();
};

// ***************************************
// 3) Virtual para puxar comentários vinculados a este card
// ***************************************
CardSchema.virtual("comments", {
  ref: "Comments",
  localField: "_id",
  foreignField: "cardId",
  justOne: false
});

// ***************************************
// 4) Virtual para puxar uploads associados
// ***************************************
CardSchema.virtual("uploads", {
  ref: "Uploads",
  localField: "_id",
  foreignField: "cardId",
  justOne: false
});



export default mongoose.model("Cards", CardSchema);
