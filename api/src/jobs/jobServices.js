import { logger } from '../logger.js'
import { agenda } from './agenda.js';
import { syncAirbnb } from '../utils/provider-utils.js';
import { getActiveReservation, getFinishedReservation } from '../utils/reservation-utils.js';
import { getActiveDevices, calculate24hConsumption, calculateTotalConsumption } from '../utils/device-utils.js';

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

    // get active devices
    const activeDevices = await getActiveDevices(listingId);

    // get active reservation
    const activeReservation = await getActiveReservation(listingId);
    if (activeReservation) {
        // calculate consumption in last 24h
        logger.info("Calculating consumption in last 24h");
        await calculate24hConsumption(activeReservation._id, activeDevices);
    }

    // get finished reservation
    const finishedReservation = await getFinishedReservation(listingId);
    if (finishedReservation) {
        // calculate total consumption
        logger.info("Calculating total consumption");
        await calculateTotalConsumption(activeReservation._id, activeReservation.startDate, activeReservation.endDate);
    }
});

agenda.start();

export { agenda as jobServices };