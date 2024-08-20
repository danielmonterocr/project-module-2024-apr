import express from 'express';
const router = express.Router()
import { logger } from '../logger.js'

import { User } from '../models/User.js'
import { Listing } from '../models/Listing.js'

import { auth as verifyToken } from '../verifyToken.js'
import { validator } from '../validations/validator.js'

// GET: List all users
router.get('/api/users',
    verifyToken,
    validator.validate('get', '/api/users'),
    async (req, res) => {
        try {
            // Fetch all users
            const users = await User.find();
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

            return res.send(user);
        } catch (err) {
            logger.error(err.message)
            res.status(400).send({ message: err })
        }
    })

// PUT: Update details of a specific user 
router.patch('/api/users/:userId',
    // verifyToken,
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

            res.status(200).send({ message: 'User updated' });
        } catch (err) {
            logger.error(err.message)
            res.status(400).send({ message: err })
        }
    })

// DELETE: Delete a user
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

            res.status(200).send({ message: 'User deleted' });
        } catch (err) {
            logger.error(err.message)
            res.status(400).send({ message: err })
        }
    })

// POST: Sync user listings
router.post('/api/users/:userId/sync',
    // verifyToken,
    validator.validate('post', '/api/users/{userId}/sync'),
    async (req, res) => {
        try {
            const user = await User.findById(req.params.userId);
            if (!user) {
                return res.status(404).send({ message: 'User not found' });
            }

            // Call the function to import listings from Airbnb
            const listings = await importListingsFromAirbnb('data/airbnb.json');

            // Save each listing to MongoDB if it doesn't already exist
            const savePromises = listings.map(async (listing) => {
                const existingListing = await Listing.findOne({ userId: listing.userId, title: listing.title });

                if (!existingListing) {
                    const newListing = new Listing(listing);
                    return newListing.save();
                }
            });

            await Promise.all(savePromises);

            res.json({ listings });
        } catch (err) {
            logger.error(err.message)
            res.status(500).send({ message: err });
        }
    })

export { router as users }
