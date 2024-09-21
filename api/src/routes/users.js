import express from 'express';
const router = express.Router()
import { logger } from '../logger.js';

import { User } from '../models/User.js';
import { Provider } from '../models/Provider.js';

import { auth as verifyToken } from '../verifyToken.js';
import { validator } from '../validations/validator.js';
import { jobServices } from '../jobs/jobServices.js';

// GET: List all users
router.get('/api/users',
    verifyToken,
    validator.validate('get', '/api/users'),
    async (req, res) => {
        try {
            // Fetch all users
            const users = await User.find();
            logger.debug("Users fetched: " + JSON.stringify(users));
            res.send(users);
        } catch (err) {
            logger.error(err.message)
            res.status(500).send({ message: err });
        }
    })

// GET: Retrieve details of a specific user
router.get('/api/users/:userId',
    verifyToken,
    validator.validate('get', '/api/users/{userId}'),
    async (req, res) => {
        try {
            const user = await User.findById(req.params.userId);
            if (!user) {
                return res.status(404).send({ message: 'User not found' });
            }
            logger.debug("User fetched: " + JSON.stringify(user));
            return res.send(user);
        } catch (err) {
            logger.error(err.message)
            res.status(400).send({ message: err })
        }
    })

// PUT: Update details of a specific user 
router.patch('/api/users/:userId',
    verifyToken,
    validator.validate('patch', '/api/users/{userId}'),
    async (req, res) => {
        var update = {};
        try {
            const user = await User.findById(req.params.userId);
            if (!user) {
                return res.status(404).send({ message: 'User not found' });
            }

            if (req.body.username !== undefined) {
                update.username = req.body.username
            }
            if (req.body.email !== undefined) {
                update.email = req.body.email
            }
            const updateUserById = await User.updateOne(
                { _id: req.params.userId },
                {
                    $set: update
                }
            )
            logger.debug("User updated: " + JSON.stringify(updateUserById));
            res.send({ message: 'User updated' });
        } catch (err) {
            logger.error(err.message)
            res.status(400).send({ message: err })
        }
    })

// DELETE: Remove a user
router.delete('/api/users/:userId',
    verifyToken,
    validator.validate('delete', '/api/users/{userId}'),
    async (req, res) => {
        try {
            const deleteById = await User.deleteOne(
                { _id: req.params.userId }
            )
            if (deleteById.deletedCount != 1) {
                return res.status(400).send({ message: 'Failed to delete user' })
            }
            logger.debug("User deleted: " + JSON.stringify(deleteById));
            res.send({ message: 'User deleted' });
        } catch (err) {
            logger.error(err.message);
            res.status(400).send({ message: err })
        }
    })

// POST: Sync user listings
router.post('/api/users/:userId/sync',
    verifyToken,
    validator.validate('post', '/api/users/{userId}/sync'),
    async (req, res) => {
        try {
            const user = await User.findById(req.params.userId);
            if (!user) {
                return res.status(404).send({ message: 'User not found' });
            }

            const providers = await Provider.find({ userId: req.params.userId });
            const providersList = providers.map(provider => provider.provider);
            if (providersList.includes('airbnb')) {
                // Create a new job to sync listings from Airbnb                
                logger.info("Create Airbnb sync job")
                await jobServices.every('2 minutes', "sync-provider", { userId: req.params.userId, provider: 'airbnb' });
            }
            // if (providersList.includes('booking')) {
                // Create a new job to sync listings from Booking
                // logger.info("Create Booking sync job")
                // await jobServices.every('2 minutes', "sync-provider", { userId: req.params.userId, provider: 'booking' });
            // }

            logger.info("User account synced");
            res.send({ message: 'User account synced' });
        } catch (err) {
            logger.error(err.message)
            res.status(500).send({ message: err });
        }
    })

export { router as users }