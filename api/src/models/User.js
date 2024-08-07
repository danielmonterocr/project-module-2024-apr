import mongoose from 'mongoose'

const userSchema = mongoose.Schema({
    username: {
        type: String,
        require: true,
        min: 3,
        max: 256
    },
    email: {
        type: String,
        require: true,
        min: 6,
        max: 256
    },
    password: {
        type: String,
        require: true,
        min: 3,
        max: 1024
    }
})

const User = mongoose.model('User', userSchema);
export { User }