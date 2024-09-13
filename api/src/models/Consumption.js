import mongoose from "mongoose";

const consumptionSchema = mongoose.Schema({
    reservationId: {
        type: String,
        require: true,
        min: 3,
        max: 256,
    },
    type: {
        type: String,
        require: true,
        min: 3,
        max: 256,
    },
    date: {
        type: String,
        require: true,
        min: 3,
        max: 256,
    },
    electricityUsed: {
        type: Number,
        require: true,
    },
    waterUsed: {
        type: Number,
        require: true,
    },
});

const Consumption = mongoose.model("Consumption", consumptionSchema);
export { Consumption };