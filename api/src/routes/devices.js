import express from 'express';
const router = express.Router()
import { logger } from '../logger.js'
import { THINGSBOARD_URL } from '../constants/config.js'

import { Device } from '../models/Device.js'
import thingsboardUtils from '../utils/thingsboard-utils.js';

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

            // Provision device on ThingsBoard
            const deviceKeyAndSecret = await thingsboardUtils.getDeviceKeyAndSecret();
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

            // Get tenant device info from ThingsBoard
            const token = await thingsboardUtils.getUserJwtToken();
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
                logger.debug("Device created: " + JSON.stringify(savedDevice));
                return res.send(savedDevice)
            }
            logging.error("Error creating device");
            return res.status(500).send({ message: 'Error creating device' })
        } catch (err) {
            logger.error(err.message)
            return res.status(500).send({ message: err })
        }
    })

// GET: Fetch all devices
router.get('/api/devices',
    verifyToken,
    validator.validate('get', '/api/devices'),
    async (req, res) => {
        try {
            let filter = {};
            if (req.query.deviceName) {
                filter.deviceName = req.query.deviceName;
            }
            if (req.query.deviceType){
                filter.deviceType = req.query.deviceType;
            }
            if (req.query.listingId) {
                filter.listingId = req.query.listingId;
            }
            const devices = await Device.find(filter)
            logger.debug("Devices fetched: " + JSON.stringify(devices));
            return res.send(devices)
        } catch (err) {
            logger.error(err.message)
            return res.status(500).send({ message: err })
        }
    })

// PATCH: Update device by ID
router.patch('/api/devices/:deviceId',
    verifyToken,
    validator.validate('patch', '/api/devices/{deviceId}'),
    async (req, res) => {
        var update = {};
        try {
            const device = await Device.findById(req.params.deviceId)
            if (!device) {
                return res.status(404).send({ message: 'Device not found' })
            }

            if (req.body.deviceName !== undefined) {
                update.deviceName = req.body.deviceName
            }
            if (req.body.deviceToken !== undefined) {
                update.deviceToken = req.body.deviceToken
            }
            if (req.body.deviceId !== undefined) {
                update.deviceId = req.body.deviceId
            }
            if (req.body.listingId !== undefined) {
                update.listingId = req.body.listingId
            } 
            const updateDeviceById = await Device.updateOne(
                { _id: req.params.deviceId },
                {
                    $set: update
                }
            )
            logger.debug("Device updated: " + JSON.stringify(updateDeviceById));
            return res.send(updateDeviceById)
        } catch (err) {
            logger.error(err.message)
            return res.status(500).send({ message: err })
        }
    })

export { router as devices };