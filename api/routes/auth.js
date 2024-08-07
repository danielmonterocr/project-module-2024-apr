const express = require('express')
const router = express.Router()

const User = require('../models/User')
const { registerValidation, loginValidation } = require('../validations/validation')

const bcryptjs = require('bcryptjs')
const jsonwebtoken = require('jsonwebtoken')

// POST: Create user
router.post('/register', async (req, res) => {
    const { error } = registerValidation(req.body)
    if (error) {
        return res.status(400).send({ message: error.details[0].message.replace(/"/g, '') })
    }

    // Check if user already exists
    const userExists = await User.findOne({ email: req.body.email })
    if (userExists) {
        return res.status(400).send({ message: 'User already exists' })
    }

    // Generate salt and encrypt password
    const salt = await bcryptjs.genSalt(5)
    const hashedPassword = await bcryptjs.hash(req.body.password, salt)

    try {
        // Save user on DB
        const user = new User({
            username: req.body.username,
            email: req.body.email,
            password: hashedPassword
        })
        const savedUser = await user.save()
        return res.send(savedUser)
    } catch (err) {
        return res.status(400).send({ message: err })
    }
})

// POST: Create token
router.post('/login', async (req, res) => {
    const { error } = loginValidation(req.body)
    if (error) {
        return res.status(400).send({ message: error.details[0].message.replace(/"/g, '') })
    }

    // Check if user exists
    const user = await User.findOne({ email: req.body.email })
    if (!user) {
        return res.status(400).send({ message: 'User does not exists' })
    }

    // Validate password
    const passwordValidation = await bcryptjs.compare(req.body.password, user.password)
    if (!passwordValidation) {
        return res.status(400).send({ message: 'Password is wrong' })
    }

    // Generate token
    const token = jsonwebtoken.sign({ _id: user._id }, process.env.TOKEN_SECRET)
    return res.header('auth-token', token).send({ 'auth-token': token })
})

module.exports = router