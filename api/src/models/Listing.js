import mongoose from 'mongoose'

const listingSchema = mongoose.Schema({
    listingId: {
        type: String,
        require: true,
        min: 3,
        max: 256
    },
    provider: {
        type: String,
        require: true,
        min: 3,
        max: 256
    },
    title: {
        type: String,
        require: true,
        min: 3,
        max: 256
    },
    location: {
        type: String,
        require: true,
        min: 3,
        max: 256
    },
    userId: {
        type: String,
        require: true,
        min: 3,
        max: 256
    },
    enabled: {
        type: Boolean,
        default: false
    }
})

const Listing = mongoose.model('Listing', listingSchema);
export { Listing }