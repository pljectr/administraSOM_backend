// src/models/uploads.js

import mongoose from "mongoose";
import aws from "aws-sdk"; // Usaremos o AWS SDK para MinIO
import fs from "fs";
import path from "path";
import { promisify } from "util";

// Configuração do cliente S3 (MinIO)
// Importante: Esta instância é usada APENAS para o hook pre('remove')
// que agora será para DELEÇÃO PERMANENTE do arquivo do armazenamento.
// A lógica de "mover para a lixeira" será tratada no controller.
const s3 = new aws.S3({
  accessKeyId: process.env.MINIO_ACCESS_KEY,
  secretAccessKey: process.env.MINIO_SECRET_KEY,
  endpoint: process.env.MINIO_ENDPOINT,
  region: process.env.AWS_REGION || "us-east-1",
  s3ForcePathStyle: true,
  signatureVersion: "v4",
});

const UploadSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  }, // Nome original do arquivo
  size: {
    type: Number,
    required: true
  }, // Tamanho do arquivo em bytes
  key: {
    type: String,
    required: true,
    unique: true
  }, // Chave única do arquivo no armazenamento (gerada pelo Multer)
  url: {
    type: String
  }, // URL para acessar o arquivo

  description: {
    type: String,
    default: "",
    trim: true
  }, // Descrição opcional para o arquivo

  // --- Referências para vincular o documento ---
  contractId: { // Renomeado de 'projectId' para 'contractId'
    type: mongoose.Schema.Types.ObjectId,
    ref: "Contracts",
    required: true, // Todo documento deve pertencer a um contrato
  },
  cardId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Cards",
    required: false, // Opcional: se o documento está vinculado a um card específico
  },
  itemId: { // NOVO CAMPO: para vincular a um ContractItem específico
    type: mongoose.Schema.Types.ObjectId,
    ref: "Items",
    required: false, // Opcional: se o documento está vinculado a um item de contrato (ex: para medições)
  },
  uploadedBy: { // NOVO CAMPO: Usuário que fez o upload do arquivo
    type: mongoose.Schema.Types.ObjectId,
    ref: "Users",
    required: true, // Assumindo que todos os uploads são feitos por usuários autenticados
  },
}, {
  timestamps: true // Adiciona createdAt e updatedAt automaticamente
});

// Hook 'pre-save' para definir a URL do arquivo se ainda não estiver definida
UploadSchema.pre("save", function () {
  if (!this.url) {
    if (process.env.STORAGE_TYPE === "s3") {
      this.url = `${process.env.MINIO_ENDPOINT}/${process.env.BUCKET_NAME}/${this.key}`;
    } else { // Armazenamento local
      this.url = `${process.env.APP_URL}/files/${this.key}`;
    }
  }
});

// ATENÇÃO: Este hook 'pre-remove' agora só lida com a DELEÇÃO PERMANENTE do arquivo do armazenamento.
// A lógica de "mover para a lixeira" será tratada DIRETAMENTE no controller.
UploadSchema.pre("remove", function (next) {
  if (process.env.STORAGE_TYPE === "s3") {
    s3.deleteObject({
        Bucket: process.env.BUCKET_NAME, // Deleta do bucket principal
        Key: this.key,
      }).promise()
      .then(response => {
        console.log("Arquivo deletado permanentemente do MinIO:", this.key);
        next();
      })
      .catch(error => {
        console.error("Erro ao deletar permanentemente do MinIO:", error);
        next(error);
      });
  } else {
    const unlinkAsync = promisify(fs.unlink);
    const filePath = path.resolve(__dirname, "..", "tmp", "uploads", this.key);
    unlinkAsync(filePath)
      .then(() => {
        console.log("Arquivo deletado permanentemente do sistema de arquivos local:", this.key);
        next();
      })
      .catch(error => {
        console.error("Erro ao deletar permanentemente do sistema de arquivos local:", error);
        next(error);
      });
  }
});

export default mongoose.model("Uploads", UploadSchema);