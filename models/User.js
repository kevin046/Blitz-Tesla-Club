const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    verified: {
        type: Boolean,
        default: false
    },
    verificationToken: String,
    verificationExpires: Date,
    createdAt: {
        type: Date,
        default: Date.now
    },
    lastLogin: Date,
    membershipStatus: {
        type: String,
        enum: ['pending', 'active', 'suspended'],
        default: 'pending'
    }
});

module.exports = mongoose.model('User', userSchema); 