import { logger } from '../logger.js'
import { syncAirbnb } from '../utils/provider-utils';

agenda.define("sync-airbnb", async job => {
    logger.info("Creating Airbnb sync job");
    syncAirbnb();
});