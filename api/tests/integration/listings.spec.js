import request from 'supertest'
import { app } from '../../src/app.js'
import { expect } from 'chai'

import { testValidator as validator } from '../../src/validations/validator.js'

var userId = '';
var token = '';
var listingId = '';
var providerListingId = '';

describe('POST /api/users/register', function () {
    // Validate response against the OpenAPI document (swagger.yml)
    const validateResponse = validator.validateResponse('post', '/api/users/register')

    it('should create new user', async function () {
        return request(app)
            .post('/api/users/register')
            .set('Accept', 'application/json')
            .send({ username: 'Nick', email: 'nick@cloud.com', password: '1234567890' })
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
            .send({ email: 'nick@cloud.com', password: '1234567890' })
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
                listingId: '1065162203416824771',
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
                listingId: '1065162203416824771',
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
                providerListingId = res.body.listingId;
            })
            .catch((err) => expect(err).to.be.undefined)
    });
});

describe('POST /api/listings/{listingId}/enable', function () {
    // Validate response against the OpenAPI document (swagger.yml)
    const validateResponse = validator.validateResponse('post', '/api/listings/{listingId}/enable')

    it('should enable a listing', async function () {
        return request(app)
            .post('/api/listings/' + providerListingId + '/enable')
            .set('token', token)
            .expect(200)
            .then((res) => {
                expect(validateResponse(res)).to.be.undefined
                expect(res.body.message).to.equal('Listing enabled')
            })
            .catch((err) => expect(err).to.be.undefined)
    });
});

describe('POST /api/listings/{listingId}/disable', function () {
    // Validate response against the OpenAPI document (swagger.yml)
    const validateResponse = validator.validateResponse('post', '/api/listings/{listingId}/disable')
    it('should disable a listing', async function () {
        return request(app)
            .post('/api/listings/' + providerListingId + '/disable')
            .set('token', token)
            .expect(200)
            .then((res) => {
                expect(validateResponse(res)).to.be.undefined
                expect(res.body.message).to.equal('Listing disabled')
            })
            .catch((err) => expect(err).to.be.undefined)
    });
});

describe('DELETE /api/listings/{listingId}', function () {
    // Validate response against the OpenAPI document (swagger.yml)
    const validateResponse = validator.validateResponse('delete', '/api/listings/{listingId}')

    it('should delete a listing', async function () {
        return request(app)
            .delete('/api/listings/' + providerListingId)
            .set('token', token)
            .expect(200)
            .then((res) => {
                expect(validateResponse(res)).to.be.undefined
                expect(res.body.message).to.equal('Listing deleted')
            })
            .catch((err) => expect(err).to.be.undefined)
    });
});

describe('DELETE /api/users/{userId}', function () {
    // Validate response against the OpenAPI document (swagger.yml)
    const validateResponse = validator.validateResponse('delete', '/api/users/{userId}')

    it('should delete a user', async function () {
        return request(app)
            .delete('/api/users/' + userId)
            .set('token', token)
            .expect(200)
            .then((res) => {
                expect(validateResponse(res)).to.be.undefined
                expect(res.body.message).to.equal('User deleted')
            })
            .catch((err) => expect(err).to.be.undefined)
    });
});