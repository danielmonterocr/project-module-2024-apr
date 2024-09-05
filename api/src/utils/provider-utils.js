import { logger } from '../logger.js'
import fs from 'fs';
import { Listing } from '../models/Listing.js';
import { Reservation } from '../models/Reservation.js';

/**
 * Import listings from Airbnb JSON file
 * 
 * @param {string} filePath - Path to the JSON file
 * @returns {Promise} - Promise object represents the listings
 */
const importListingsFromAirbnb = (filePath) => {
    return new Promise((resolve, reject) => {
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                console.log(filePath)
                return reject('Error reading file:', err);
            }

            const jsonData = JSON.parse(data);

            // Extract necessary data from JSON
            const listings = jsonData.data.viewer.user.staySupplyListings.edges.map(edge => {
                const node = edge.node;
                let buffer = Buffer.from(node.id, 'base64');
                let decodedStr = buffer.toString('utf8');
                const listingId = decodedStr.split(':')[1];
                const title = node.nameOrPlaceholderName;
                const location = node.location.defaultAddress.locality + ', ' + node.location.defaultAddress.administrativeZone;

                return {
                    provider: "airbnb",
                    listingId,
                    title,
                    location
                };
            });

            resolve(listings);
        });
    });
};

/**
 * Import reservations from Airbnb JSON file
 * 
 * @param {string} filePath - Path to the JSON file
 * @returns {Promise} - Promise object represents the reservations
 */
const importReservationsFromAirbnb = (filePath) => {
    return new Promise((resolve, reject) => {
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                return reject('Error reading file:', err);
            }

            const jsonData = JSON.parse(data);

            // Extract necessary data from JSON
            const reservations = jsonData.reservations.map(reservation => {
                const startDate = reservation.start_date;
                const endDate = reservation.end_date;
                const listingId = reservation.listing_id_str;

                return {
                    startDate,
                    endDate,
                    listingId
                };
            });

            resolve(reservations);
        });
    });
};

/**
 * Save listings to MongoDB
 * 
 * @param {string} userId - User ID
 * @param {Array} listings - Listings to save
 * @returns {Promise} - Promise object represents the save operation
 */
const saveListingsFromAirbnbToDb = async (userId, listings) => {
    // Save each listing to MongoDB if it doesn't already exist
    const savePromises = listings.map(async (listing) => {
        const existingListing = await Listing.findOne({ userId: userId, title: listing.title });

        if (!existingListing) {
            const newListing = new Listing(listing);
            newListing.userId = userId;
            return newListing.save();
        }
    });

    await Promise.all(savePromises);
}

/**
 * Save reservations to MongoDB
 * 
 * @param {Array} reservations - Reservations to save
 * @returns {Promise} - Promise object represents the save operation
 */
const saveReservationsFromAirbnbToDb = async (reservations) => {
    // Save each reservation to MongoDB if it doesn't already exist
    const savePromises = reservations.map(async (reservation) => {
        const existingReservation = await Reservation.findOne({ listingId: reservation.listingId });

        if (!existingReservation) {
            const newReservation = new Reservation(reservation);
            return newReservation.save();
        }
    });

    await Promise.all(savePromises);
}

/**
 * Sync Airbnb data
 * 
 * @returns {Boolean} - True if the sync was successful
 */
const syncAirbnb = async (userId) => {
    try {
        // Import listings from Airbnb JSON file
        logger.info("Importing listings from Airbnb");
        const listings = await importListingsFromAirbnb('./data/payloads/airbnb-listings-example.json');

        logger.info("Importing reservations from Airbnb");
        const reservations = await importReservationsFromAirbnb('./data/payloads/airbnb-reservations-example.json');

        // Save listings to MongoDB
        logger.info("Saving listings to MongoDB");
        await saveListingsFromAirbnbToDb(userId, listings);

        // Save reservations to MongoDB
        logger.info("Saving reservations to MongoDB");
        await saveReservationsFromAirbnbToDb(reservations);

        return true;
    } catch (err) {
        logger.error("Error syncing Airbnb data:", err);
    }
}

export {
    importListingsFromAirbnb,
    importReservationsFromAirbnb,
    saveListingsFromAirbnbToDb,
    saveReservationsFromAirbnbToDb,
    syncAirbnb
};