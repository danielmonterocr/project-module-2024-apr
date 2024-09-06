import express from 'express';
const router = express.Router()
import { logger } from '../logger.js'

import { Device } from '../models/Device.js'

import { auth as verifyToken } from '../verifyToken.js'
import { validator } from '../validations/validator.js'

// POST: Create device
router.post('/api/devices',
    verifyToken,
    validator.validate('post', '/api/devices'),
    async (req, res) => {
        try {
            // Check if device already exists
            const deviceExists = await Device.findOne({ deviceId: req.body.deviceId })
            if (deviceExists) {
                return res.status(400).send({ message: 'Device already exists' })
            }
            // Save device on DB
            const device = new Device({
                deviceId: req.body.deviceId,
                userId: req.body.userId
            })
            const savedDevice = await device.save()
            return res.send(savedDevice)
        } catch (err) {
            logger.error(err.message)
            return res.status(500).send({ message: err })
        }
    })

// GET: Get all devices
router.get('/api/devices',
    verifyToken,
    async (req, res) => {
        try {
            const devices = await Device.find()
            return res.send(devices)
        } catch (err) {
            logger.error(err.message)
            return res.status(500).send({ message: err })
        }
    })

// GET: Get device by ID
router.get('/api/devices/:id',
    verifyToken,
    async (req, res) => {
        try {
            const device = await Device.findById(req.params.id)
            if (!device) {
                return res.status(404).send({ message: 'Device not found' })
            }
            return res.send(device)
        } catch (err) {
            logger.error(err.message)
            return res.status(500).send({ message: err })
        }
    })

export { router as devices };