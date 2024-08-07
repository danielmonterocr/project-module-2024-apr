import express from 'express';
const app = express()

import mongoose from 'mongoose';
import bodyParser from 'body-parser'
import 'dotenv/config'

app.use(bodyParser.json())

import { auth as authRoute } from './routes/auth.js'
// const authRoute = require('./routes/auth')
//const postsRoute = require('./routes/posts')
//const commentsRoute = require('./routes/comments')
//const likesRoute = require('./routes/likes')

app.use('/api/users', authRoute)
//app.use('/api/posts', postsRoute)
//app.use('/api/comments', commentsRoute)
//app.use('/api/likes', likesRoute)

mongoose.connect(process.env.DB_CONNECTOR)

app.listen(3000, () => {
    console.log("Server is running")
})

export { app }