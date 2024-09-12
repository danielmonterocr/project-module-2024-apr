import { logger } from '../logger.js'
import { agenda } from './agenda.js';
import { syncAirbnb } from '../utils/provider-utils.js';
import { getActiveReservations, getFinishedReservations } from '../utils/reservation-utils.js';
import { getActiveDevices } from '../utils/device-utils.js';

agenda.define("sync-provider", async job => {
    logger.info("Syncing Airbnb listings and reservations");
    const userId = job.attrs.data.userId;
    syncAirbnb(userId);
});

agenda.define("calculate-consumption", async job => {
    logger.info("Calculating consumption for active reservations");
    const listingId = job.attrs.data.listingId;
    console.log('listingId', listingId);

    // get active devices
    const activeDevices = await getActiveDevices(listingId);
    console.log(activeDevices);

    // get active listings
    const activeReservations = await getActiveReservations(listingId);
    console.log(activeReservations);

    // calculate consumption in last 24h

    // get finished listings
    const finishedReservations = await getFinishedReservations(listingId);
    console.log(finishedReservations);

    // calculate total consumption

    // delete reservation
});

agenda.start();

export { agenda as jobServices };