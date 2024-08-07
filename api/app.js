const express = require('express')
const app = express()

const mongoose = require('mongoose')
const bodyParser = require('body-parser')
require('dotenv/config')

app.use(bodyParser.json())

const authRoute = require('./routes/auth')
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
