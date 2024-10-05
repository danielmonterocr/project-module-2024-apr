import sinon from 'sinon';
import { expect } from 'chai';

import { Reservation } from '../../src/models/Reservation.js';
import { getActiveReservation, getFinishedReservation } from '../../src/utils/reservation-utils.js';

describe('Reservation Utils', () => {
    let findOneStub;

    afterEach(() => {
        sinon.restore();
    });

    it('should get active reservation', async function () {
        findOneStub = sinon.stub(Reservation, 'findOne');
        const listingId = '1';
        findOneStub.returns({'listingId': listingId});
        const activeReservation = await getActiveReservation(listingId);
        expect(activeReservation).to.have.property('listingId', listingId);
    });

    it('should get finished reservation', async function () {
        findOneStub = sinon.stub(Reservation, 'findOne');
        const listingId = '1';
        findOneStub.returns({'listingId': listingId});
        const finishedReservation = await getFinishedReservation(listingId);
        expect(finishedReservation).to.have.property('listingId', listingId);
    });
});