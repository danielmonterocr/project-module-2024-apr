import mongoose from "mongoose";

const reportSchema = mongoose.Schema({
    reservationId: {
        type: String,
        required: true,
        min: 3,
        max: 256,
    },
    type: {
        type: String,
        required: true,
        min: 3,
        max: 256,
    },
    startDate: {
        type: String,
        required: true,
        min: 3,
        max: 256,
    },
    endDate: {
        type: String,
        required: true,
        min: 3,
        max: 256,
    },
    electricityUsed: {
        type: Number,
        required: true,
    },
    waterUsed: {
        type: Number,
        required: true,
    },
    details: {
        type: String,
        required: true,
        min: 3,
        max: 1024,
    },
});

const Report = mongoose.model("Report", reportSchema);
export { Report };