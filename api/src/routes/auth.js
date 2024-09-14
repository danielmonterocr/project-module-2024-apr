import express from 'express';
const router = express.Router()
import { logger } from '../logger.js'

import { User } from '../models/User.js'

import bcryptjs from 'bcryptjs'
import jsonwebtoken from 'jsonwebtoken'

import { validator } from '../../src/validations/validator.js'

// POST: Create user
router.post('/api/users/register',
    validator.validate('post', '/api/users/register'),
    async (req, res) => {
        try {
            // Check if user already exists
            const userExists = await User.findOne({ email: req.body.email })
            if (userExists) {
                return res.status(400).send({ message: 'User already exists' })
            }

            // Generate salt and encrypt password
            const salt = await bcryptjs.genSalt(5)
            const hashedPassword = await bcryptjs.hash(req.body.password, salt)

            // Save user on DB
            const user = new User({
                username: req.body.username,
                email: req.body.email,
                password: hashedPassword
            })
            const savedUser = await user.save()
            logger.info("User registered")
            return res.status(201).send(savedUser)
        } catch (err) {
            logger.error(err.message)
            return res.status(500).send({ message: err })
        }
    })

// POST: Create token
router.post('/api/users/login',
    validator.validate('post', '/api/users/login'),
    async (req, res) => {
        try {
            // Check if user exists
            const user = await User.findOne({ email: req.body.email })
            if (!user) {
                return res.status(404).send({ message: 'User not found' })
            }

            // Validate password
            const passwordValidation = await bcryptjs.compare(req.body.password, user.password)
            if (!passwordValidation) {
                return res.status(400).send({ message: 'Password is wrong' })
            }

            // Generate token
            const token = jsonwebtoken.sign({ _id: user._id }, process.env.TOKEN_SECRET)
            logger.info("User logged in")
            return res.status(200).header('token', token).send({ message: 'User logged in' })
        } catch (err) {
            logger.error(err.message)
            return res.status(500).send({ message: err })
        }
    })

// add some error handling
router.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
        error: {
            name: err.name,
            message: err.message,
            data: err.data,
        },
    });
});

export { router as auth }