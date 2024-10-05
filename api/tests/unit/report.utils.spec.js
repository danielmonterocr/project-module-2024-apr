import sinon from 'sinon';
import { expect } from 'chai';

import {
    generateDailyConsumptionReport,
    generateTotalConsumptionReport,
    saveDailyReportToDB,
    saveTotalReportToDB
} from '../../src/utils/report-utils.js';
import { Report } from '../../src/models/Report.js';

describe('Report Utils', () => {
    let saveStub;

    afterEach(() => {
        sinon.restore();
    });

    it('should generate daily consumption report', async () => {
        const dailyReport = await generateDailyConsumptionReport(29.45, 298.67);

        // Regular expression to find ratios
        const ratios = dailyReport.match(/(\d+\.\d+)%/g);

        // Extracted ratios
        const powerRatio = ratios[0];
        const waterRation = ratios[1];

        expect(powerRatio).to.equal('92.03%');
        expect(waterRation).to.equal('87.84%');
        expect(dailyReport).to.contain('👏 Great job keeping your electricity usage in check! 🌱 Keep it up!');
        expect(dailyReport).to.contain('👏 Your water consumption is within a sustainable range! Keep conserving! 🌎');
    });

    it('should generate daily consumption report with high usage', async () => {
        const dailyReport = await generateDailyConsumptionReport(35.2, 400);

        // Regular expression to find ratios
        const ratios = dailyReport.match(/(\d+\.\d+)%/g);

        // Extracted ratios
        const powerRatio = ratios[0];
        const waterRation = ratios[1];

        expect(powerRatio).to.equal('110.00%');
        expect(waterRation).to.equal('117.65%');
        expect(dailyReport).to.contain('⚡ You might want to reduce electricity usage. ' +
            'Consider turning off the AC or lights when not in use! 💡');
        expect(dailyReport).to.contain('🚿 Water usage is a bit high. ' +
            'Try shorter showers or turning off the tap when not in use! 💧');
    });

    it('should generate total consumption report', async () => {
        const totalReport = await generateTotalConsumptionReport(102.45, 1245.56, 7);

        // Regular expression to find ratios
        const ratios = totalReport.match(/(\d+\.\d+)%/g);

        // Extracted ratios
        const powerRatio = ratios[0];
        const waterRation = ratios[1];

        expect(powerRatio).to.equal('45.74%');
        expect(waterRation).to.equal('52.33%');
        expect(totalReport).to.contain('👏 Excellent! You\'re staying energy-efficient. 🌱 Keep conserving!');
        expect(totalReport).to.contain('👏 Well done! Your water consumption is below average. Keep up the good work! 🌎');
    });

    it('should generate total consumption report with high usage', async () => {
        const totalReport = await generateTotalConsumptionReport(205.78, 1578.90, 3);

        // Regular expression to find ratios
        const ratios = totalReport.match(/(\d+\.\d+)%/g);

        // Extracted ratios
        const powerRatio = ratios[0];
        const waterRation = ratios[1];

        expect(powerRatio).to.equal('214.35%');
        expect(waterRation).to.equal('154.79%');
        expect(totalReport).to.contain('⚡ You\'ve consumed more electricity than average. ' +
            'Consider energy-saving strategies! 💡');
        expect(totalReport).to.contain('🚿 Water usage is higher than usual. Try cutting down where possible! 💧');
    });

    it('should save daily report to database', async () => {
        saveStub = sinon.stub(Report.prototype, 'save');
        saveStub.resolves();
        const result = await saveDailyReportToDB('123', 29.45, 298.67, 'details');
    });

    it('should save total report to database', async () => {
        saveStub = sinon.stub(Report.prototype, 'save');
        saveStub.resolves();
        const result = await saveTotalReportToDB('123', 102.45, 1245.56, 7, 'details');
    });
});