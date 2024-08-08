import request from 'supertest'
import { app } from '../app.js'
import { expect } from 'chai';

import jsYaml from 'js-yaml';
import fs from 'fs';
import { OpenApiValidator } from 'express-openapi-validate';

// Load the OpenAPI document
const openApiDocument = jsYaml.load(fs.readFileSync('../open-api/index.yaml', "utf-8"));

// Create the validator from the spec document
const validator = new OpenApiValidator(openApiDocument, {});

describe('POST /api/users/register', function () {
    // Create the response validator for the POST / endpoint
    const validateResponse = validator.validateResponse('post', '/register');

    it('should create new user', async function () {
        return request(app)
            .post('/api/users/register')
            .set('Accept', 'application/json')
            .send({ username: 'Olga', email: 'olga@cloud.com', password: '123456' })
            .expect(200)
            .then((res) => {
                expect(validateResponse(res)).to.be.undefined
                expect(res.body).to.have.property('_id');
            })
            .catch((err) => expect(err).to.be.undefined);
    });
});

describe('POST /api/users/register', function () {
    // Create the response validator for the POST / endpoint
    const validateResponse = validator.validateResponse('post', '/register');

    it('should fail as user already exists', async function () {
        return request(app)
            .post('/api/users/register')
            .set('Accept', 'application/json')
            .send({ username: 'Olga', email: 'olga@cloud.com', password: '123456' })
            .expect(400)
            .then((res) => {
                expect(validateResponse(res)).to.be.undefined
                expect(res.body.message).to.equal('User already exists');
            })
            .catch((err) => expect(err).to.be.undefined);
    });
});
