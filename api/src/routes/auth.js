import { SWAGGER_PATH } from '../constants/config.js';
import express from 'express';
const router = express.Router()
import { logger } from '../logger.js'

import { User } from '../models/User.js'
import { registerValidation, loginValidation } from '../validations/validation.js'

import bcryptjs from 'bcryptjs'
import jsonwebtoken from 'jsonwebtoken'

import jsYaml from 'js-yaml';
import fs from 'fs';
import { OpenApiValidator } from 'express-openapi-validate';

// Load the OpenAPI document
const openApiDocument = jsYaml.load(fs.readFileSync(SWAGGER_PATH, 'utf-8'));

// Construct the validator with some basic options
const validator = new OpenApiValidator(openApiDocument,
    {
        ajvOptions: {
            allErrors: true,
            removeAdditional: "all",
        }
    }
);

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
            return res.send(savedUser)
        } catch (err) {
            logger.error(err.message)
            return res.status(400).send({ message: err })
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
            return res.header('token', token).send({ message: 'User logged in' })
        } catch (err) {
            logger.error(err.message)
            return res.status(400).send({ message: err })
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