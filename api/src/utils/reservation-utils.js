import { Reservation } from '../models/Reservation.js';

import moment from 'moment';

const getActiveReservations = async (listingId) => {
    let today = new Date().toISOString();
    today = moment(today).format('YYYY-MM-DD');

    const activeReservations = await Reservation.find({
        listingId: listingId,
        startDate: { $lt: today },
        endDate: { $gt: today }
    });

    return activeReservations;
};

const getFinishedReservations = async (listingId) => {
    let today = new Date().toISOString();
    today = moment(today).format('YYYY-MM-DD');

    const finishedReservations = await Reservation.find({
        listingId: listingId,
        endDate: today
    });

    return finishedReservations;
};

export { getActiveReservations, getFinishedReservations };