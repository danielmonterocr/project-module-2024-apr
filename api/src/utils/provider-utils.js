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
                return reject('Error reading file:', err);
            }

            const jsonData = JSON.parse(data);
            
            // Extract necessary data from JSON
            const listings = jsonData.data.viewer.user.staySupplyListings.edges.map(edge => {
                const node = edge.node;
                let buffer = Buffer.from(node.id, 'base64');
                let decodedStr  = buffer.toString('utf8');
                const listingId = decodedStr.split(':')[1];
                const title = node.nameOrPlaceholderName;
                const description = node.descriptions.descriptions.find(desc => desc.descriptionType === 'SUMMARY').values[0].value;
                const location = node.location.defaultAddress.locality + ', ' + node.location.defaultAddress.administrativeZone;
                // const userId = jsonData.data.viewer.normalizedUser.id;

                return {
                    provider: "airbnb",
                    listingId,
                    title,
                    description,
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

export { importListingsFromAirbnb, importReservationsFromAirbnb, saveListingsFromAirbnbToDb, saveReservationsFromAirbnbToDb };