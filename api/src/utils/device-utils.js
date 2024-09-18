import { THINGSBOARD_URL } from '../constants/config.js';
import { logger } from '../logger.js'
import { Device } from '../models/Device.js';
import { Consumption } from '../models/Consumption.js';
import thingsboardUtils from './thingsboard-utils.js';

/**
 * Get active devices for a listing
 * 
 * @param {string} listingId - Listing id
 * @returns {Promise} - Promise object represents the active devices
 */
const getActiveDevices = async (listingId) => {
    const activeDevices = await Device.find({
        listingId: listingId
    });

    return activeDevices;
};

/**
 * Get electricity used in the last 24h from Thingsboard API
 * 
 * @param {string} deviceId 
 * @param {string} startDate 
 * @param {string} endDate
 * @returns {float} totalPower - Total electricity used in the last 24h
 */
const getElectricityUsed = async (deviceId, startDate, endDate) => {
    const token = await thingsboardUtils.getUserJwtToken();
    // Use interval of 86400000 to get the last 24h
    // 1440 max number of data points per second for 24h
    // agg=SUM is used to get the energy used in each interval
    logger.info("Calling ThingsBoard API:");
    const url = THINGSBOARD_URL + '/api/plugins/telemetry/DEVICE/' + deviceId + '/values/timeseries' +
        '?keys=power1,power2&startTs=' + startDate + '&endTs=' + endDate +
        '&interval=86400000&limit=1440&agg=SUM&useStrictDataTypes=false';
    logger.info(url);
    const response = await fetch(url, {
        method: 'get',
        headers: { 'X-Authorization': 'Bearer ' + token }
    });

    const data = await response.json();
    logger.info("Response from ThingsBoard API: " + JSON.stringify(data));

    const power1 = parseFloat(data.power1[0].value);
    const power2 = parseFloat(data.power2[0].value);
    const totalPower = power1 + power2;
    return totalPower;
};

/**
 * Get water used in the last 24h from Thingsboard API
 * 
 * @param {string} deviceId 
 * @param {string} startDate 
 * @param {string} endDate 
 * @returns {float} totalLiters - Total water used in the last 24h
 */
const getWaterUsed = async (deviceId, startDate, endDate) => {
    const token = await thingsboardUtils.getUserJwtToken();
    // Use interval of 86400000 to get the last 24h
    // 1440 max number of data points per second for 24h
    // agg=SUM is used to get the energy used in each interval
    logger.info("Calling ThingsBoard API:");
    const url = THINGSBOARD_URL + '/api/plugins/telemetry/DEVICE/' + deviceId + '/values/timeseries' +
        '?keys=totalLiters&startTs=' + startDate + '&endTs=' + endDate +
        '&interval=86400000&limit=1440&agg=SUM&useStrictDataTypes=false';
    logger.info(url);
    const response = await fetch(url, {
        method: 'get',
        headers: { 'X-Authorization': 'Bearer ' + token }
    });

    const data = await response.json();
    logger.info("Response from ThingsBoard API: " + JSON.stringify(data));

    const totalLiters = parseFloat(data.totalLiters[0].value);
    return totalLiters;
};

/**
 * Calculate consumption in the last 24h
 * 
 * @param {string} reservationId 
 * @param {string} activeDevices 
 */
const calculate24hConsumption = async (reservationId, activeDevices) => {
    const endDate = Date.now();
    const startDate = endDate - 86400000; // 24h in milliseconds
    let electricityUsed = 0;
    let waterUsed = 0;

    // calculate consumption
    for (const device of activeDevices) {
        if (device.deviceType === 'power') {
            // get electricity used
            logger.info("Calculating electricity used");
            electricityUsed = await getElectricityUsed(device.deviceId, startDate, endDate);
        }
        if (device.deviceType === 'water-flow') {
            // get water used
            logger.info("Calculating water used");
            waterUsed = await getWaterUsed(device.deviceId, startDate, endDate);
        }
    }

    logger.info("Save last 24h consumption in DB");
    const consumption = new Consumption({
        reservationId: reservationId,
        type: "24h",
        date: new Date().toISOString(),
        electricityUsed: electricityUsed,
        waterUsed: waterUsed
    });
    const result = await consumption.save();
    logger.info("Consumption saved in DB: " + JSON.stringify(result));
};

/**
 * Calculate total consumption
 * 
 * @param {string} reservationId 
 * @param {string} activeDevices 
 */
const calculateTotalConsumption = async (reservationId, activeDevices) => {
    // calculate total consumption
    const consumptions = await Consumption.find({reservationId: reservationId, type: "24h"});

    let totalElectricityUsed = 0;
    let totalWaterUsed = 0;

    for (const consumption of consumptions) {
        totalElectricityUsed += consumption.electricityUsed;
        totalWaterUsed += consumption.waterUsed;
    }

    logger.info("Save total consumption in DB");
    const consumption = new Consumption({
        reservationId: reservationId,
        type: "total",
        date: new Date().toISOString(),
        electricityUsed: totalElectricityUsed,
        waterUsed: totalWaterUsed
    });
    const result = await consumption.save();
    logger.info("Consumption saved in DB: " + JSON.stringify(result));
};

export { getActiveDevices, calculate24hConsumption, calculateTotalConsumption };