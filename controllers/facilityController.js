import Facility from '../models/facilities.js';
import Activity from '../models/activities.js';

export const createFacility = async (req, res) => {
  try {
    const newFacility = await Facility.create(req.body);
    await Activity.create({
      action: 'CREATE',
      collectionType: 'Facilities',
      documentId: newFacility._id,
      user: req.user?._id,
      description: `Criada nova Facility: ${newFacility.name}`,
      ip: req.ip,
    });
    res.status(201).json(newFacility);
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: true, mensagem: 'Erro ao criar Facility.' });
  }
};

export const getAllFacilities = async (req, res) => {
  try {
    const facilities = await Facility.find();
    res.json(facilities);
  } catch (error) {
    res.status(500).json({ erro: true, mensagem: 'Erro ao buscar Facilities.' });
  }
};

export const getFacilityById = async (req, res) => {
  try {
    const facility = await Facility.findById(req.params.id);
    if (!facility) {
      return res.status(404).json({ erro: true, mensagem: 'Facility não encontrada.' });
    }
    res.json(facility);
  } catch (error) {
    res.status(500).json({ erro: true, mensagem: 'Erro ao buscar Facility.' });
  }
};

export const updateFacility = async (req, res) => {
  try {
    const updated = await Facility.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ erro: true, mensagem: 'Facility não encontrada.' });

    await Activity.create({
      action: 'UPDATE',
      collectionType: 'Facilities',
      documentId: updated._id,
      user: req.user?._id,
      description: `Atualizada Facility: ${updated.name}`,
      ip: req.ip,
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ erro: true, mensagem: 'Erro ao atualizar Facility.' });
  }
};

export const deleteFacility = async (req, res) => {
  try {
    const deleted = await Facility.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ erro: true, mensagem: 'Facility não encontrada.' });

    await Activity.create({
      action: 'DELETE',
      collectionType: 'Facilities',
      documentId: deleted._id,
      user: req.user?._id,
      description: `Deletada Facility: ${deleted.name}`,
      ip: req.ip,
    });

    res.json({ mensagem: 'Facility deletada com sucesso!' });
  } catch (error) {
    res.status(500).json({ erro: true, mensagem: 'Erro ao deletar Facility.' });
  }
};
