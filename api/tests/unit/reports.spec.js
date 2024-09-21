import { expect } from 'chai';
import sinon from 'sinon';
import request from 'supertest';
import express from 'express';
import { Report } from '../../src/models/Report.js';
import { reports as router } from '../../src/routes/reports.js';
import jsonwebtoken from 'jsonwebtoken';

describe('GET /api/reports', function () {
    let app, verifyStub, findStub;

    beforeEach(function () {
        app = express();
        app.use(express.json());
        app.use(router);
        verifyStub = sinon.stub(jsonwebtoken, 'verify');
        findStub = sinon.stub(Report, 'find');
    });

    afterEach(function () {
        sinon.restore();
    });

    it('should get reports', async function () {
        const reports = [{ electricityUsed: 100 }, { waterUsed: 200 }];
        verifyStub.returns(true);
        findStub.returns(reports);

        const res = (await request(app).get('/api/reports').set({ token: '1234567890' }));

        expect(res.statusCode).to.equal(200);
        expect(res.body).to.deep.equal(reports);
        sinon.assert.calledOnce(findStub);
    });

    it('should handle errors when getting reports', async function () {
        verifyStub.returns(true);
        findStub.throws(new Error('Error'));

        const res = (await request(app).get('/api/reports').set({ token: '1234567890' }));

        expect(res.statusCode).to.equal(500);
        expect(res.body.message).to.equal('Internal server error');
        sinon.assert.calledOnce(findStub);
    });
});