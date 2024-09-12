import { Device } from '../models/Device.js';

const getActiveDevices = async (listingId) => {
    const activeDevices = await Device.find({
        listingId: listingId
    });

    return activeDevices;
};

export { getActiveDevices };