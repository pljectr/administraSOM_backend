const mongoose = require("mongoose");
const aws = require("aws-sdk");
const fs = require("fs");
const path = require("path");
const { promisify } = require("util");

const s3 = new aws.S3();

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
  createdAt: {
    type: Date,
    default: Date.now
  }
});

DocumentSchema.pre("save", function() {
  if (!this.url) {
    this.url = `${process.env.APP_URL}/files/${this.key}`;
  } //se não tem URL, ou seja, se eu salvo no storage, eu darei o caminho localhost (ou a URL definida em .env) e crio uma route
});

DocumentSchema.pre("remove", function() {
  if (process.env.STORAGE_TYPE === "s3") { //faço essa função para o caso de storage s3
    return s3
      .deleteObject({
        Bucket: process.env.BUCKET_NAME,
        Key: this.key
      })
      .promise()
      .then(response => {
        console.log(response.status);
      })
      .catch(response => {
        console.log(response.status);
      });
  } else {
    return promisify(fs.unlink)( //deleta imagens locais!
      path.resolve(__dirname, "..", "tmp", "uploads", this.key)
    );
  }
});

module.exports = mongoose.model("Uploads", DocumentSchema);
