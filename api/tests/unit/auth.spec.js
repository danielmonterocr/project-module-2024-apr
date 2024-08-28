import sinon from 'sinon';
import { expect } from 'chai';
import bcryptjs from 'bcryptjs';
import request from 'supertest'
import jsonwebtoken from 'jsonwebtoken';
import { app } from '../../src/app.js'
import { User } from '../../src/models/User.js';

describe('POST /api/users/register', () => {
    let findOneStub, saveStub, genSaltStub, hashStub

    beforeEach(() => {
        findOneStub = sinon.stub(User, 'findOne')
        saveStub = sinon.stub(User.prototype, 'save')
        genSaltStub = sinon.stub(bcryptjs, 'genSalt')
        hashStub = sinon.stub(bcryptjs, 'hash')
    })

    afterEach(() => {
        sinon.restore() // Restore all stubs
    })

    it('should return 400 if user already exists', async () => {
        findOneStub.resolves({ email: 'test@example.com' })

        const res = await request(app)
            .post('/api/users/register')
            .send({ email: 'test@example.com', password: '123456', username: 'testuser' })

        expect(res.statusCode).to.equal(400)
        expect(res.body.message).to.equal('User already exists')
        sinon.assert.calledOnce(findOneStub)
    })

    it('should save user if valid', async () => {
        findOneStub.resolves(null)
        genSaltStub.resolves('salt')
        hashStub.resolves('hashedPassword')

        const savedUser = { username: 'testuser', email: 'test@example.com', password: 'hashedPassword' }
        saveStub.resolves(savedUser)

        const res = await request(app)
            .post('/api/users/register')
            .send({ username: 'testuser', email: 'test@example.com', password: '123456' })
        expect(res.statusCode).to.equal(200)
        expect(res.body).to.deep.equal(savedUser)
        sinon.assert.calledOnce(saveStub)
    })

    it('should return 400 if there is a database error', async () => {
        findOneStub.resolves(null)
        genSaltStub.resolves('salt')
        hashStub.resolves('hashedPassword')
        saveStub.rejects(new Error('DB Error'))

        const res = await request(app)
            .post('/api/users/register')
            .send({ username: 'testuser', email: 'test@example.com', password: '123456' })

        expect(res.statusCode).to.equal(500)
        expect(res.body.message).to.deep.equal({})
        sinon.assert.calledOnce(saveStub)
    })
})

describe('POST /api/users/login', () => {
    let findOneStub, compareStub, signStub

    beforeEach(() => {
        findOneStub = sinon.stub(User, 'findOne')
        compareStub = sinon.stub(bcryptjs, 'compare')
        signStub = sinon.stub(jsonwebtoken, 'sign')
    })

    afterEach(() => {
        sinon.restore() // Restore all stubs
    })

    it('should return 404 if user is not found', async () => {
        findOneStub.resolves(null)

        const res = await request(app)
            .post('/api/users/login')
            .send({ email: 'test@example.com', password: '123456' })

        expect(res.statusCode).to.equal(404)
        expect(res.body.message).to.equal('User not found')
        sinon.assert.calledOnce(findOneStub)
    })

    it('should return 400 if password is wrong', async () => {
        findOneStub.resolves({ email: 'test@example.com', password: 'hashedPassword' })
        compareStub.resolves(false)

        const res = await request(app)
            .post('/api/users/login')
            .send({ email: 'test@example.com', password: 'wrongpassword' })

        expect(res.statusCode).to.equal(400)
        expect(res.body.message).to.equal('Password is wrong')
        sinon.assert.calledOnce(compareStub)
    })

    it('should return token if login is successful', async () => {
        findOneStub.resolves({ _id: 'userId', email: 'test@example.com', password: 'hashedPassword' })
        compareStub.resolves(true)
        signStub.returns('token')

        const res = await request(app)
            .post('/api/users/login')
            .send({ email: 'test@example.com', password: 'correctpassword' })

        expect(res.statusCode).to.equal(200)
        expect(res.header.token).to.equal('token')
        expect(res.body.message).to.equal('User logged in')
        sinon.assert.calledOnce(signStub)
    })
})