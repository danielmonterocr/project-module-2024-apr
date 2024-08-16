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
});

describe('POST /api/users/register', function () {
    // Validate response against the OpenAPI document (swagger.yml)
    const validateResponse = validator.validateResponse('post', '/api/users/register')

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
                expect(res.body).to.be.an('array')
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