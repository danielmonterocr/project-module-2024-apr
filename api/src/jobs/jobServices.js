import logger from '../utils/logger';

agenda.define("sync-airbnb", async job => {
    try {
        // Import listings from Airbnb JSON file
        logger.info("Importing listings from Airbnb");
        const listings = await importListingsFromAirbnb('./data/airbnb-listings.json');

        logger.info("Importing reservations from Airbnb");
        const reservations = await importReservationsFromAirbnb('./data/airbnb-reservations.json');

        // Save listings to MongoDB
        logger.info("Saving listings to MongoDB");
        await saveListingsFromAirbnbToDb(userId, listings);

        // Save reservations to MongoDB
        logger.info("Saving reservations to MongoDB");
        await saveReservationsFromAirbnbToDb(userId, reservations);
    } catch (err) {
        return err;
    }
});