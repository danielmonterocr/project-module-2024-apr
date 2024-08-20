import { expect } from 'chai';
import sinon from 'sinon';
import request from 'supertest';
import express from 'express';
import { User } from '../../src/models/User.js';
import { users as router } from '../../src/routes/users.js';
import jsonwebtoken from 'jsonwebtoken'

describe('GET /api/users', function () {
    let app, verifyStub, findStub;

    beforeEach(function () {
        app = express();
        app.use(express.json());
        app.use(router);
        verifyStub = sinon.stub(jsonwebtoken, 'verify');
        findStub = sinon.stub(User, 'find')
    });

    afterEach(function () {
        sinon.restore();
    });

    it('should list all users', async function () {
        const users = [{ username: 'Nick', email: 'nick@cloud.com' }];
        verifyStub.returns(true);
        findStub.resolves(users);

        const res = (await request(app).get('/api/users').set({ token: '1234567890' }));

        expect(res.status).to.equal(200);
        expect(res.body).to.deep.equal(users);
    });

    it('should handle errors when fetching users', async function () {
        findStub.throws(new Error('DB Error'));

        const res = (await request(app).get('/api/users').set({ token: '1234567890' }));

        expect(res.statusCode).to.equal(500)
        expect(res.body.message).to.deep.equal({})
    });
});
