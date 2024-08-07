const joi = require('joi')

const registerValidation = data => {
    const schemaValidation = joi.object({
        username: joi.string().required().min(3).max(256),
        email: joi.string().required().min(6).max(256).email(),
        password: joi.string().required().min(6).max(1024)
    })

    return schemaValidation.validate(data)
}

const loginValidation = data => {
    const schemaValidation = joi.object({
        email: joi.string().required().min(6).max(256).email(),
        password: joi.string().required().min(6).max(1024)
    })

    return schemaValidation.validate(data)
}

const postValidation = data => {
    const schemaValidation = joi.object({
        post_title: joi.string().required().min(3).max(256),
        post_description: joi.string().required().min(3).max(1024)
    })

    return schemaValidation.validate(data)
}

const commentValidation = data => {
    const schemaValidation = joi.object({
        comment_description: joi.string().required().min(3).max(1024),
        parent_post: joi.string().required().min(3).max(256)
    })

    return schemaValidation.validate(data)
}

const likeValidation = data => {
    const schemaValidation = joi.object({
        postId: joi.string().required().min(3).max(256)
    })

    return schemaValidation.validate(data)
}

module.exports.registerValidation = registerValidation
module.exports.loginValidation = loginValidation
module.exports.postValidation = postValidation
module.exports.commentValidation = commentValidation
module.exports.likeValidation = likeValidation