import sinon from 'sinon';
import { expect } from 'chai';

import { importListingsFromAirbnb, importReservationsFromAirbnb } from '../../src/utils/provider-utils.js';
import { saveListingsFromAirbnbToDb, saveReservationsFromAirbnbToDb } from '../../src/utils/provider-utils.js';
import { Listing } from '../../src/models/Listing.js';
import { Reservation } from '../../src/models/Reservation.js';

describe('Provider Utils', () => {
    let findOneStub, saveStub;

    afterEach(() => {
        sinon.restore();
    });

    it('should import listings from Airbnb JSON file', async () => {
        const filePath = './data/payloads/airbnb-listings-example.json';
        const listings = await importListingsFromAirbnb(filePath);

        expect(listings).to.be.an('array');
        expect(listings).to.have.length(2);
        expect(listings[0]).to.have.property('provider', 'airbnb');
        expect(listings[0]).to.have.property('title', 'NourTinyFootprint Getaway 1');
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

    it('should save listings from Airbnb to MongoDB', async () => {
        findOneStub = sinon.stub(Listing, 'findOne');
        saveStub = sinon.stub(Listing.prototype, 'save');

        const userId = 'test-user-id';
        const listings = [
            { provider: 'airbnb', listingId: '1', title: 'Listing 1', location: 'Location 1' },
            { provider: 'airbnb', listingId: '2', title: 'Listing 2', location: 'Location 2' }
        ];

        findOneStub.returns(null); // Simulate no existing listing found
        saveStub.resolves();

        await saveListingsFromAirbnbToDb(userId, listings);

        expect(findOneStub.callCount).to.equal(2);
        expect(saveStub.callCount).to.equal(2);
    });

    it('should not save listings that already exist in the database', async () => {
        findOneStub = sinon.stub(Listing, 'findOne');
        saveStub = sinon.stub(Listing.prototype, 'save');

        const userId = 'test-user-id';
        const listings = [
            { provider: 'airbnb', listingId: '1', title: 'Listing 1', location: 'Location 1' },
            { provider: 'airbnb', listingId: '2', title: 'Listing 2', location: 'Location 2' }
        ];

        findOneStub.returns({ listingId: '1' }); // Simulate existing listing found
        saveStub.resolves();

        await saveListingsFromAirbnbToDb(userId, listings);

        expect(findOneStub.callCount).to.equal(2);
        expect(saveStub.callCount).to.equal(0);
    });

    it('should save reservations from Airbnb to MongoDB', async () => {
        findOneStub = sinon.stub(Reservation, 'findOne');
        saveStub = sinon.stub(Reservation.prototype, 'save');

        const reservations = [
            { listingId: 'Listing 1', startDate: '2024-08-18', endDate: '2024-08-19' },
            { listingId: 'Listing 2', startDate: '2024-08-25', endDate: '2024-08-27' },
        ];

        findOneStub.returns(null); // Simulate no existing listing found
        saveStub.resolves();

        await saveReservationsFromAirbnbToDb(reservations);

        expect(findOneStub.callCount).to.equal(2);
        expect(saveStub.callCount).to.equal(2);
    });

    it('should not save reservations that already exist in the database', async () => {
        findOneStub = sinon.stub(Reservation, 'findOne');
        saveStub = sinon.stub(Reservation.prototype, 'save');

        const reservations = [
            { listingId: 'Listing 1', startDate: '2024-08-18', endDate: '2024-08-19' },
            { listingId: 'Listing 2', startDate: '2024-08-25', endDate: '2024-08-27' },
        ];

        findOneStub.returns({ listingId: 'Listing 1' }); // Simulate existing listing found
        saveStub.resolves();

        await saveReservationsFromAirbnbToDb(reservations);

        expect(findOneStub.callCount).to.equal(2);
        expect(saveStub.callCount).to.equal(0);
    });
});