const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true,
        unique: true
    },
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
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    memberId: {
        type: String,
        required: true,
        unique: true
    },
    membershipStatus: {
        type: String,
        enum: ['pending', 'active', 'expired'],
        default: 'pending'
    },
    membershipType: {
        type: String,
        enum: ['standard', 'premium'],
        default: 'standard'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    lastLogin: Date
});

module.exports = mongoose.model('User', userSchema); 