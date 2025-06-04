import mongoose from 'mongoose';

const FacilitySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  codom: {
    type: String,
    required: true,
  },
  codug: {
    type: String,
    required: true,
  },
  cnpj: {
    type: String,
  },
  nickname: {
    type: String,
    required: true,
  },
  location: {
    latitude: {
      type: Number,
      required: true,
    },
    longitude: {
      type: Number,
      required: true,
    }
  },
  geoAdress: {
    type: String,
    required: true,
  }
}, {
  timestamps: true // (opcional) adiciona createdAt e updatedAt automaticamente
});

export default mongoose.model('Facilities', FacilitySchema);
