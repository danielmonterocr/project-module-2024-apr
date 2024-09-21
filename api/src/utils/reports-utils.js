import { logger } from '../logger.js'
import { Report } from '../models/Report.js';

/**
 * Generate a daily consumption report based on the power and water usage.
 * 
 * @param {Float} powerUsed 
 * @param {Float} waterUsed 
 * @returns {String} report
 */
function generateDailyConsumptionReport(powerUsed, waterUsed) {
    // Constants for average daily consumption
    const avgPowerPerDay = 32; // kWh, average between 30-33 kWh
    const avgWaterPerDay = 340; // Liters, average between 300-380L
    
    // Real-life comparisons
    const glassesOfWater = Math.round(waterUsed / 0.25); // Assuming a glass of water is 250ml
    const lightBulbHours = Math.round((powerUsed * 1000) / 60); // 60W light bulb for 1 hour

    // Comparison ratios
    const powerRatio = (powerUsed / avgPowerPerDay) * 100;
    const waterRatio = (waterUsed / avgWaterPerDay) * 100;

    // Recommendations based on usage
    const powerRecommendation = powerRatio > 100
        ? "⚡ You might want to reduce electricity usage. Consider using energy-efficient appliances! 💡"
        : "Great job keeping your electricity usage in check! 🌱 Keep it up!";
    
    const waterRecommendation = waterRatio > 100
        ? "🚿 Water usage is a bit high. Try shorter showers or fixing any leaks! 💧"
        : "👏 Your water consumption is within a sustainable range! Keep conserving! 🌎";

    // Generate the report
    const report = `
        📊 **Daily Consumption Report** 📊
        
        **Electricity Usage**: ${powerUsed} kWh
        - That's like keeping a 60W light bulb on for ${lightBulbHours} hours! 💡
        - You've used ${powerRatio}% of the average daily electricity consumption (${avgPowerPerDay} kWh).
        ${powerRecommendation}
        
        **Water Usage**: ${waterUsed} L
        - That's approximately ${glassesOfWater} glasses of water! 🥛
        - You've used ${waterRatio}% of the average daily water consumption (${avgWaterPerDay} L).
        ${waterRecommendation}
    `;

    logger.info("Daily consumption report: " + report);

    return report;
}

/**
 * Generate a total consumption report based on the total power and water usage.
 * 
 * @param {Float} totalPowerUsed 
 * @param {Float} totalWaterUsed 
 * @param {Int} numDays 
 * @returns {String} report
 */
function generateTotalConsumptionReport(totalPowerUsed, totalWaterUsed, numDays) {
    // Constants for average daily consumption
    const avgPowerPerDay = 32; // kWh, average between 30-33 kWh
    const avgWaterPerDay = 340; // Liters, average between 300-380L

    // Calculate the average expected usage for the number of days
    const expectedPower = avgPowerPerDay * numDays;
    const expectedWater = avgWaterPerDay * numDays;

    // Real-life comparisons
    const glassesOfWater = Math.round(totalWaterUsed / 0.25); // Assuming a glass of water is 250ml
    const lightBulbHours = Math.round((totalPowerUsed * 1000) / 60); // 60W light bulb for 1 hour

    // Comparison ratios
    const powerRatio = (totalPowerUsed / expectedPower) * 100;
    const waterRatio = (totalWaterUsed / expectedWater) * 100;

    // Recommendations based on usage
    const powerRecommendation = powerRatio > 100
        ? `⚡ You've consumed more electricity than average. Consider energy-saving strategies! 💡`
        : `Excellent! You're staying energy-efficient. 🌱 Keep conserving!`;

    const waterRecommendation = waterRatio > 100
        ? `🚿 Water usage is higher than usual. Try cutting down where possible! 💧`
        : `👏 Well done! Your water consumption is below average. Keep up the good work! 🌎`;

    // Generate the report
    const report = `
        📊 **Total Consumption Report (for ${numDays} days)** 📊
        
        **Total Electricity Usage**: ${totalPowerUsed} kWh
        - That's like keeping a 60W light bulb on for ${lightBulbHours} hours! 💡
        - You've used ${powerRatio}% of the expected electricity consumption (${expectedPower.toFixed(2)} kWh).
        ${powerRecommendation}
        
        **Total Water Usage**: ${totalWaterUsed.toFixed(2)} L
        - That's approximately ${glassesOfWater} glasses of water! 🥛
        - You've used ${waterRatio}% of the expected water consumption (${expectedWater.toFixed(2)} L).
        ${waterRecommendation}
    `;

    logger.info("Total consumption report: " + report);

    return report;
}

/**
 * Save the daily report to the database.
 * 
 * @param {*} reservationId 
 * @param {*} electricityUsed 
 * @param {*} waterUsed 
 * @param {*} details 
 * @returns {Promise}
 */
function saveDailyReportToDB(reservationId, electricityUsed, waterUsed, details) {
    // Save the report to the database
    logger.info("Save last daily report in DB");
    const report = new Report({
        reservationId: reservationId,
        type: "daily",
        startDate: new Date(Date.now() - 86400000).toISOString().split('T')[0], // current date minus one day in format YYYY-MM-DD
        endDate: new Date().toISOString().split('T')[0], // current date in format YYYY-MM-DD
        electricityUsed: electricityUsed,
        waterUsed: waterUsed,
        details: details
    });
    const result = report.save();
    logger.info("Daily report saved in DB");
}

/**
 * Save the total report to the database.
 * 
 * @param {*} reservationId 
 * @param {*} startDate 
 * @param {*} endDate 
 * @param {*} totalElectricityUsed 
 * @param {*} totalWaterUsed 
 * @param {*} details 
 * @returns {Promise}
 */
function saveTotalReportToDB(reservationId, startDate, endDate, totalElectricityUsed, totalWaterUsed, details) {
    // Save the report to the database
    logger.info("Save final report in DB");
    const report = new Report({
        reservationId: reservationId,
        type: "total",
        startDate: startDate,
        endDate: endDate,
        electricityUsed: totalElectricityUsed,
        waterUsed: totalWaterUsed,
        details: details
    });
    const result = report.save();
    logger.info("Final report saved in DB");
}

export {
    generateDailyConsumptionReport,
    generateTotalConsumptionReport,
    saveDailyReportToDB,
    saveTotalReportToDB
};