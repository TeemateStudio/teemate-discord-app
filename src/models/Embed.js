import mongoose from 'mongoose';

const embedSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  data: {
    title: { type: String, default: '' },
    description: { type: String, default: '' },
    url: { type: String, default: '' },
    color: { type: Number, default: 0x5865F2 },
    timestamp: { type: Boolean, default: false },
    author: {
      name: { type: String, default: '' },
      url: { type: String, default: '' },
      icon_url: { type: String, default: '' },
    },
    footer: {
      text: { type: String, default: '' },
      icon_url: { type: String, default: '' },
    },
    thumbnail: {
      url: { type: String, default: '' },
    },
    image: {
      url: { type: String, default: '' },
    },
    fields: [{
      name: { type: String, required: true },
      value: { type: String, required: true },
      inline: { type: Boolean, default: false },
    }],
  },
  channelId: { type: String, default: null },
  createdBy: { type: String, default: null },
  updatedBy: { type: String, default: null },
}, { timestamps: true });

embedSchema.index({ guildId: 1, name: 1 }, { unique: true });

export default mongoose.model('Embed', embedSchema);
