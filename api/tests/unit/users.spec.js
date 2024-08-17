import { expect } from 'chai';
import sinon from 'sinon';
import request from 'supertest';
import express from 'express';
import { User } from '../../src/models/User.js';
import { users as router } from '../../src/routes/users.js';
import jsonwebtoken from 'jsonwebtoken'
import { auth } from '../../src/verifyToken.js';

describe('GET /api/users', function () {
    // let app;

    // beforeEach(function () {
    //     app = express();
    //     app.use(express.json());
    //     app.use(router);
    // });

    // afterEach(function () {
    //     sinon.restore();
    // });

    // it('should list all users', async function () {
    //     const users = [{ username: 'Nick', email: 'nick@cloud.com' }];
    //     sinon.stub(User, 'find').resolves(users);
    //     // sinon.stub(jsonwebtoken, 'verify').returns(true);
    //     // sinon.stub(validator, 'validate').returns((req, res, next) => next());
    //     sinon.stub(auth).returns((req, res, next) => next());
    //     const res = (await request(app).get('/api/users').set({ token: '1234567890' }));

    //     expect(res.status).to.equal(200);
    //     expect(res.body).to.deep.equal(users);
    // });

    // it('should handle errors when fetching users', async function () {
    //     sinon.stub(User, 'find').throws(new Error('Database error'));
    //     // sinon.stub(validator, 'validate').returns((req, res, next) => next());
    //     // sinon.stub(verifyToken).callsFake((req, res, next) => next());

    //     const res = await request(app).get('/api/users');

    //     expect(res.status).to.equal(500);
    //     expect(res.body.message).to.equal('Database error');
    // });
});
