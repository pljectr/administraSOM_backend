// src/models/trashUploads.js

import mongoose from "mongoose";
import aws from "aws-sdk"; // Usaremos o AWS SDK para MinIO

// Configuração do cliente S3 (MinIO) para o bucket de lixeira
const s3 = new aws.S3({
  accessKeyId: process.env.MINIO_ACCESS_KEY,
  secretAccessKey: process.env.MINIO_SECRET_KEY,
  endpoint: process.env.MINIO_ENDPOINT,
  region: process.env.AWS_REGION || "us-east-1",
  s3ForcePathStyle: true,
  signatureVersion: "v4",
});

const TrashUploadSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  size: {
    type: Number,
    required: true
  },
  key: { // A chave do arquivo no bucket de lixeira
    type: String,
    required: true,
    unique: true
  },
  url: { // A URL do arquivo no bucket de lixeira
    type: String
  },
  description: {
    type: String,
    default: "",
    trim: true
  },

  // Referências originais do upload
  originalUploadId: { // ID do documento original na coleção 'Uploads'
    type: mongoose.Schema.Types.ObjectId,
    ref: "Uploads",
    required: true,
    unique: true // Garante que um upload só pode ir para a lixeira uma vez
  },
  contractId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Contracts",
    required: true,
  },
  cardId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Cards",
    required: false,
  },
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Items",
    required: false,
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Users",
    required: true,
  },

  // Metadados da deleção
  deletedAt: { // Data e hora em que o arquivo foi movido para a lixeira
    type: Date,
    default: Date.now,
    required: true
  },
  deletedBy: { // Usuário que moveu o arquivo para a lixeira
    type: mongoose.Schema.Types.ObjectId,
    ref: "Users",
    required: true,
  },
}, {
  timestamps: true // Adiciona createdAt e updatedAt para o registro na lixeira
});

// Hook 'pre-save' para definir a URL do arquivo no bucket de lixeira
TrashUploadSchema.pre("save", function () {
  if (!this.url) {
    this.url = `${process.env.MINIO_ENDPOINT}/${process.env.BUCKET_TRASH_NAME}/${this.key}`;
  }
});

// Hook 'pre-remove' para deletar o arquivo permanentemente do bucket de lixeira
TrashUploadSchema.pre("remove", function (next) {
  if (process.env.STORAGE_TYPE === "s3") {
    s3.deleteObject({
        Bucket: process.env.BUCKET_TRASH_NAME,
        Key: this.key,
      }).promise()
      .then(response => {
        console.log("Arquivo deletado permanentemente do MinIO (lixeira):", this.key);
        next();
      })
      .catch(error => {
        console.error("Erro ao deletar permanentemente do MinIO (lixeira):", error);
        next(error);
      });
  } else {
    const unlinkAsync = promisify(fs.unlink);
    const filePath = path.resolve(__dirname, "..", "tmp", "trash", this.key);
    unlinkAsync(filePath)
      .then(() => {
        console.log("Arquivo deletado permanentemente do sistema de arquivos local (lixeira):", this.key);
        next();
      })
      .catch(error => {
        console.error("Erro ao deletar permanentemente do sistema de arquivos local (lixeira):", error);
        next(error);
      });
  }
});

export default mongoose.model("TrashUploads", TrashUploadSchema);