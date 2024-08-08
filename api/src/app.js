import express from 'express';
const app = express()
const port = 3000

import mongoose from 'mongoose';
import 'dotenv/config'

app.use(express.json())

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

app.listen(port, () => console.log('App listening on port: ' + port))

export { app }