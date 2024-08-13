import jsonwebtoken from 'jsonwebtoken'

function auth(req, res, next) {
    // Check if token is present in headers
    const token = req.header('token')
    if (!token) {
        return res.status(403).send({ message: 'Access denied' })
    }

    try {
        // Verify token is valid
        const verified = jsonwebtoken.verify(token, process.env.TOKEN_SECRET)
        req.user = verified
        next()
    } catch {
        return res.status(404).send({ message: 'Invalid token' })
    }
}

export { auth }