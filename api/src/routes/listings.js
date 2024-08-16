import { SWAGGER_PATH } from '../constants/config.js';
import express from 'express';
const router = express.Router()
import { logger } from '../logger.js'

import { Listing } from '../models/Listing.js'

import { auth as verifyToken } from '../verifyToken.js'

import jsYaml from 'js-yaml';
import fs from 'fs';
import { OpenApiValidator } from 'express-openapi-validate';

// Load the OpenAPI document
const openApiDocument = jsYaml.load(fs.readFileSync(SWAGGER_PATH, 'utf-8'));

// Construct the validator with some basic options
const validator = new OpenApiValidator(openApiDocument,
    {
        ajvOptions: {
            allErrors: true,
            removeAdditional: "all",
        }
    }
);

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
            return res.status(400).send({ message: err })
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
            res.status(400).send({ message: err })
        }
    })

// PUT: Update details of a specific listing 
router.patch('/api/listings/:listingId',
    // verifyToken,
    validator.validate('patch', '/api/listings/{listingId}'),
    async (req, res) => {
        var update = {};
        try {
            const listing = await Listing.findById(req.params.listingId);
            if (!listing) {
                return res.status(404).send({ message: 'Listing not found' });
            }

            if (req.body.title !== undefined) {
                update.title = req.body.title
            }
            if (req.body.description !== undefined) {
                update.description = req.body.description
            }
            if (req.body.location !== undefined) {
                update.location = req.body.location
            }

            const updateListingById = await Listing.updateOne(
                { _id: req.params.listingId },
                {
                    $set: update
                }
            )

            res.status(200).send({ message: 'Listing updated' });
        } catch (err) {
            logger.error(err.message)
            res.status(400).send({ message: 'err' })
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
            res.status(400).send({ message: err })
        }
    })

export { router as listings }