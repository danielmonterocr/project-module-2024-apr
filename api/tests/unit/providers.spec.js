import { expect } from 'chai';
import sinon from 'sinon';
import request from 'supertest';
import express from 'express';
import { Provider } from '../../src/models/Provider.js';
import { providers as router } from '../../src/routes/providers.js';
import jsonwebtoken from 'jsonwebtoken'
import { agenda } from '../../src/jobs/agenda.js';

describe('POST /api/providers', function () {
    let app, verifyStub, findOneStub, saveStub;

    beforeEach(function () {
        app = express();
        app.use(express.json());
        app.use(router);
        verifyStub = sinon.stub(jsonwebtoken, 'verify');
        findOneStub = sinon.stub(Provider, 'findOne')
        saveStub = sinon.stub(Provider.prototype, 'save')
    });

    afterEach(function () {
        sinon.restore();
    });

    it('should create provider', async function () {
        const provider = { provider: 'Provider 1', userId: 'User 1' };
        verifyStub.returns(true);
        findOneStub.returns(null);
        saveStub.resolves(provider)

        const res = (await request(app).post('/api/providers').send(provider).set({ token: '1234567890' }));
        
        expect(res.statusCode).to.equal(200);
        expect(res.body).to.deep.equal(provider);
        sinon.assert.calledOnce(saveStub);
    });

    it('should handle provider already exists', async function () {
        const provider = { provider: 'Provider 1', userId: 'User 1' };
        verifyStub.returns(true);
        findOneStub.returns(provider);

        const res = (await request(app).post('/api/providers').send(provider).set({ token: '1234567890' }));

        expect(res.statusCode).to.equal(400);
        expect(res.body.message).to.equal('Provider already exists');
        sinon.assert.notCalled(saveStub);
    });

    it('should handle errors when saving provider', async function () {
        const provider = { provider: 'Provider 1', userId: 'User 1' };
        verifyStub.returns(true);
        findOneStub.returns(null);
        saveStub.throws(new Error('DB Error'));

        const res = (await request(app).post('/api/providers').send(provider).set({ token: '1234567890' }));

        expect(res.statusCode).to.equal(500);
        expect(res.body.message).to.deep.equal({});
    });
});

describe('DELETE /api/providers', function () {
    let app, verifyStub, findOneStub, deleteOneStub, agendaStub;

    beforeEach(function () {
        app = express();
        app.use(express.json());
        app.use(router);
        verifyStub = sinon.stub(jsonwebtoken, 'verify');
        findOneStub = sinon.stub(Provider, 'findOne')
        deleteOneStub = sinon.stub(Provider, 'deleteOne')
        agendaStub = sinon.stub(agenda, 'cancel');
    });

    afterEach(function () {
        sinon.restore();
    });

    it('should delete provider', async function () {
        const provider = { provider: 'Provider 1', userId: 'User 1' };
        verifyStub.returns(true);
        findOneStub.returns(provider);
        deleteOneStub.returns({ deletedCount: 1 });
        agendaStub.resolves({});

        const res = (await request(app).delete('/api/providers').send(provider).set({ token: '1234567890' }));

        expect(res.statusCode).to.equal(200);
        expect(res.body.message).to.equal('Provider deleted');
        sinon.assert.calledOnce(deleteOneStub);
        sinon.assert.calledOnce(agendaStub);
    });

    it('should handle provider not found', async function () {
        const provider = { provider: 'Provider 1', userId: 'User 1' };
        verifyStub.returns(true);
        findOneStub.returns(provider);
        deleteOneStub.returns({ deletedCount: 0 });

        const res = (await request(app).delete('/api/providers').send(provider).set({ token: '1234567890' }));

        expect(res.statusCode).to.equal(400);
        expect(res.body.message).to.equal('Failed to delete provider');
        sinon.assert.calledOnce(deleteOneStub);
        sinon.assert.notCalled(agendaStub);
    });

    it('should handle errors when deleting provider', async function () {
        const provider = { provider: 'Provider 1', userId: 'User 1' };
        verifyStub.returns(true);
        findOneStub.returns(provider);
        deleteOneStub.throws(new Error('DB Error'));

        const res = (await request(app).delete('/api/providers').send(provider).set({ token: '1234567890' }));

        expect(res.statusCode).to.equal(500);
        expect(res.body.message).to.deep.equal({});
        sinon.assert.calledOnce(deleteOneStub);
        sinon.assert.notCalled(agendaStub);
    });
});