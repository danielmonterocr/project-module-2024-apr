agenda.define("sync-airbnb", async job => {
    try {
        // Import listings from Airbnb JSON file
        const listings = await importListingsFromAirbnb('./data/airbnb-listings.json');
        const reservations = await importReservationsFromAirbnb('./data/airbnb-reservations.json');

        // Save listings to MongoDB
        await saveListingsFromAirbnbToDb(userId, listings);

        // Save reservations to MongoDB
        await saveReservationsFromAirbnbToDb(userId, reservations);
    } catch (err) {
        return err;
    }
});