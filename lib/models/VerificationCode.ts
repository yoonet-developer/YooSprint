import mongoose from 'mongoose';

const verificationCodeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  userName: {
    type: String,
    required: true,
  },
  userEmail: {
    type: String,
    required: true,
  },
  department: {
    type: String,
    default: '',
  },
  code: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'verified', 'expired'],
    default: 'pending',
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 60, // Auto-delete after 1 minute
  },
});

const VerificationCode = mongoose.models.VerificationCode || mongoose.model('VerificationCode', verificationCodeSchema);

export default VerificationCode;
