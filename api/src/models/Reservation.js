import mongoose from 'mongoose'

const reservationSchema = mongoose.Schema({
    listingId: {
        type: String,
        required: true,
        min: 3,
        max: 256
    },
    startDate: {
        type: String,
        required: true,
        min: 10,
        max: 10
    },
    endDate: {
        type: String,
        required: true,
        min: 10,
        max: 10
    }
})

const Reservation = mongoose.model('Reservation', reservationSchema);
export { Reservation };