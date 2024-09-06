import { expect } from 'chai';
import sinon from 'sinon';
import request from 'supertest';
import express from 'express';
import { Device } from '../../src/models/Device.js';
import { devices as router } from '../../src/routes/devices.js';
import jsonwebtoken from 'jsonwebtoken'

describe('POST /api/devices', function () {
    let app, verifyStub, findOneStub, saveStub, fetchStub;

    beforeEach(function () {
        app = express();
        app.use(express.json());
        app.use(router);
        verifyStub = sinon.stub(jsonwebtoken, 'verify');
        findOneStub = sinon.stub(Device, 'findOne')
        saveStub = sinon.stub(Device.prototype, 'save')
        fetchStub = sinon.stub(global, 'fetch');
    });

    afterEach(function () {
        sinon.restore();
    });

    it('should create device', async function () {
        const device = { deviceId: 'Device 1', userId: 'User 1' };
        verifyStub.returns(true);
        findOneStub.returns(null);
        saveStub.resolves(device);
        fetchStub.resolves({ status: 200, json: () => ({ credentialsValue: 'CREDS_VALUE' }) });

        const res = (await request(app).post('/api/devices').send(device).set({ token: '1234567890' }));

        expect(res.statusCode).to.equal(200);
        expect(res.body).to.deep.equal(device);
        sinon.assert.calledOnce(saveStub);
    });

    it('should handle device already exists', async function () {
        const device = { deviceId: 'Device 1', userId: 'User 1' };
        verifyStub.returns(true);
        findOneStub.returns(device);

        const res = (await request(app).post('/api/devices').send(device).set({ token: '1234567890' }));

        expect(res.statusCode).to.equal(400);
        expect(res.body.message).to.equal('Device already exists');
        sinon.assert.notCalled(fetchStub);
        sinon.assert.notCalled(saveStub);
    });

    it('should handle errors when saving device', async function () {
        const device = { deviceId: 'Device 1', userId: 'User 1' };
        verifyStub.returns(true);
        findOneStub.returns(null);
        saveStub.throws(new Error('DB Error'));
        fetchStub.resolves({ status: 200, json: () => ({ credentialsValue: 'CREDS_VALUE' }) });

        const res = (await request(app).post('/api/devices').send(device).set({ token: '1234567890' }));

        expect(res.statusCode).to.equal(500);
        expect(res.body.message).to.deep.equal({});
    });
});

describe('GET /api/devices', function () {
    let app, verifyStub, findStub;

    beforeEach(function () {
        app = express();
        app.use(express.json());
        app.use(router);
        verifyStub = sinon.stub(jsonwebtoken, 'verify');
        findStub = sinon.stub(Device, 'find')
    });

    afterEach(function () {
        sinon.restore();
    });

    it('should get all devices', async function () {
        const devices = [{ deviceId: 'Device 1', userId: 'User 1' }];
        verifyStub.returns(true);
        findStub.returns(devices);

        const res = (await request(app).get('/api/devices').set({ token: '1234567890' }));

        expect(res.statusCode).to.equal(200);
        expect(res.body).to.deep.equal(devices);
    });

    it('should handle errors when getting devices', async function () {
        verifyStub.returns(true);
        findStub.throws(new Error('DB Error'));

        const res = (await request(app).get('/api/devices').set({ token: '1234567890' }));

        expect(res.statusCode).to.equal(500);
        expect(res.body.message).to.deep.equal({});
    });
});

describe('GET /api/devices/:deviceId', function () {
    let app, verifyStub, findOneStub;

    beforeEach(function () {
        app = express();
        app.use(express.json());
        app.use(router);
        verifyStub = sinon.stub(jsonwebtoken, 'verify');
        findOneStub = sinon.stub(Device, 'findOne')
    });

    afterEach(function () {
        sinon.restore();
    });

    it('should get device by deviceId', async function () {
        const device = { deviceId: 'Device 1', userId: 'User 1' };
        verifyStub.returns(true);
        findOneStub.returns(device);

        const res = (await request(app).get('/api/devices/1').set({ token: '1234567890' }));

        expect(res.statusCode).to.equal(200);
        expect(res.body).to.deep.equal(device);
    });

    it('should handle errors when getting device by deviceId', async function () {
        verifyStub.returns(true);
        findOneStub.throws(new Error('DB Error'));

        const res = (await request(app).get('/api/devices/1').set({ token: '1234567890' }));

        expect(res.statusCode).to.equal(500);
        expect(res.body.message).to.deep.equal({});
    });
});