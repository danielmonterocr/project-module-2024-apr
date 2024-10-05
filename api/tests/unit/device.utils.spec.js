import sinon from 'sinon';
import { expect } from 'chai';

import { Device } from '../../src/models/Device.js';
import { Report } from '../../src/models/Report.js';
import deviceUtils from '../../src/utils/device-utils.js';

describe('Device Utils', () => {
    let findStub, getElectricityUsedStub, getWaterUsedStub;

    afterEach(() => {
        sinon.restore();
    });

    it('should get active devices', async () => {
        findStub = sinon.stub(Device, 'find');
        const devices = [
            { deviceId: '1', isActive: true },
            { deviceId: '2', isActive: false },
            { deviceId: '3', isActive: true }
        ];
        findStub.returns(devices);
        const activeDevices = await deviceUtils.getActiveDevices('123');
        expect(activeDevices).to.have.length(3);
    });

    it('should calculate daily consumption', async () => {
        getElectricityUsedStub = sinon.stub(deviceUtils, 'getElectricityUsed');
        getWaterUsedStub = sinon.stub(deviceUtils, 'getWaterUsed');
        getElectricityUsedStub.returns(100000000);
        getWaterUsedStub.returns(221);
        const devices = [
            { deviceId: '1', deviceType: 'power', dailyConsumption: 100 },
            { deviceId: '2', deviceType: 'water-flow', dailyConsumption: 200 }
        ];
        const dailyConsumption = await deviceUtils.calculateDailyConsumption(devices);
        expect(dailyConsumption).to.deep.equal({ electricityUsed: '27.78', waterUsed: '221.00' });
    });

    it('should calculate total consumption', async () => {
        findStub = sinon.stub(Report, 'find');
        findStub.returns([
            { deviceId: '1', electricityUsed: 100, waterUsed: 200 },
            { deviceId: '2', electricityUsed: 100, waterUsed: 200 }
        ]);
        const totalConsumption = await deviceUtils.calculateTotalConsumption('123');
        expect(totalConsumption).to.deep.equal({ totalElectricityUsed: 200, totalWaterUsed: 400 });
    });
});