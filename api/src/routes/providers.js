import express from 'express';
const router = express.Router()
import { logger } from '../logger.js'

import { Provider } from '../models/Provider.js'

import { auth as verifyToken } from '../verifyToken.js'
import { validator } from '../validations/validator.js'

// POST: Create listing
router.post('/api/providers',
    verifyToken,
    validator.validate('post', '/api/providers'),
    async (req, res) => {
        try {
            // Check if provider already exists
            const providerExists = await Provider.findOne({ providerId: req.body.providerId })
            if (providerExists) {
                return res.status(400).send({ message: 'Provider already exists' })
            }
            console.log('providerExists');
            // Save listing on DB
            const provider = new Provider({
                providerId: req.body.providerId,
                userId: req.body.userId
            })
            const savedProvider = await provider.save()
            return res.send(savedProvider)
        } catch (err) {
            logger.error(err.message)
            return res.status(500).send({ message: err })
        }
    })

export { router as providers }