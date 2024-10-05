import mongoose from "mongoose";

const deviceSchema = mongoose.Schema({
    deviceName: {
        type: String,
        required: true,
        min: 3,
        max: 256,
    },
    deviceType: {
        type: String,
        required: true,
        min: 3,
        max: 256,
    },
    deviceToken: {
        type: String,
        required: true,
        min: 3,
        max: 256,
    },
    listingId: {
        type: String,
        required: true,
        min: 3,
        max: 256,
    },
    deviceId: {
        type: String,
        required: true,
        min: 3,
        max: 256,
    },
});

const Device = mongoose.model("Device", deviceSchema);
export { Device };