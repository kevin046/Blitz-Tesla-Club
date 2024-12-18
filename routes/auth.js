const express = require('express');
const User = require('../models/User');

const router = express.Router();

router.get('/verify/:token', async (req, res) => {
  try {
    const token = req.params.token;
    const user = await User.findOne({ verificationToken: token });

    if (!user) {
      return res.status(400).send('Invalid verification token');
    }

    // Update user verification status and membership
    user.isVerified = true;
    user.membershipStatus = 'active';
    user.verificationToken = undefined;
    await user.save();

    res.redirect('/login?verified=true');
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).send('Error during verification');
  }
});

module.exports = router; 