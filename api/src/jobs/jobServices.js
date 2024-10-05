import { logger } from '../logger.js'
import { agenda } from './agenda.js';
import { syncAirbnb } from '../utils/provider-utils.js';
import { getActiveReservation, getFinishedReservation } from '../utils/reservation-utils.js';
import deviceUtils from '../utils/device-utils.js';
import { 
    generateDailyConsumptionReport, 
    generateTotalConsumptionReport,
    saveDailyReportToDB,
    saveTotalReportToDB
} from '../utils/report-utils.js';

/**
 * Sync provider job
 */
agenda.define("sync-provider", async job => {
    logger.info("Syncing Airbnb listings and reservations");
    const userId = job.attrs.data.userId;
    syncAirbnb(userId);
});

/**
 * Calculate consumption job
 */
agenda.define("calculate-consumption", async job => {
    logger.info("Calculating consumption for active reservations");
    const listingId = job.attrs.data.listingId;
    let utilitiesUsed = {};
    let report = "";

    try {
        // get active devices
        const activeDevices = await deviceUtils.getActiveDevices(listingId);
        logger.info("Active devices: " + JSON.stringify(activeDevices));

        // get active reservation
        const activeReservation = await getActiveReservation(listingId);
        logger.info("Active reservation: " + JSON.stringify(activeReservation));
        if (activeReservation) {
            // calculate daily consumption
            logger.info("Calculating daily consumption");
            utilitiesUsed = await deviceUtils.calculateDailyConsumption(activeDevices);
            logger.info("Generating daily report");
            report = generateDailyConsumptionReport(utilitiesUsed.electricityUsed, utilitiesUsed.waterUsed);
            saveDailyReportToDB(activeReservation._id, utilitiesUsed.electricityUsed, utilitiesUsed.waterUsed, report);
        }

        // get finished reservation
        const finishedReservation = await getFinishedReservation(listingId);
        logger.info("Finished reservation: " + JSON.stringify(finishedReservation));
        if (finishedReservation) {
            // calculate total consumption
            logger.info("Calculating total consumption");
            utilitiesUsed = await deviceUtils.calculateTotalConsumption(activeReservation._id);
            const numberOfDays = (new Date(activeReservation.endDate) - new Date(activeReservation.startDate)) / (1000 * 60 * 60 * 24);
            report = generateTotalConsumptionReport(
                utilitiesUsed.totalElectricityUsed, 
                utilitiesUsed.totalWaterUsed,
                numberOfDays
            );
            saveTotalReportToDB(
                activeReservation._id, 
                activeReservation.startDate, 
                activeReservation.endDate, 
                utilitiesUsed.totalElectricityUsed, 
                utilitiesUsed.totalWaterUsed, 
                report
            );
        }
    } catch (error) {
        logger.error("Error calculating consumption: " + error);
    }
});

agenda.start();

export { agenda as jobServices };