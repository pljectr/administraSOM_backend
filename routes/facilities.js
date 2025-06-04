import express from 'express';
import {
  createFacility,
  getAllFacilities,
  getFacilityById,
  updateFacility,
  deleteFacility
} from '../controllers/facilityController.js';

const router = express.Router();

router.post('/', createFacility);
router.get('/', getAllFacilities);
router.get('/:id', getFacilityById);
router.put('/:id', updateFacility);
router.delete('/:id', deleteFacility);

export default router;
