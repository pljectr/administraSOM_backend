// src/models/comments.js

import mongoose from "mongoose";

const MentionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Users",
    required: true
  },
  isResolved: {
    type: Boolean,
    default: false
  },
  resolvedAt: {
    type: Date,
    default: null
  }
}, { _id: false });

const CommentSchema = new mongoose.Schema({
  cardId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Cards",
    required: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Users",
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  attachments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Uploads"
  }],
  mentions: {
    type: [MentionSchema],
    default: []
  }
}, {
  timestamps: true // createdAt e updatedAt
});

// Método para marcar uma menção como resolvida
CommentSchema.methods.resolveMention = async function(userId) {
  const mention = this.mentions.find(m => m.userId.toString() === userId.toString());
  if (mention && !mention.isResolved) {
    mention.isResolved = true;
    mention.resolvedAt = new Date();
    await this.save();
  }
};

export default mongoose.model("Comments", CommentSchema);