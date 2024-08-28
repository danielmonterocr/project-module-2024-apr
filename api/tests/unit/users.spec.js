import { expect } from 'chai';
import sinon from 'sinon';
import request from 'supertest';
import express from 'express';
import { User } from '../../src/models/User.js';
import { Listing } from '../../src/models/Listing.js';
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

describe('GET /api/users/:userId', function () {
    let app, verifyStub, findByIdStub;

    beforeEach(function () {
        app = express();
        app.use(express.json());
        app.use(router);
        verifyStub = sinon.stub(jsonwebtoken, 'verify');
        findByIdStub = sinon.stub(User, 'findById')
    });

    afterEach(function () {
        sinon.restore();
    });

    it('should retrieve user details', async function () {
        const user = { username: 'Nick', email: 'nick@cloud.com' };
        verifyStub.returns(true);
        findByIdStub.resolves(user);

        const rest = (await request(app).get('/api/users/123').set({ token: '1234567890' }));

        expect(rest.status).to.equal(200);
        expect(rest.body).to.deep.equal(user);
    });
});

describe('PATCH /api/users/:userId', function () {
    let app, verifyStub, findByIdStub, updateOneStub;

    beforeEach(function () {
        app = express();
        app.use(express.json());
        app.use(router);
        verifyStub = sinon.stub(jsonwebtoken, 'verify');
        findByIdStub = sinon.stub(User, 'findById');
        updateOneStub = sinon.stub(User, 'updateOne');
    });

    afterEach(function () {
        sinon.restore();
    });

    it('should update user details', async function () {
        const user = { username: 'Nick', email: 'nick@cloud.com' };
        verifyStub.returns(true);
        findByIdStub.resolves(user);

        const rest = (await request(app).patch('/api/users/123').send({ username: 'Nick' }).set({ token: '1234567890' }));

        expect(rest.status).to.equal(200);
        expect(rest.body.message).to.equal('User updated');
    });
});

describe('DELETE /api/users/:userId', function () {
    let app, verifyStub, findByIdStub, deleteOneStub;

    beforeEach(function () {
        app = express();
        app.use(express.json());
        app.use(router);
        verifyStub = sinon.stub(jsonwebtoken, 'verify');
        findByIdStub = sinon.stub(User, 'findById');
        deleteOneStub = sinon.stub(User, 'deleteOne');
    });

    afterEach(function () {
        sinon.restore();
    });

    it('should delete a user', async function () {
        const user = { username: 'Nick', email: 'nick@cloud.com' };
        verifyStub.returns(true);
        findByIdStub.resolves(user);
        deleteOneStub.resolves({ deletedCount: 1 });

        const rest = (await request(app).delete('/api/users/123').set({ token: '1234567890' }));

        expect(rest.status).to.equal(200);
        expect(rest.body.message).to.equal('User deleted');
    });
});

describe('POST /api/users/:userId/sync', function () {
    let app, verifyStub, findByIdStub, findOneStub;

    beforeEach(function () {
        app = express();
        app.use(express.json());
        app.use(router);
        verifyStub = sinon.stub(jsonwebtoken, 'verify');
        findByIdStub = sinon.stub(User, 'findById');
        findOneStub = sinon.stub(Listing, 'findOne');
    });

    afterEach(function () {
        sinon.restore();
    });

    it('should sync user listings', async function () {
        const user = { username: 'Nick', email: 'nick@cloud.com' };
        verifyStub.returns(true);
        findByIdStub.resolves(user);
        findOneStub.resolves({});

        const rest = (await request(app).post('/api/users/123/sync').query({ provider: 'airbnb' }).set({ token: '1234567890' }));

        expect(rest.status).to.equal(200);
        expect(rest.body.message).to.equal('User account synced');
    });
});