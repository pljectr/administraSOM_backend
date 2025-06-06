// src/models/contracts.js

import mongoose from "mongoose";

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

    // ----------------------------
    // Datas e valores principais
    // ----------------------------
    startDate: {
        type: Date,
        required: true,
    },
    endDate: {
        type: Date,
    },
    // Valor original do contrato (licitação)
    value: {
        type: Number,
        required: true,
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
