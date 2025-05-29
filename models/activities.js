import mongoose from "mongoose";

const ActivitySchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      enum: [
        "CREATE",
        "UPDATE",
        "DELETE",
        "REGISTER",
        "LOGIN",
        "LOGOUT",
        "PASSWORD_CHANGE",
        "ERROR",
        "REGISTER_ERROR",
        "ACCESS",
        'LOGIN_FAIL'
      ],
    },

    collectionType: {
      type: String,
      required: true,
    },

    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false, // pode ser null para ações como login/logout
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: false, // logins anônimos não têm user
    },

    description: {
      type: String,
      required: true,
    },

    timestamp: {
      type: Date,
      default: Date.now,
    },

    ip: {
      type: String,
    },

    metadata: {
      type: Object,
      default: {},
    },
  },
  {
    collectionType: "activities",
     timestamps: true, // cria createdAt e updatedAt automaticamente
  }
);

export default mongoose.model("Activity", ActivitySchema);
