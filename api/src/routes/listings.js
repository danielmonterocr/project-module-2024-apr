import express from 'express';
const router = express.Router()
import { logger } from '../logger.js'

import { Listing } from '../models/Listing.js'

import { auth as verifyToken } from '../verifyToken.js'
import { validator } from '../validations/validator.js'
import { agenda } from '../jobs/agenda.js';
import { jobServices } from '../jobs/jobServices.js';

// POST: Create listing
router.post('/api/listings',
    verifyToken,
    validator.validate('post', '/api/listings'),
    async (req, res) => {
        try {
            // Check if listing already exists
            const listingExists = await Listing.findOne({ title: req.body.title })
            if (listingExists) {
                return res.status(400).send({ message: 'Listing already exists' })
            }

            // Save listing on DB
            const listing = new Listing({
                title: req.body.title,
                description: req.body.description,
                location: req.body.location,
                userId: req.body.userId
            })
            const savedListing = await listing.save()
            return res.send(savedListing)
        } catch (err) {
            logger.error(err.message)
            return res.status(500).send({ message: err })
        }
    })

// GET: List all listings
router.get('/api/listings',
    verifyToken,
    validator.validate('get', '/api/listings'),
    async (req, res) => {
        try {
            // Fetch all listings
            const listings = await Listing.find();
            res.send(listings);
        } catch (err) {
            logger.error(err.message)
            res.status(500).send({ message: err });
        }
    })

// GET: Retrieve details of a specific listing
router.get('/api/listings/:listingId',
    verifyToken,
    validator.validate('get', '/api/listings/{listingId}'),
    async (req, res) => {
        try {
            const listing = await Listing.findById(req.params.listingId);
            if (!listing) {
                return res.status(404).send({ message: 'Listing not found' });
            }

            return res.send(listing);
        } catch (err) {
            logger.error(err.message)
            res.status(500).send({ message: err })
        }
    })

// DELETE: Delete a listing
router.delete('/api/listings/:listingId',
    verifyToken,
    validator.validate('delete', '/api/listings/{listingId}'),
    async (req, res) => {
        try {
            const deleteById = await Listing.deleteOne(
                { _id: req.params.listingId }
            )
            if (deleteById.deletedCount != 1) {
                return res.status(400).send({ message: 'Failed to delete listing' })
            }

            res.status(200).send({ message: 'Listing deleted' });
        } catch (err) {
            logger.error(err.message)
            res.status(500).send({ message: err })
        }
    })

// POST: Enable a listing
router.post('/api/listings/:listingId/enable',
    verifyToken,
    validator.validate('post', '/api/listings/{listingId}/enable'),
    async (req, res) => {
        var update = {};
        try {
            const listing = await Listing.findOne({ listingId: req.params.listingId });
            if (!listing) {
                return res.status(404).send({ message: 'Listing not found' });
            }

            update.enabled = true;
            const updateListingById = await Listing.updateOne(
                { listingId: req.params.listingId },
                {
                    $set: update
                }
            )

            // Create job that runs every day at 2pm and checks for reservations and calculates consumption
            await jobServices.every('3 minutes', "calculate-consumption", { listingId: req.params.listingId });
            logger.info('Calcualte consumption job created');
            logger.info('Listing enabled');
            res.status(200).send({ message: 'Listing enabled' });
        } catch (err) {
            logger.error(err.message)
            res.status(500).send({ message: err })
        }
    })

// PUT: Disable a listing
router.post('/api/listings/:listingId/disable',
    verifyToken,
    validator.validate('post', '/api/listings/{listingId}/disable'),
    async (req, res) => {
        var update = {};
        try {
            const listing = await Listing.findOne({ listingId: req.params.listingId });
            if (!listing) {
                return res.status(404).send({ message: 'Listing not found' });
            }

            update.enabled = false;
            const updateListingById = await Listing.updateOne(
                { listingId: req.params.listingId },
                {
                    $set: update
                }
            )

            // Delete job created in enable endpoint
            const query = {
                name: 'calculate-consumption',
                'data.listingId': req.params.listingId,
            }
            agenda.cancel(query, (err, numRemoved) => {
                if (err) {
                    logger.error(err);
                } else {
                    logger.info(`removed ${numRemoved} jobs`);
                }
            });
            logger.info('Calculate consumption job deleted');
            logger.info('Listing disabled');
            res.status(200).send({ message: 'Listing disabled' });
        } catch (err) {
            logger.error(err.message)
            res.status(500).send({ message: err })
        }
    })

export { router as listings }