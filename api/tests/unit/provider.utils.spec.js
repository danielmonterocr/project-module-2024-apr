import sinon from 'sinon';
import { expect } from 'chai';

import { importListingsFromAirbnb, importReservationsFromAirbnb } from '../../src/utils/provider-utils.js';

describe('Provider Utils', () => {
    it('should import listings from Airbnb JSON file', async () => {
        const filePath = './data/payloads/airbnb-listings-example.json';
        const listings = await importListingsFromAirbnb(filePath);

        expect(listings).to.be.an('array');
        expect(listings).to.have.length(1);
        expect(listings[0]).to.have.property('provider', 'airbnb');
        expect(listings[0]).to.have.property('title', 'NourTinyFootprint Getaway');
        expect(listings[0]).to.have.property('description');
        expect(listings[0]).to.have.property('location', 'Playa Hermosa, Puntarenas Province');
        expect(listings[0]).to.have.property('listingId', '1065162203416824771');
    });

    it('should import reservations from Airbnb JSON file', async () => {
        const filePath = './data/payloads/airbnb-reservations-example.json';
        const reservations = await importReservationsFromAirbnb(filePath);

        expect(reservations).to.be.an('array');
        expect(reservations).to.have.length(1);
        expect(reservations[0]).to.have.property('startDate', '2024-08-18');
        expect(reservations[0]).to.have.property('endDate', '2024-08-19');
        expect(reservations[0]).to.have.property('listingId', '1065162203416824771');
    });
});