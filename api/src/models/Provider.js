import mongoose from 'mongoose'

const providerSchema = mongoose.Schema({
    provider: {
        type: String,
        required: true,
        min: 3,
        max: 256
    },
    userId: {
        type: String,
        required: true,
        min: 3,
        max: 256
    }
})

const Provider = mongoose.model('Provider', providerSchema);
export { Provider };