import { expect } from 'chai';
import sinon from 'sinon';
import request from 'supertest';
import express from 'express';
import { Listing } from '../../src/models/Listing.js';
import { listings as router } from '../../src/routes/listings.js';
import jsonwebtoken from 'jsonwebtoken'
import { agenda } from '../../src/jobs/agenda.js';

describe('POST /api/listings', function () {
    let app, verifyStub, findOneStub, saveStub, fetchStub;

    beforeEach(function () {
        app = express();
        app.use(express.json());
        app.use(router);
        verifyStub = sinon.stub(jsonwebtoken, 'verify');
        findOneStub = sinon.stub(Listing, 'findOne')
        saveStub = sinon.stub(Listing.prototype, 'save')
        fetchStub = sinon.stub(global, 'fetch');
    });

    afterEach(function () {
        sinon.restore();
    });

    it('should create listing', async function () {
        const listing = { listingId: 'Listing 1', userId: 'User 1' };
        verifyStub.returns(true);
        findOneStub.returns(null);
        saveStub.resolves(listing);
        fetchStub.resolves({ status: 200, json: () => ({ credentialsValue: 'CREDS_VALUE' }) });

        const res = (await request(app).post('/api/listings').send(listing).set({ token: '1234567890' }));

        expect(res.statusCode).to.equal(200);
        expect(res.body).to.deep.equal(listing);
        sinon.assert.calledOnce(saveStub);
    });

    it('should handle listing already exists', async function () {
        const listing = { listingId: 'Listing 1', userId: 'User 1' };
        verifyStub.returns(true);
        findOneStub.returns(listing);

        const res = (await request(app).post('/api/listings').send(listing).set({ token: '1234567890' }));

        expect(res.statusCode).to.equal(400);
        expect(res.body.message).to.equal('Listing already exists');
        sinon.assert.notCalled(fetchStub);
        sinon.assert.notCalled(saveStub);
    });

    it('should handle errors when saving listing', async function () {
        const listing = { listingId: 'Listing 1', userId: 'User 1' };
        verifyStub.returns(true);
        findOneStub.returns(null);
        saveStub.throws(new Error('DB Error'));
        fetchStub.resolves({ status: 200, json: () => ({ credentialsValue: 'CREDS_VALUE' }) });

        const res = (await request(app).post('/api/listings').send(listing).set({ token: '1234567890' }));
        expect(res.statusCode).to.equal(500);
        expect(res.body.message).to.deep.equal({});
        sinon.assert.calledOnce(saveStub);
    });
});

describe('GET /api/listings', function () {
    let app, verifyStub, findStub;

    beforeEach(function () {
        app = express();
        app.use(express.json());
        app.use(router);
        verifyStub = sinon.stub(jsonwebtoken, 'verify');
        findStub = sinon.stub(Listing, 'find')
    });

    afterEach(function () {
        sinon.restore();
    });

    it('should list all listings', async function () {
        const listings = [{ listingId: 'Listing 1', userId: 'User 1' }];
        verifyStub.returns(true);
        findStub.returns(listings);

        const res = (await request(app).get('/api/listings').set({ token: '1234567890' }));

        expect(res.statusCode).to.equal(200);
        expect(res.body).to.deep.equal(listings);
        sinon.assert.calledOnce(findStub);
    });

    it('should handle errors when fetching listings', async function () {
        verifyStub.returns(true);
        findStub.throws(new Error('DB Error'));

        const res = (await request(app).get('/api/listings').set({ token: '1234567890' }));

        expect(res.statusCode).to.equal(500);
        expect(res.body.message).to.deep.equal({});
        sinon.assert.calledOnce(findStub);
    });
});

describe('GET /api/listings/:listingId', function () {
    let app, verifyStub, findByIdStub;

    beforeEach(function () {
        app = express();
        app.use(express.json());
        app.use(router);
        verifyStub = sinon.stub(jsonwebtoken, 'verify');
        findByIdStub = sinon.stub(Listing, 'findById')
    });

    afterEach(function () {
        sinon.restore();
    });

    it('should get listing details', async function () {
        const listing = { listingId: 'Listing 1', userId: 'User 1' };
        verifyStub.returns(true);
        findByIdStub.returns(listing);

        const res = (await request(app).get('/api/listings/123').set({ token: '1234567890' }));

        expect(res.statusCode).to.equal(200);
        expect(res.body).to.deep.equal(listing);
        sinon.assert.calledOnce(findByIdStub);
    });

    it('should handle listing not found', async function () {
        verifyStub.returns(true);
        findByIdStub.returns(null);

        const res = (await request(app).get('/api/listings/123').set({ token: '1234567890' }));

        expect(res.statusCode).to.equal(404);
        expect(res.body.message).to.equal('Listing not found');
        sinon.assert.calledOnce(findByIdStub);
    });

    it('should handle errors when fetching listing details', async function () {
        verifyStub.returns(true);
        findByIdStub.throws(new Error('DB Error'));

        const res = (await request(app).get('/api/listings/123').set({ token: '1234567890' }));

        expect(res.statusCode).to.equal(500);
        expect(res.body.message).to.deep.equal({});
        sinon.assert.calledOnce(findByIdStub);
    });
});

describe('DELETE /api/listings/:listingId', function () {
    let app, verifyStub, deleteOneStub;

    beforeEach(function () {
        app = express();
        app.use(express.json());
        app.use(router);
        verifyStub = sinon.stub(jsonwebtoken, 'verify');
        deleteOneStub = sinon.stub(Listing, 'deleteOne');
    });

    afterEach(function () {
        sinon.restore();
    });

    it('should delete listing', async function () {
        verifyStub.returns(true);
        deleteOneStub.resolves({ deletedCount: 1 });

        const res = (await request(app).delete('/api/listings/123').set({ token: '1234567890' }));

        expect(res.statusCode).to.equal(200);
        expect(res.body.message).to.equal('Listing deleted');
        sinon.assert.calledOnce(deleteOneStub);
    });

    it('should handle listing not found', async function () {
        verifyStub.returns(true);
        deleteOneStub.resolves({ deletedCount: 0 });

        const res = (await request(app).delete('/api/listings/123').set({ token: '1234567890' }));

        expect(res.statusCode).to.equal(400);
        expect(res.body.message).to.equal('Failed to delete listing');
        sinon.assert.calledOnce(deleteOneStub);
    });

    it('should handle errors when deleting listing', async function () {
        verifyStub.returns(true);
        deleteOneStub.throws(new Error('DB Error'));

        const res = (await request(app).delete('/api/listings/123').set({ token: '1234567890' }));

        expect(res.statusCode).to.equal(500);
        expect(res.body.message).to.deep.equal({});
        sinon.assert.calledOnce(deleteOneStub);
    });
});

describe('POST /api/listings/:listingId/enable', function () {
    let app, verifyStub, findByIdStub, updateOneStub, agendaStub;

    beforeEach(function () {
        app = express();
        app.use(express.json());
        app.use(router);
        verifyStub = sinon.stub(jsonwebtoken, 'verify');
        findByIdStub = sinon.stub(Listing, 'findById');
        updateOneStub = sinon.stub(Listing, 'updateOne');
        agendaStub = sinon.stub(agenda, 'now');
    });

    afterEach(function () {
        sinon.restore();
    });

    it('should enable listing', async function () {
        const listing = { listingId: 'Listing 1', userId: 'User 1' };
        verifyStub.returns(true);
        findByIdStub.returns(listing);
        updateOneStub.resolves({});
        agendaStub.resolves({});

        const res = (await request(app).post('/api/listings/123/enable').set({ token: '1234567890' }));

        expect(res.statusCode).to.equal(200);
        expect(res.body.message).to.equal('Listing enabled');
        sinon.assert.calledOnce(findByIdStub);
        sinon.assert.calledOnce(updateOneStub);
    });

    it('should handle listing not found', async function () {
        verifyStub.returns(true);
        findByIdStub.returns(null);

        const res = (await request(app).post('/api/listings/123/enable').set({ token: '1234567890' }));

        expect(res.statusCode).to.equal(404);
        expect(res.body.message).to.equal('Listing not found');
        sinon.assert.calledOnce(findByIdStub);
        sinon.assert.notCalled(updateOneStub);
    });

    it('should handle errors when enabling listing', async function () {
        const listing = { listingId: 'Listing 1', userId: 'User 1' };
        verifyStub.returns(true);
        findByIdStub.returns(listing);
        updateOneStub.throws(new Error('DB Error'));

        const res = (await request(app).post('/api/listings/123/enable').set({ token: '1234567890' }));

        expect(res.statusCode).to.equal(500);
        expect(res.body.message).to.deep.equal({});
        sinon.assert.calledOnce(findByIdStub);
        sinon.assert.calledOnce(updateOneStub);
    });
});

describe('POST /api/listings/:listingId/disable', function () {
    let app, verifyStub, findByIdStub, updateOneStub, agendaStub;

    beforeEach(function () {
        app = express();
        app.use(express.json());
        app.use(router);
        verifyStub = sinon.stub(jsonwebtoken, 'verify');
        findByIdStub = sinon.stub(Listing, 'findById');
        updateOneStub = sinon.stub(Listing, 'updateOne');
        agendaStub = sinon.stub(agenda, 'cancel');
    });

    afterEach(function () {
        sinon.restore();
    });

    it('should disable listing', async function () {
        const listing = { listingId: 'Listing 1', userId: 'User 1' };
        verifyStub.returns(true);
        findByIdStub.returns(listing);
        updateOneStub.resolves({});
        agendaStub.resolves({});

        const res = (await request(app).post('/api/listings/123/disable').set({ token: '1234567890' }));

        expect(res.statusCode).to.equal(200);
        expect(res.body.message).to.equal('Listing disabled');
        sinon.assert.calledOnce(findByIdStub);
        sinon.assert.calledOnce(updateOneStub);
    });

    it('should handle listing not found', async function () {
        verifyStub.returns(true);
        findByIdStub.returns(null);

        const res = (await request(app).post('/api/listings/123/disable').set({ token: '1234567890' }));

        expect(res.statusCode).to.equal(404);
        expect(res.body.message).to.equal('Listing not found');
        sinon.assert.calledOnce(findByIdStub);
        sinon.assert.notCalled(updateOneStub);
    });

    it('should handle errors when disabling listing', async function () {
        const listing = { listingId: 'Listing 1', userId: 'User 1' };
        verifyStub.returns(true);
        findByIdStub.returns(listing);
        updateOneStub.throws(new Error('DB Error'));

        const res = (await request(app).post('/api/listings/123/disable').set({ token: '1234567890' }));

        expect(res.statusCode).to.equal(500);
        expect(res.body.message).to.deep.equal({});
        sinon.assert.calledOnce(findByIdStub);
        sinon.assert.calledOnce(updateOneStub);
    });
});