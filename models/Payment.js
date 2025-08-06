const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  order_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Order', 
    required: true 
  },
  user_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  amount: { 
    type: Number, 
    required: true 
  },
  paymentType: { 
    type: String, 
    default: 'VNPay' 
  },
  status: { 
    type: String, 
    enum: ['pending', 'completed', 'failed', 'cancelled'], 
    default: 'pending' 
  },
  transactionRef: { 
    type: String 
  },
  responseData: { 
    type: mongoose.Schema.Types.Mixed 
  },
  paymentDate: { 
    type: Date 
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Payment', paymentSchema); 