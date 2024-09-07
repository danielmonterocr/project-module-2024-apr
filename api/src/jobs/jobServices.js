import { logger } from '../logger.js'
import { syncAirbnb } from '../utils/provider-utils';

agenda.define("sync-provider", async job => {
    logger.info("Syncing Airbnb listings and reservations");
    syncAirbnb();
});

agenda.define("calculate-consumption", async job => {
    logger.info("Calculating consumption for active reservations");
    // TODO: read DB and look for reservations related to listing. Then fetch data from ThingsBoard and calculate
    // electricity and water used in last 24h.

    // If reservation is due, fetch data of entire stay from ThingsBoard and calculate total electricity and water used.
});