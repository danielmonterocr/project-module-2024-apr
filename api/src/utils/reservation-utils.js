import { Reservation } from '../models/Reservation.js';

import moment from 'moment';

/**
 * Get active reservation for a listing
 * 
 * @param {string} listingId 
 * @returns {Reservation} activeReservation - Active reservation
 */
const getActiveReservation = async (listingId) => {
    let today = new Date().toISOString();
    today = moment(today).format('YYYY-MM-DD');

    const activeReservation = await Reservation.find({
        listingId: listingId,
        startDate: { $lte: today },
        endDate: { $gt: today }
    });

    return activeReservation;
};

/**
 * Get finished reservation for a listing
 * 
 * @param {string} listingId 
 * @returns {Reservation} finishedReservation - Finished reservation
 */
const getFinishedReservation = async (listingId) => {
    let today = new Date().toISOString();
    today = moment(today).format('YYYY-MM-DD');

    const finishedReservation = await Reservation.findOne({
        listingId: listingId,
        endDate: today
    });

    return finishedReservation;
};

export { getActiveReservation, getFinishedReservation };