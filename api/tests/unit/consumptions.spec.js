import { expect } from 'chai';
import sinon from 'sinon';
import request from 'supertest';
import express from 'express';
import { Consumption } from '../../src/models/Consumption.js';
import { consumptions as router } from '../../src/routes/consumptions.js';
import jsonwebtoken from 'jsonwebtoken';

describe('GET /api/consumptions', function () {
    let app, verifyStub, findStub;

    beforeEach(function () {
        app = express();
        app.use(express.json());
        app.use(router);
        verifyStub = sinon.stub(jsonwebtoken, 'verify');
        findStub = sinon.stub(Consumption, 'find');
    });

    afterEach(function () {
        sinon.restore();
    });

    it('should get consumptions', async function () {
        const consumptions = [{ consumption: 100 }, { consumption: 200 }];
        verifyStub.returns(true);
        findStub.returns(consumptions);

        const res = (await request(app).get('/api/consumptions').set({ token: '1234567890' }));

        expect(res.statusCode).to.equal(200);
        expect(res.body).to.deep.equal(consumptions);
        sinon.assert.calledOnce(findStub);
    });

    it('should handle errors when getting consumptions', async function () {
        verifyStub.returns(true);
        findStub.throws(new Error('Error'));

        const res = (await request(app).get('/api/consumptions').set({ token: '1234567890' }));

        expect(res.statusCode).to.equal(500);
        expect(res.body.message).to.equal('Internal server error');
        sinon.assert.calledOnce(findStub);
    });
});