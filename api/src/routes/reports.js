import express from 'express';
const router = express.Router()
import { logger } from '../logger.js'

import { Report } from '../models/Report.js'

import { auth as verifyToken } from '../verifyToken.js'
import { validator } from '../validations/validator.js'

// GET: Get reports
router.get('/api/reports',
    verifyToken,
    validator.validate('get', '/api/reports'),
    async (req, res) => {
        try {
            let filter = {};
            if (req.query.reservationId) {
                filter.reservationId = req.query.reservationId;
            }
            const reports = await Report.find(filter);
            res.json(reports);
        } catch (error) {
            logger.error(error);
            res.status(500).send({ message: 'Internal server error' });
        }
    }
);

export { router as reports };