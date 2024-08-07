import request from 'supertest'
import { app } from '../app.js'
import { expect } from 'chai';


describe('POST /api/users/register', function () {
    it('should create new user', function () {
        return request(app)
            .post('/api/users/register')
            .set('Accept', 'application/json')
            .send({ username: 'Olga', email: 'olga@cloud.com', password: '123456' })
            .expect(200)
            .then((res) => {
                expect(res.body._id).to.exist.and.to.not.be.empty;
            })
    });
});

describe('POST /api/users/register', function () {
    it('should fail as user already exists', function () {
        return request(app)
            .post('/api/users/register')
            .set('Accept', 'application/json')
            .send({ username: 'Olga', email: 'olga@cloud.com', password: '123456' })
            .expect(400)
            .then((res) => {
                expect(res.body.message).to.equal("User already exists");
            })
    });
});
