import express from 'express';
const router = express.Router()
import { logger } from '../logger.js'

import { Provider } from '../models/Provider.js'

import { auth as verifyToken } from '../verifyToken.js'
import { validator } from '../validations/validator.js'
import { agenda } from '../jobs/agenda.js';

// POST: Create provider
router.post('/api/providers',
    verifyToken,
    validator.validate('post', '/api/providers'),
    async (req, res) => {
        try {
            // Check if provider already exists
            const providerExists = await Provider.findOne({ provider: req.body.provider })
            if (providerExists) {
                return res.status(400).send({ message: 'Provider already exists' })
            }
            // Save provider on DB
            const provider = new Provider({
                provider: req.body.provider,
                userId: req.body.userId
            })
            const savedProvider = await provider.save()
            logger.info("Provider registered")
            return res.send(savedProvider)
        } catch (err) {
            logger.error(err.message)
            return res.status(500).send({ message: err })
        }
    })

// DELETE: Delete provider
router.delete('/api/providers',
    verifyToken,
    validator.validate('delete', '/api/providers'),
    async (req, res) => {
        try {
            // Check if provider already exists
            const providerExists = await Provider.findOne({ provider: req.body.provider })
            if (!providerExists) {
                return res.status(404).send({ message: 'Provider not found' })
            }

            const deleteById = await Provider.deleteOne(
                { provider: req.body.provider, userId: req.body.userId }
            )
            if (deleteById.deletedCount != 1) {
                return res.status(400).send({ message: 'Failed to delete provider' })
            }

            // Delete sync schedules linked to user and provider
            const query = {
                'data.userId': providerExists.userId,
                'data.provider': providerExists.provider
            }
            agenda.cancel(query, (err, numRemoved) => {
                if (err) {
                    logger.error(err);
                } else {
                    logger.info(`removed ${numRemoved} jobs`);
                }
            });

            return res.send({ message: 'Provider deleted' })
        } catch (err) {
            logger.error(err.message)
            return res.status(500).send({ message: err })
        }
    })

export { router as providers }