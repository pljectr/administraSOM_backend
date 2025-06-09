// src/models/items.js

import mongoose from "mongoose";

// Subschema para detalhamento de preços
const PriceBreakdownSchema = new mongoose.Schema({
  unitLabor: { type: Number },      // Valor unitário mão de obra
  unitMaterial: { type: Number },   // Valor unitário material
  unitTotal: { type: Number },      // unitLabor + unitMaterial
  totalLabor: { type: Number },     // unitLabor * contractedQty
  totalMaterial: { type: Number },  // unitMaterial * contractedQty
  totalAmount: { type: Number }     // totalLabor + totalMaterial
}, { _id: false });

const ItemSchema = new mongoose.Schema({
  contractId: { type: mongoose.Schema.Types.ObjectId, ref: "Contracts" },
  itemNumber: { type: String, trim: true },              // numeração (1.1, 1.2, ...)
  compositionCode: { type: String, trim: true },         // código de composição
  base: { type: String, trim: true },                    // fonte da planilha (ex.: "SINAPI")
  description: { type: String, trim: true },             // descrição do serviço
  unit: { type: String, trim: true },                    // unidade (m, m², unid, etc.)
  contractedQty: { type: Number },                       // quantidade contratada
  originalQty: { type: Number },                         // quantidade original (inicial)
  currentQty: { type: Number },                          // saldo atual (diminui nas medições)

  // identifica se o item é da planilha original (true) ou provém de aditivo (false)
  isOriginal: { type: Boolean, default: true },

  // tipo de planilha: A = serviços, B = equipamentos
  sheetType: { type: String, enum: ["A", "B"], default: "A" },

  // macroitem ao qual este serviço/insumo pertence
  macroItem: { type: String, trim: true },

  // preços determinados pela Administração (planilha base)
  adminPrices: PriceBreakdownSchema,

  // preços informados pela empresa contratada
  companyPrices: PriceBreakdownSchema,

  observations: { type: String, trim: true }
}, {
  timestamps: true // cria createdAt e updatedAt automaticamente
});

// Inicializa originalQty e currentQty no momento da criação
ItemSchema.pre("save", function(next) {
  if (this.isNew) {
    this.originalQty = this.contractedQty;
    this.currentQty = this.contractedQty;
  }

  // Recalcula totais de preços conforme contractedQty e rates
  [this.adminPrices, this.companyPrices].forEach(pb => {
    pb.unitTotal = (pb.unitLabor || 0) + (pb.unitMaterial || 0);
    pb.totalLabor = (pb.unitLabor || 0) * (this.contractedQty || 0);
    pb.totalMaterial = (pb.unitMaterial || 0) * (this.contractedQty || 0);
    pb.totalAmount = (pb.totalLabor || 0) + (pb.totalMaterial || 0);
  });

  next();
});

/**
 * Aplica medição: reduz currentQty e retorna saldo atual.
 */
ItemSchema.methods.applyMeasurement = async function(quantityMeasured) {
  this.currentQty = Math.max(0, (this.currentQty || 0) - quantityMeasured);
  await this.save();
  return this.currentQty;
};

export default mongoose.model("Items", ItemSchema);