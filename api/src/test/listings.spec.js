import { SWAGGER_PATH } from '../constants/config.js'
import request from 'supertest'
import { app } from '../app.js'
import { expect } from 'chai'

import jsYaml from 'js-yaml'
import fs from 'fs'
import { OpenApiValidator } from 'express-openapi-validate'

// Load the OpenAPI document
const openApiDocument = jsYaml.load(fs.readFileSync(SWAGGER_PATH, "utf-8"))

// Create the validator from the spec document
const validator = new OpenApiValidator(openApiDocument, {})

var userId = '';
var token = '';
var listingId = '';

describe('POST /api/users/register', function () {
    // Validate response against the OpenAPI document (swagger.yml)
    const validateResponse = validator.validateResponse('post', '/api/users/register')

    it('should create new user', async function () {
        return request(app)
            .post('/api/users/register')
            .set('Accept', 'application/json')
            .send({ username: 'Nick', email: 'nick@cloud.com', password: '123456' })
            .expect(200)
            .then((res) => {
                expect(validateResponse(res)).to.be.undefined
                expect(res.body).to.have.property('_id')
                userId = res.body._id
            })
            .catch((err) => expect(err).to.be.undefined)
    });
});

describe('POST /api/users/login', function () {
    // Validate response against the OpenAPI document (swagger.yml)
    const validateResponse = validator.validateResponse('post', '/api/users/login')

    it('should return token', async function () {
        return request(app)
            .post('/api/users/login')
            .set('Accept', 'application/json')
            .send({ email: 'nick@cloud.com', password: '123456' })
            .expect(200)
            .then((res) => {
                expect(validateResponse(res)).to.be.undefined
                expect(res.headers.token).to.be.a('string')
                token = res.headers.token
            })
            .catch((err) => expect(err).to.be.undefined)
    });
});

describe('POST /api/listings', function () {
    // Validate response against the OpenAPI document (swagger.yml)
    const validateResponse = validator.validateResponse('post', '/api/listings')

    it('should create new listing', async function () {
        return request(app)
            .post('/api/listings')
            .set('token', token)
            .set('Accept', 'application/json')
            .send({
                provider: 'Airbnb',
                title: 'Nour',
                description: 'Tiny Footprint Getaway',
                location: 'Playa Hermosa, Puntarenas',
                userId: userId
            })
            .expect(200)
            .then((res) => {
                expect(validateResponse(res)).to.be.undefined
                expect(res.body).to.have.property('_id')
                listingId = res.body._id
            })
            .catch((err) => expect(err).to.be.undefined)
    });
});

describe('POST /api/listings', function () {
    // Validate response against the OpenAPI document (swagger.yml)
    const validateResponse = validator.validateResponse('post', '/api/listings')

    it('should fail as listing already exists', async function () {
        return request(app)
            .post('/api/listings')
            .set('token', token)
            .set('Accept', 'application/json')
            .send({
                provider: 'Airbnb',
                title: 'Nour',
                description: 'Tiny Footprint Getaway',
                location: 'Playa Hermosa, Puntarenas',
                userId: userId
            })
            .expect(400)
            .then((res) => {
                expect(validateResponse(res)).to.be.undefined
                expect(res.body.message).to.equal('Listing already exists')
            })
            .catch((err) => expect(err).to.be.undefined)
    });
});

// describe('POST /api/listings/sync', function () {
//     // Validate response against the OpenAPI document (swagger.yml)
//     const validateResponse = validator.validateResponse('post', '/api/listings/sync')

//     it('should create new listing', async function () {
//         return request(app)
//             .post('/api/listings')
//             .set('token', token)
//             .set('Accept', 'application/json')
//             .send({
//                 title: 'Nour',
//                 description: 'Tiny Footprint Getaway',
//                 location: 'Playa Hermosa, Puntarenas',
//                 userId: userId
//             })
//             .expect(200)
//             .then((res) => {
//                 expect(validateResponse(res)).to.be.undefined
//                 expect(res.body).to.have.property('_id')
//                 listingId = res.body._id
//             })
//             .catch((err) => expect(err).to.be.undefined)
//     });
// });

describe('GET /api/listings', function () {
    // Validate response against the OpenAPI document (swagger.yml)
    const validateResponse = validator.validateResponse('get', '/api/listings')

    it('should list all listings', async function () {
        return request(app)
            .get('/api/listings')
            .set('token', token)
            .expect(200)
            .then((res) => {
                expect(validateResponse(res)).to.be.undefined
                expect(res.body).to.be.an('array')
            })
            .catch((err) => expect(err).to.be.undefined)
    });
});

describe('GET /api/listings/{listingId}', function () {
    // Validate response against the OpenAPI document (swagger.yml)
    const validateResponse = validator.validateResponse('get', '/api/listings/{listingId}')

    it('should retrieve details of a specific listing', async function () {
        return request(app)
            .get('/api/listings/' + listingId)
            .set('token', token)
            .expect(200)
            .then((res) => {
                expect(validateResponse(res)).to.be.undefined
                expect(res.body._id).to.equal(listingId)
            })
            .catch((err) => expect(err).to.be.undefined)
    });
});

describe('PATCH /api/listings/{listingId}', function () {
    // Validate response against the OpenAPI document (swagger.yml)
    const validateResponse = validator.validateResponse('patch', '/api/listings/{listingId}')

    it('should update details of a specific listing', async function () {
        return request(app)
            .patch('/api/listings/' + listingId)
            .set('token', token)
            .set('Accept', 'application/json')
            .send({ title: 'Ruon' })
            .expect(200)
            .then((res) => {
                expect(validateResponse(res)).to.be.undefined
                expect(res.body.message).to.equal('Listing updated')
            })
            .catch((err) => expect(err).to.be.undefined)
    });
});

describe('DELETE /api/listings/{listingId}', function () {
    // Validate response against the OpenAPI document (swagger.yml)
    const validateResponse = validator.validateResponse('delete', '/api/listings/{listingId}')

    it('should delete a listing', async function () {
        return request(app)
            .delete('/api/listings/' + listingId)
            .set('token', token)
            .expect(200)
            .then((res) => {
                expect(validateResponse(res)).to.be.undefined
                expect(res.body.message).to.equal('Listing deleted')
            })
            .catch((err) => expect(err).to.be.undefined)
    });
});
