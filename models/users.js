import mongoose from 'mongoose';
import passportLocalMongoose from 'passport-local-mongoose'


// usurários
const UserSchema = new mongoose.Schema({
  username: {type:String, unique: true, required:[true, 'forgot the Username!']}, //será o Email
  nameOfTheUser: {type:String, required:[true, 'forgot the name!']},
  userProfile: {type:String, required: [true, "Este campo é requisito!"], default:'Visitante',  enum:['Visitante', 'Admin', 'Chefe', 'Adjunto', 'Auxiliar']},
  userRole: {type:String, required: [true, "Este campo é requisito!"], default:'Militar',  enum:['Militar', 'Civil', 'Empresa', 'Engenheiro Civil', 'Engenheiro Eletricista', 'Engenheiro Mecânico', 'Engenheiro de Computação', 'Advogado', 'Arquiteto']},
  userPG: {type:String, required: [true, "Este campo é requisito!"], default:'Militar', enum:['Civil', 'Militar','Soldado', 'Cabo', 'Sargento', '1º Tenente', '2º Tenente', 'Capitão', 'Major', 'Tenente-Coronel', 'Coronel', 'General']},
  facility:{
    type: mongoose.Schema.Types.ObjectId,
    //required:[true, 'forgot the name!'],
    ref: 'Facility'
  },


  imageProfile:{ //profileImage
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Upload'
  },
});

UserSchema.plugin(passportLocalMongoose);

export default mongoose.model('Users', UserSchema)
