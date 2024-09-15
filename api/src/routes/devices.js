import express from 'express';
const router = express.Router()
import { logger } from '../logger.js'
import { THINGSBOARD_URL } from '../constants/config.js'

import { Device } from '../models/Device.js'
import { getUserJwtToken, getDeviceKeyAndSecret} from '../utils/thingsboard-utils.js';

import { auth as verifyToken } from '../verifyToken.js'
import { validator } from '../validations/validator.js'

// POST: Create device
router.post('/api/devices',
    verifyToken,
    validator.validate('post', '/api/devices'),
    async (req, res) => {
        try {
            // Check if device already exists
            const deviceExists = await Device.findOne({ deviceName: req.body.deviceName })
            if (deviceExists) {
                return res.status(400).send({ message: 'Device already exists' })
            }

            // Get device key and device secret
            const deviceKeyAndSecret = await getDeviceKeyAndSecret();

            // Create device in ThingsBoard
            const payload = {
                "deviceName": req.body.deviceName,
                "provisionDeviceKey": deviceKeyAndSecret.key,
                "provisionDeviceSecret": deviceKeyAndSecret.secret,
            }

            logger.info("Calling ThingsBoard API with payload: " + JSON.stringify(payload));
            const response1 = await fetch(THINGSBOARD_URL + '/api/v1/provision', {
                method: 'post',
                body: JSON.stringify(payload),
            });

            const data1 = await response1.json();
            logger.info("Response from ThingsBoard API: " + JSON.stringify(data1));

            if (data1.status !== 'SUCCESS') return res.status(500).send({ message: data1.errorMsg })

            const token = await getUserJwtToken();

            logger.info("Calling ThingsBoard API");
            const response2 = await fetch(THINGSBOARD_URL + '/api/tenant/devices?deviceName=' + req.body.deviceName, {
                method: 'get',
                headers: {'X-Authorization': 'Bearer ' + token}
            });

            const data2 = await response2.json();
            logger.info("Response from ThingsBoard API: " + JSON.stringify(data2));

            if (response2.status === 200) {
                // Save device on DB
                const device = new Device({
                    deviceName: req.body.deviceName,
                    deviceType: req.body.deviceType,
                    deviceToken: data1.credentialsValue,
                    listingId: req.body.listingId,
                    deviceId: data2.id.id
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