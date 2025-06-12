// src/models/contracts.js // arquivo principal. gerencia os contratos das obras.

import mongoose from "mongoose";

// --- NOVO Sub-schema para o log de mudanças ---
const ChangeLogSchema = new mongoose.Schema({
    changedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Users", // Referência ao modelo de Usuários, assumindo que você tem um
        required: true,
        // O ID do usuário que realizou a mudança
    },
    changedAt: {
        type: Date,
        default: Date.now,
        required: true,
        // O timestamp da mudança
    },
    oldState: {
        type: mongoose.Schema.Types.Mixed, // Armazena o estado do documento ANTES da mudança
        required: true,
        // Contém o objeto do contrato como ele era antes desta atualização.
        // Usamos Mixed para flexibilidade, já que será um snapshot de todo o documento.
    },
}, { _id: false }); // Não é necessário um ID separado para cada entrada de log

// --- Sub-schema para cada item do cronograma (mês, valor, percentual) ---
const CronogramaItemSchema = new mongoose.Schema({
    month: {
        type: Date,
        required: true,
        // Representa o mês do cronograma (ex: 2024-01-01).
        // O dia pode ser padronizado para o primeiro do mês para simplificar.
    },
    value: {
        type: Number,
        required: true,
        min: 0, // Garante que o valor não seja negativo
    },
    percentage: {
        type: Number,
        required: true,
        min: 0,
        max: 100, // Garante que o percentual esteja entre 0 e 100
    },
}, { _id: false }); // _id: false para não criar um ID para cada subdocumento

// --- Sub-schema para cada versão do cronograma ---
const CronogramaVersionSchema = new mongoose.Schema({
    versionDate: {
        type: Date,
        default: Date.now,
        required: true,
        // Data em que esta versão do cronograma foi criada ou aprovada
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Users",
        required: false,
        // Usuário que criou ou alterou esta versão do cronograma
    },
    schedule: {
        type: [CronogramaItemSchema],
        required: false,
        // O array de itens do cronograma para esta versão
    },
}, { _id: false }); // _id: false para não criar um ID para cada subdocumento

const ContractSchema = new mongoose.Schema({
    // ----------------------------
    // Identificação e metadados
    // ----------------------------
    name: {
        type: String,
        required: true,
        trim: true,
    },
    contractNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true, // número de referência oficial do contrato
    },
    referenceNumber: { //pregão
        type: String,
        trim: true, // campo adicional “número de referência”
    },
    description: {
        type: String,
        default: "",
        trim: true,
    },
    milLigName: {
        type: String,
        default: "",
        trim: true,
    },
    milLigNumber: {
        type: String,
        default: "",
        trim: true,
    },
    opusNumber: {
        type: String,
        default: "",
        trim: true,
    },

    // ----------------------------
    // Valores principais (o valor original do contrato ainda é relevante)
    // ----------------------------
    value: {
        type: Number,
        required: true,
    },

    // ----------------------------
    // Cronograma Físico-Financeiro (Array de Versões)
    // ----------------------------
    schedules: {
        type: [CronogramaVersionSchema],
        default: [],
        // Array de versões do cronograma. O último item é o cronograma ativo.
        // Cada versão contém um array de CronogramaItemSchema.
    },
    // --- NOVO CAMPO: Histórico de Alterações ---
    changes: {
        type: [ChangeLogSchema], // Um array de objetos ChangeLogSchema
        default: [],
        // Registra todas as alterações feitas no contrato, com quem fez e o estado anterior.
    },
    // ----------------------------
    // Data de Expiração Administrativa (Novo Campo)
    // ----------------------------
    administrativeExpirationDate: {
        type: Date,
        required: false, // Pode ser opcional dependendo da regra de negócio
        // Data administrativa de expiração do contrato, independente do cronograma.
    },

    // ----------------------------
    // Valores dinâmicos (atualizados via medições, aditivos, reajustes e empenhos)
    // ----------------------------
    currentValue: {
        type: Number,
        default: 0,
        // “valor atual” do contrato, depois de aplicar aditivos/reajustes
    },
    paidValue: {
        type: Number,
        default: 0,
        // “valor pago”, somatório das medições já liquidadas
    },
    availableValue: {
        type: Number,
        default: 0,
        // “valor disponível”, com base nos empenhos registrados
    },

    // ----------------------------
    // Ponto de contato / fiscal responsável
    // ----------------------------
    fiscal: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Users",
        required: false,
        // usuário responsável por fiscalizar este contrato
    },

    // Empresa contratada
    company: {
        cnpj: { type: String, required: true, trim: true },
        name: { type: String, required: true, trim: true },
        address: { type: String, required: true, trim: true },
        observations: { type: String, default: "", trim: true }
    },

    // Desoneração da planilha de preços
    desonerado: { type: Boolean, default: false },

    // BDI: Benefícios e Despesas Indiretas
    bdi: {
        servicePercent: { type: Number, default: 0 }, // tipo A: planilha de serviços
        equipmentPercent: { type: Number, default: 0 } // tipo B: planilha de equipamentos
    },

    // ----------------------------
    // Referência à “OM” (facility)
    // ----------------------------
    om: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Facilities",
        required: false,
        // unidade militar (facility) responsável por este contrato
    },

    // ----------------------------
    // Planilha Base (Bill of Quantities)
    // ----------------------------
    baseSheetUrl: {
        type: String,
        default: "",
        trim: true,
        // URL do endpoint Apps Script que retorna o JSON da planilha base
    },
    baseImportedAt: {
        type: Date,
        // data em que a planilha base foi importada
    },

    // ----------------------------
    // Status e controle
    // ----------------------------
    status: {
        type: String,
        enum: ["Ativo", "Concluído", "Suspenso", "Cancelado"],
        default: "Ativo",
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Users",
        required: false,
        // quem criou o contrato no sistema
    },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// --- Virtuals para derivar startDate e endDate do cronograma mais recente ---
ContractSchema.virtual('derivedStartDate').get(function () {
    if (this.schedules && this.schedules.length > 0) {
        const latestScheduleVersion = this.schedules[this.schedules.length - 1];
        if (latestScheduleVersion.schedule && latestScheduleVersion.schedule.length > 0) {
            return latestScheduleVersion.schedule[0].month; // Primeiro mês do último cronograma
        }
    }
    return null;
});

ContractSchema.virtual('derivedEndDate').get(function () {
    if (this.schedules && this.schedules.length > 0) {
        const latestScheduleVersion = this.schedules[this.schedules.length - 1];
        if (latestScheduleVersion.schedule && latestScheduleVersion.schedule.length > 0) {
            return latestScheduleVersion.schedule[latestScheduleVersion.schedule.length - 1].month; // Último mês do último cronograma
        }
    }
    return null;
});

// --- Virtuals existentes ---
ContractSchema.virtual("cards", {
    ref: "Cards",
    localField: "_id",
    foreignField: "contractId",
    justOne: false
});

ContractSchema.virtual("contractItems", {
    ref: "ContractItems",
    localField: "_id",
    foreignField: "contractId",
    justOne: false
});

export default mongoose.model("Contracts", ContractSchema);