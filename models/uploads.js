const mongoose = require("mongoose");
const aws = require("aws-sdk");
const fs = require("fs");
const path = require("path");
const { promisify } = require("util");

//const s3 = new aws.S3();

const s3 = new aws.S3({
  accessKeyId: process.env.MINIO_ACCESS_KEY,
  secretAccessKey: process.env.MINIO_SECRET_KEY,
  endpoint: process.env.MINIO_ENDPOINT, // 
  region: process.env.AWS_REGION || "us-east-1",
  s3ForcePathStyle: true,
  signatureVersion: "v4",
});


const DocumentSchema = new mongoose.Schema({
  name: String,
  size: Number,
  key: String,
  url: String,
  description: String,
  objectId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false, // logins anônimos não têm user
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false, // logins anônimos não têm user
  },
  cardId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false, // logins anônimos não têm user
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

DocumentSchema.pre("save", function () {
  if (!this.url) {
    this.url = process.env.STORAGE_TYPE === "s3" ? `http://10.25.120.113:9001/${process.env.BUCKET_NAME}/${this.key}` : `${process.env.APP_URL}/files/${this.key}`;
  } //se não tem URL, ou seja, se eu salvo no storage, eu darei o caminho localhost (ou a URL definida em .env) e crio uma route
});

DocumentSchema.pre("remove", function () {
  if (process.env.STORAGE_TYPE === "s3") {
    return s3.deleteObject({
      Bucket: process.env.BUCKET_NAME,
      Key: this.key,
    }).promise().then(response => {
      console.log("Arquivo deletado do MinIO:", this.key);
    }).catch(error => {
      console.error("Erro ao deletar do MinIO:", error);
    });
  } else {
    return promisify(fs.unlink)(
      path.resolve(__dirname, "..", "tmp", "uploads", this.key)
    );
  }
});

module.exports = mongoose.model("Uploads", DocumentSchema);
