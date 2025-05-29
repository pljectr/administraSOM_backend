import Upload from '../models/uploads.js';
import Activity from '../models/activities.js';
import multer from 'multer';
import multerConfig from '../config/multer.js';

// GET: Lista uploads por pasta (objectId)
export const listUploads = async (req, res) => {
  const { objectId } = req.params;

  try {
    const posts = await Upload.find({ objectId });

    await Activity.create({
      action: "ACCESS",
      collectionType: "Uploads",
      documentId: null,
      user: req.user?._id,
      description: `Listou arquivos da pasta ${objectId}`,
      ip: req.ip,
      metadata: { objectId },
    });

    return res.json(posts);
  } catch (err) {
    console.error("Erro ao listar uploads:", err);
    await Activity.create({
      action: "ERROR",
      collectionType: "Uploads",
      description: `Erro ao listar uploads da pasta ${objectId}`,
      ip: req.ip,
      metadata: { error: err.message, objectId },
    });

    return res.status(500).json({ erro: true, mensagem: "Erro ao listar uploads." });
  }
};

// POST: Upload de arquivo com log
export const uploadFile = async (req, res) => {
  try {
    const { originalname: name, size, key, location: url = "" } = req.file;
    const { objectId, description } = req.body;

    if (!objectId) {
      return res.status(400).json({ erro: true, mensagem: "objectId da pasta é obrigatório." });
    }

    const post = await Upload.create({
      name,
      size,
      key,
      url,
      objectId,
      description,
    });

    await Activity.create({
      action: "CREATE",
      collectionType: "Uploads",
      documentId: post._id,
      user: req.user?._id,
      description: `Upload de arquivo "${name}" na pasta ${objectId}`,
      ip: req.ip,
      metadata: { size, key, objectId },
    });

    return res.json(post);
  } catch (err) {
    console.error("Erro ao fazer upload:", err);
    await Activity.create({
      action: "ERROR",
      collectionType: "Uploads",
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

    await post.remove();

    await Activity.create({
      action: "DELETE",
      collectionType: "Uploads",
      documentId: post._id,
      user: req.user?._id,
      description: `Arquivo "${post.name}" deletado`,
      ip: req.ip,
      metadata: { objectId: post.objectId },
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
