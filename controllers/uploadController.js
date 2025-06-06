import Upload from '../models/uploads.js';
import Activity from '../models/activities.js';

import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import AWS from 'aws-sdk';

const unlinkAsync = promisify(fs.unlink);
const __dirname = path.resolve();

// GET: Lista uploads de um card dentro de um projeto
export const listUploads = async (req, res) => {
  const { projectId, cardId } = req.params;

  try {
    // Busca apenas arquivos vinculados a esse projeto e card
    const posts = await Upload.find({ projectId, cardId });

    await Activity.create({
      action: "ACCESS",
      collectionType: "Uploads",
      documentId: cardId,
      user: req.user?._id,
      description: `Listou arquivos do card ${cardId} no projeto ${projectId}`,
      ip: req.ip,
      metadata: { projectId, cardId },
    });

    return res.json(posts);
  } catch (err) {
    console.error("Erro ao listar uploads:", err);
    await Activity.create({
      action: "ERROR",
      documentId: cardId,
      collectionType: "Uploads",
      description: `Erro ao listar uploads do card ${cardId} no projeto ${projectId}`,
      ip: req.ip,
      metadata: { error: err.message, projectId, cardId },
    });

    return res.status(500).json({ erro: true, mensagem: "Erro ao listar uploads." });
  }
};

// POST: Upload de arquivo com log
export const uploadFile = async (req, res) => {
  try {
    const { originalname: name, size, key, location: url = "" } = req.file;
    const { projectId, cardId, description } = req.body;

    if (!projectId || !cardId) {
      return res
        .status(400)
        .json({ erro: true, mensagem: "projectId e cardId são obrigatórios." });
    }

    const post = await Upload.create({
      name,
      size,
      key,
      url,
      projectId,
      cardId,
      description,
    });

    await Activity.create({
      action: "CREATE",
      collectionType: "Uploads",
      documentId: post.cardId,
      user: req.user?._id,
      description: `Upload de arquivo "${name}" para card ${cardId} do projeto ${projectId}`,
      ip: req.ip,
      metadata: { size, key, projectId, cardId },
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

// DELETE: com log de deleção
export const deleteUpload = async (req, res) => {
  try {
    const post = await Upload.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ erro: true, mensagem: "Arquivo não encontrado." });
    }

    // 🔧 Remove do MinIO ou local conforme STORAGE_TYPE
    if (process.env.STORAGE_TYPE === 's3') {
      const s3 = new AWS.S3({
        accessKeyId: process.env.MINIO_ACCESS_KEY,
        secretAccessKey: process.env.MINIO_SECRET_KEY,
        region: process.env.AWS_REGION,
        endpoint: process.env.MINIO_ENDPOINT,
        s3ForcePathStyle: true,
      });

      await s3
        .deleteObject({
          Bucket: process.env.BUCKET_NAME,
          Key: post.key,
        })
        .promise()
        .catch((err) => {
          console.warn("Erro ao deletar do MinIO:", err.message);
        });
    } else {
      const filePath = path.resolve(process.cwd(), "..", "backend", "tmp", "uploads", post.key);
      try {
        await unlinkAsync(filePath);
      } catch (err) {
        console.warn("Arquivo local não encontrado para remoção:", err.message);
      }
    }

    // Remove do banco
    await post.deleteOne();

    await Activity.create({
      action: "DELETE",
      collectionType: "Uploads",
      documentId: post.cardId,
      user: req.user?._id,
      description: `Arquivo "${post.name}" deletado`,
      ip: req.ip,
      metadata: { projectId: post.projectId, cardId: post.cardId },
    });

    return res.send();
  } catch (err) {
    console.error("Erro ao deletar upload:", err);
    await Activity.create({
      action: "ERROR",
      collectionType: "Uploads",
      description: "Erro ao deletar arquivo",
      ip: req.ip,
      metadata: { error: err.message, id: req.params.id },
    });

    return res.status(500).json({ erro: true, mensagem: "Erro ao deletar arquivo." });
  }
};
