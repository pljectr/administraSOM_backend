// src/controllers/uploadController.js

import Upload from '../models/uploads.js';
import TrashUpload from '../models/trashUploads.js'; // Importa o novo modelo de lixeira
import Activity from '../models/activities.js';

import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import AWS from 'aws-sdk';
import { sanitizeFilenameBackend } from '../utils/functions.js';

// Adicione esta função ao seu backend, pode ser em um arquivo de utilitários



const unlinkAsync = promisify(fs.unlink);
// __dirname já está disponível em módulos ES se você usar 'type: module' no package.json
// ou pode ser definido manualmente se necessário:
// import { fileURLToPath } from 'url';
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// Configuração do cliente S3 (MinIO) - Instanciado uma vez
const s3 = new AWS.S3({
  accessKeyId: process.env.MINIO_ACCESS_KEY,
  secretAccessKey: process.env.MINIO_SECRET_KEY,
  endpoint: process.env.MINIO_ENDPOINT,
  region: process.env.AWS_REGION || "us-east-1", // Use uma região padrão
  s3ForcePathStyle: true,
  signatureVersion: "v4",
});

// GET: Lista uploads de um card dentro de um contrato (anteriormente projeto)

// GET: Lista uploads de um card dentro de um contrato
export const listUploads = async (req, res) => {
  // --- CORREÇÃO: Usar req.params para obter contractId e cardId ---
  const { contractId, cardId } = req.params;

  try {
    const posts = await Upload.find({ contractId, cardId })


    await Activity.create({
      action: "ACCESS",
      collectionType: "Uploads",
      documentId: cardId,
      user: req.user?._id,
      description: `Listou arquivos do card ${cardId} no contrato ${contractId}`,
      ip: req.ip,
      metadata: { contractId, cardId },
    });

    return res.json(posts);
  } catch (err) {
    console.error("Erro ao listar uploads:", err);
    await Activity.create({
      action: "ERROR",
      documentId: cardId,
      collectionType: "Uploads",
      description: `Erro ao listar uploads do card ${cardId} no contrato ${contractId}`,
      ip: req.ip,
      metadata: { error: err.message, contractId, cardId },
    });

    return res.status(500).json({ erro: true, mensagem: "Erro ao listar uploads." });
  }
};

export const listTrashs = async (req, res) => {
  // --- CORREÇÃO: Usar req.params para obter contractId e cardId ---
  const { contractId, cardId } = req.params;

  try {
    const posts = await TrashUpload.find({ contractId, cardId })


    await Activity.create({
      action: "ACCESS",
      collectionType: "TrashUpload",
      documentId: cardId,
      user: req.user?._id,
      description: `Listou arquivos do trash ${cardId} no contrato ${contractId}`,
      ip: req.ip,
      metadata: { contractId, cardId },
    });

    return res.json(posts);
  } catch (err) {
    console.error("Erro ao listar uploads:", err);
    await Activity.create({
      action: "ERROR",
      documentId: cardId,
      collectionType: "Uploads",
      description: `Erro ao listar uploads do trash ${cardId} no contrato ${contractId}`,
      ip: req.ip,
      metadata: { error: err.message, contractId, cardId },
    });

    return res.status(500).json({ erro: true, mensagem: "Erro ao listar uploads." });
  }
};

// POST: Upload de arquivo com log
export const uploadFile = async (req, res) => {
  try {

    const { originalname: name, size, key, location: url = "" } = req.file;

    // Alterado de projectId para contractId, adicionado itemId
    const { contractId, cardId, itemId, description } = req.body;

    // Validação dos IDs obrigatórios e do usuário autenticado
    if (!contractId || !req.user || !req.user._id) {
      // Se o usuário não estiver autenticado ou contractId não for fornecido
      // Você pode querer deletar o arquivo recém-uploadado do armazenamento aqui
      if (process.env.STORAGE_TYPE === "s3") {
        await s3.deleteObject({
          Bucket: process.env.BUCKET_NAME,
          Key: key
        }).promise();
      } else {
        // Certifique-se que __dirname está corretamente definido para o ambiente ES Modules
        const filePath = path.resolve(process.cwd(), "tmp", "uploads", key);
        await unlinkAsync(filePath);
      }
      return res.status(400).json({
        erro: true,
        mensagem: "ID do contrato e usuário autenticado são obrigatórios."
      });
    }

    const post = await Upload.create({
      name: sanitizeFilenameBackend(name),
      size,
      key,
      url,
      contractId, // Usando contractId
      cardId: cardId || null, // Garante que seja null se não for fornecido
      itemId: itemId || null, // Garante que seja null se não for fornecido
      description,
      uploadedBy: req.user._id, // Armazena o ID do usuário que fez o upload
    });

    await Activity.create({
      action: "CREATE",
      collectionType: "Uploads",
      documentId: post._id, // ID do upload criado
      user: req.user?._id,
      description: `Upload de arquivo "${name}" para card ${cardId} do contrato ${contractId}`,
      ip: req.ip,
      metadata: { size, key, contractId, cardId, itemId },
    });

    return res.json(post);
  } catch (err) {
    console.error("Erro ao fazer upload:", err);
    await Activity.create({
      action: "ERROR",
      collectionType: "Uploads",
      documentId: null, // não temos um ID de upload válido aqui
      description: "Erro ao fazer upload de arquivo",
      ip: req.ip,
      metadata: { error: err.message },
    });

    return res.status(500).json({ erro: true, mensagem: "Erro ao fazer upload do arquivo." });
  }
};

// DELETE: Mover para a lixeira (soft delete)
export const deleteUpload = async (req, res) => {
  try {
    const post = await Upload.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ erro: true, mensagem: "Arquivo não encontrado." });
    }

    // 1. Mover o arquivo no MinIO/S3 para o bucket de lixeira
    if (process.env.STORAGE_TYPE === 's3') {
      await s3.copyObject({
        Bucket: process.env.BUCKET_TRASH_NAME, // Bucket de destino (lixeira)
        CopySource: `${process.env.BUCKET_NAME}/${post.key}`, // Arquivo original
        Key: post.key, // Mantém a mesma chave
      }).promise();

      await s3.deleteObject({
        Bucket: process.env.BUCKET_NAME, // Deleta do bucket original
        Key: post.key,
      }).promise();

      console.log(`Arquivo ${post.key} movido para o bucket de lixeira.`);
    } else {
      // Para armazenamento local, você precisaria mover o arquivo fisicamente
      // entre diretórios.
      const oldPath = path.resolve(process.cwd(), "tmp", "uploads", post.key);
      const newPath = path.resolve(process.cwd(), "tmp", "trash", post.key); // Crie a pasta 'trash'

      // Garante que o diretório de lixeira exista
      const trashDir = path.resolve(process.cwd(), "tmp", "trash");
      if (!fs.existsSync(trashDir)) {
        fs.mkdirSync(trashDir, { recursive: true }); // Cria recursivamente
      }

      await promisify(fs.rename)(oldPath, newPath);
      console.log(`Arquivo ${post.key} movido para a lixeira local.`);
    }

    // 2. Criar um registro na coleção TrashUploads
    const trashRecord = await TrashUpload.create({
      name: post.name,
      size: post.size,
      key: post.key,
      url: `${process.env.MINIO_ENDPOINT}/${process.env.BUCKET_TRASH_NAME}/${post.key}`, // URL no bucket de lixeira
      description: post.description,
      originalUploadId: post._id,
      contractId: post.contractId,
      cardId: post.cardId,
      itemId: post.itemId,
      uploadedBy: post.uploadedBy,
      deletedBy: req.user?._id, // Usuário que está movendo para a lixeira
      deletedAt: new Date(),
    });

    // 3. Remover o registro original da coleção Uploads
    // Usamos deleteOne para evitar o hook pre('remove') que deletaria o arquivo
    // do bucket principal, já que já o movemos.
    await Upload.deleteOne({ _id: req.params.id });

    await Activity.create({
      action: "DELETE", // Ação de "deleção lógica"
      collectionType: "Uploads",
      documentId: post._id,
      user: req.user?._id,
      description: `Arquivo "${post.name}" movido para a lixeira`,
      ip: req.ip,
      metadata: { contractId: post.contractId, cardId: post.cardId, itemId: post.itemId },
    });

    return res.status(200).json({ mensagem: "Arquivo movido para a lixeira com sucesso.", trashRecord });
  } catch (err) {
    console.error("Erro ao mover upload para a lixeira:", err);
    await Activity.create({
      action: "ERROR",
      collectionType: "Uploads",
      description: "Erro ao mover arquivo para a lixeira",
      ip: req.ip,
      metadata: { error: err.message, id: req.params.id },
    });

    return res.status(500).json({ erro: true, mensagem: "Erro ao mover arquivo para a lixeira." });
  }
};

// NOVO: Obter um upload específico (show)
export const showUpload = async (req, res) => {
  try {
    const { id } = req.params;
    const upload = await Upload.findById(id)
      .populate("uploadedBy", "nameOfTheUser username")
      .populate("contractId", "name")
      .populate("cardId", "title")
      .populate("itemId", "description");

    if (!upload) {
      return res.status(404).json({ erro: true, mensagem: "Upload não encontrado." });
    }
    return res.json(upload);
  } catch (err) {
    console.error("Erro ao buscar upload:", err);
    return res.status(500).json({ erro: true, mensagem: "Erro ao buscar upload." });
  }
};

// NOVO: Atualizar metadados de um upload (ex: descrição)
export const updateUpload = async (req, res) => {
  try {
    const { id } = req.params;
    const { description } = req.body; // Apenas a descrição pode ser atualizada aqui

    const upload = await Upload.findByIdAndUpdate(
      id, { description }, { new: true, runValidators: true }
    );

    if (!upload) {
      return res.status(404).json({ erro: true, mensagem: "Upload não encontrado." });
    }

    await Activity.create({
      action: "UPDATE",
      collectionType: "Uploads",
      documentId: upload._id,
      user: req.user?._id,
      description: `Descrição do arquivo "${upload.name}" atualizada`,
      ip: req.ip,
      metadata: { newDescription: description },
    });

    return res.json(upload);
  } catch (err) {
    console.error("Erro ao atualizar upload:", err);
    return res.status(500).json({ erro: true, mensagem: "Erro ao atualizar upload." });
  }
};

// NOVO: Deletar permanentemente da lixeira
export const permanentDeleteUpload = async (req, res) => {
  try {
    const { id } = req.params; // ID do registro em TrashUploads
    const trashUpload = await TrashUpload.findById(id);

    if (!trashUpload) {
      return res.status(404).json({ erro: true, mensagem: "Registro de lixeira não encontrado." });
    }

    // O hook pre('remove') do TrashUploadSchema já cuidará da deleção do arquivo do MinIO/local
    await trashUpload.deleteOne(); // Isso aciona o hook pre('remove') no TrashUploadSchema

    await Activity.create({
      action: "PERMANENT_DELETE",
      collectionType: "TrashUploads",
      documentId: trashUpload._id,
      user: req.user?._id,
      description: `Arquivo "${trashUpload.name}" deletado permanentemente da lixeira`,
      ip: req.ip,
      metadata: { originalUploadId: trashUpload.originalUploadId },
    });

    return res.status(200).json({ mensagem: "Arquivo deletado permanentemente da lixeira." });
  } catch (err) {
    console.error("Erro ao deletar permanentemente da lixeira:", err);
    return res.status(500).json({ erro: true, mensagem: "Erro ao deletar permanentemente da lixeira." });
  }
};