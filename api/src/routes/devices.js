import express from 'express';
const router = express.Router()
import { logger } from '../logger.js'
import { THINGSBOARD_URL, PROVISION_DEVICE_KEY, PROVISION_DEVICE_SECRET } from '../constants/config.js'

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

            // Create device in ThingsBoard
            const payload = {
                "deviceName": req.body.deviceName,
                "provisionDeviceKey": PROVISION_DEVICE_KEY,
                "provisionDeviceSecret": PROVISION_DEVICE_SECRET
            }

            logger.info("Calling ThingsBoard API with payload: " + JSON.stringify(payload));
            const response = await fetch(THINGSBOARD_URL + '/api/v1/provision', {
                method: 'post',
                body: JSON.stringify(payload),
            });

            const data = await response.json();
            logger.info("Response from ThingsBoard API: " + JSON.stringify(data));

            if (response.status === 200) {
                // Save device on DB
                const device = new Device({
                    deviceName: req.body.deviceName,
                    deviceType: req.body.deviceType,
                    deviceToken: data.credentialsValue,
                    listingId: req.body.listingId
                })
                const savedDevice = await device.save()
                return res.send(savedDevice)
            }

            return res.status(500).send({ message: 'Error creating device' })
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