import express from 'express';
const router = express.Router()
import { logger } from '../logger.js'

import { Consumption } from '../models/Consumption.js'

import { auth as verifyToken } from '../verifyToken.js'
import { validator } from '../validations/validator.js'

// GET: Get consumptions
router.get('/api/consumptions',
    verifyToken,
    validator.validate('get', '/api/consumptions'),
    async (req, res) => {
        try {
            let filter = {};
            if (req.query.reservationId) {
                filter.reservationId = req.query.reservationId;
            }
            const consumptions = await Consumption.find(filter);
            res.json(consumptions);
        } catch (error) {
            logger.error(error);
            res.status(500).send({ message: 'Internal server error' });
        }
    }
);

export { router as consumptions };