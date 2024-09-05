import request from 'supertest'
import { app } from '../../src/app.js'
import { expect } from 'chai'

import { testValidator as validator } from '../../src/validations/validator.js'
import { syncAirbnb } from '../../src/utils/provider-utils.js'

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
            .send({ username: 'Olga', email: 'olga@cloud.com', password: '123456' })
            .expect(200)
            .then((res) => {
                expect(validateResponse(res)).to.be.undefined
                expect(res.body).to.have.property('_id')
                userId = res.body._id
            })
            .catch((err) => expect(err).to.be.undefined)
    });

    it('should fail as user already exists', async function () {
        return request(app)
            .post('/api/users/register')
            .set('Accept', 'application/json')
            .send({ username: 'Olga', email: 'olga@cloud.com', password: '123456' })
            .expect(400)
            .then((res) => {
                expect(validateResponse(res)).to.be.undefined
                expect(res.body.message).to.equal('User already exists')
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
            .send({ email: 'olga@cloud.com', password: '123456' })
            .expect(200)
            .then((res) => {
                expect(validateResponse(res)).to.be.undefined
                expect(res.headers.token).to.be.a('string')
                token = res.headers.token
            })
            .catch((err) => expect(err).to.be.undefined)
    });
});

describe('GET /api/users', function () {
    // Validate response against the OpenAPI document (swagger.yml)
    const validateResponse = validator.validateResponse('get', '/api/users')

    it('should list all users', async function () {
        return request(app)
            .get('/api/users')
            .set('token', token)
            .expect(200)
            .then((res) => {
                expect(validateResponse(res)).to.be.undefined
                expect(res.body).to.be.an('array')
            })
            .catch((err) => expect(err).to.be.undefined)
    });
});

describe('GET /api/users/{userId}', function () {
    // Validate response against the OpenAPI document (swagger.yml)
    const validateResponse = validator.validateResponse('get', '/api/users/{userId}')

    it('should retrieve details of a specific user', async function () {
        return request(app)
            .get('/api/users/' + userId)
            .set('token', token)
            .expect(200)
            .then((res) => {
                expect(validateResponse(res)).to.be.undefined
                expect(res.body._id).to.equal(userId)
            })
            .catch((err) => expect(err).to.be.undefined)
    });
});

describe('PATCH /api/users/{userId}', function () {
    // Validate response against the OpenAPI document (swagger.yml)
    const validateResponse = validator.validateResponse('patch', '/api/users/{userId}')

    it('should update details of a specific user', async function () {
        return request(app)
            .patch('/api/users/' + userId)
            .set('token', token)
            .set('Accept', 'application/json')
            .send({ email: 'aglo@cloud.com' })
            .expect(200)
            .then((res) => {
                expect(validateResponse(res)).to.be.undefined
                expect(res.body.message).to.equal('User updated')
            })
            .catch((err) => expect(err).to.be.undefined)
    });
});

describe('POST /api/providers', function () {
    // Validate response against the OpenAPI document (swagger.yml)
    const validateResponse = validator.validateResponse('post', '/api/providers')

    it('should create a provider', async function () {
        return request(app)
            .post('/api/providers')
            .set('token', token)
            .set('Accept', 'application/json')
            .send({ providerId: 'airbnb', userId: userId })
            .expect(200)
            .then((res) => {
                expect(validateResponse(res)).to.be.undefined
                expect(res.body.providerId).to.equal('airbnb')
            })
            .catch((err) => expect(err).to.be.undefined)
    });
});

describe('POST /api/users/{userId}/sync', function () {
    // Validate response against the OpenAPI document (swagger.yml)
    const validateResponse = validator.validateResponse('post', '/api/users/{userId}/sync')

    it('should sync listings from a provider', async function () {
        return request(app)
            .post('/api/users/' + userId + '/sync')
            .query({ provider: 'airbnb' })
            .set('token', token)
            .set('Accept', 'application/json')
            .expect(200)
            .then((res) => {
                expect(validateResponse(res)).to.be.undefined
                expect(res.body.message).to.equal('User account synced')
            })
            .catch((err) => expect(err).to.be.undefined)
    });
});

describe('importListingsFromAirbnb', function () {
    it('should import listings and reservations from Airbnb JSON files', async function () {
        return syncAirbnb(userId)
            .then((ret) => {
                expect(ret).to.be.true
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
                listingId = res.body[0]._id
            })
            .catch((err) => expect(err).to.be.undefined)
    });
});

// describe('DELETE /api/listings/{listingId}', function () {
//     // Validate response against the OpenAPI document (swagger.yml)
//     const validateResponse = validator.validateResponse('delete', '/api/listings/{listingId}')

//     it('should delete a listing', async function () {
//         return request(app)
//             .delete('/api/listings/' + listingId)
//             .set('token', token)
//             .expect(200)
//             .then((res) => {
//                 expect(validateResponse(res)).to.be.undefined
//                 expect(res.body.message).to.equal('Listing deleted')
//             })
//             .catch((err) => expect(err).to.be.undefined)
//     });
// });

describe('DELETE /api/providers/', function () {
    // Validate response against the OpenAPI document (swagger.yml)
    const validateResponse = validator.validateResponse('delete', '/api/providers')

    it('should delete a provider', async function () {
        return request(app)
            .delete('/api/providers')
            .set('token', token)
            .set('Accept', 'application/json')
            .send({ providerId: 'airbnb', userId: userId })
            .expect(200)
            .then((res) => {
                // expect(validateResponse(res)).to.be.undefined
                // expect(res.body.message).to.equal('Provider deleted')
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