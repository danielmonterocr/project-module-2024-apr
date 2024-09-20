import mongoose from "mongoose";

const reportSchema = mongoose.Schema({
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
    startDate: {
        type: String,
        require: true,
        min: 3,
        max: 256,
    },
    endDate: {
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
    details: {
        type: String,
        require: true,
        min: 3,
        max: 1024,
    },
});

const Report = mongoose.model("Report", reportSchema);
export { Report };