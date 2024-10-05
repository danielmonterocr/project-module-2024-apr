import sinon from 'sinon';
import { expect } from 'chai';

import thingsboardUtils from '../../src/utils/thingsboard-utils.js';

describe('ThingsBoard Utils', () => {
    let fetchStub, getUserJwtTokenStub;

    afterEach(function () {
        sinon.restore();
    });

    it('should return token', async function () {
        fetchStub = sinon.stub(global, 'fetch');
        fetchStub.returns({
            status: 200,
            json: () => Promise.resolve ({ token: '123' })
        });
        const response = await thingsboardUtils.getUserJwtToken();
        expect(response).to.equal('123');
    });

    it('should return null if status is not 200', async function () {
        fetchStub = sinon.stub(global, 'fetch');
        fetchStub.returns({
            status: 400,
            json: () => Promise.resolve ({})
        });
        const response = await thingsboardUtils.getUserJwtToken();
        expect(response).to.equal(null);
    });

    it('should return device key and secret', async function () {
        getUserJwtTokenStub = sinon.stub(thingsboardUtils, 'getUserJwtToken');
        fetchStub = sinon.stub(global, 'fetch');

        getUserJwtTokenStub.returns('123');
        fetchStub.onCall(0).returns({
            status: 200,
            json: () => Promise.resolve ({ id: { id: '123' } })
        });
        fetchStub.onCall(1).returns({
            status: 200,
            json: () => Promise.resolve ({ 
                provisionDeviceKey: 'key', 
                profileData: { provisionConfiguration: { provisionDeviceSecret: 'secret' } } 
            })
        });
        const response = await thingsboardUtils.getDeviceKeyAndSecret();
        expect(response).to.deep.equal({ key: 'key', secret: 'secret' });
    });

    it('should return null if status is not 200', async function () {
        getUserJwtTokenStub = sinon.stub(thingsboardUtils, 'getUserJwtToken');
        fetchStub = sinon.stub(global, 'fetch');

        getUserJwtTokenStub.returns('123');
        fetchStub.onCall(0).returns({
            status: 400,
            json: () => Promise.resolve ({})
        });
        const response = await thingsboardUtils.getDeviceKeyAndSecret();
        expect(response).to.equal(null);
    });

    it('should return null if status is not 200', async function () {
        getUserJwtTokenStub = sinon.stub(thingsboardUtils, 'getUserJwtToken');
        fetchStub = sinon.stub(global, 'fetch');

        getUserJwtTokenStub.returns('123');
        fetchStub.onCall(0).returns({
            status: 200,
            json: () => Promise.resolve ({ id: { id: '123' } })
        });
        fetchStub.onCall(1).returns({
            status: 400,
            json: () => Promise.resolve ({})
        });
        const response = await thingsboardUtils.getDeviceKeyAndSecret();
        expect(response).to.equal(null);
    });
});
