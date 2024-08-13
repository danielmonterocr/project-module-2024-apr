import { SWAGGER_PATH } from '../constants/config.js';
import express from 'express';
const router = express.Router()

import { User } from '../models/User.js'

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

            res.status(200).send({ message: 'User updated' });
        } catch (err) {
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
            res.status(400).send({ message: err })
        }
    })

export { router as users }