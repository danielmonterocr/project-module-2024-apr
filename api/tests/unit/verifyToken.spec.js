import sinon from 'sinon';
import { expect } from 'chai';
import jsonwebtoken from 'jsonwebtoken';
import { auth } from '../../src/verifyToken.js';

describe('Auth Middleware', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            header: sinon.stub().returns('fake-token'),
        };
        res = {
            status: sinon.stub().returnsThis(),
            send: sinon.stub(),
        };
        next = sinon.stub();
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should call next if token is valid', () => {
        const userData = { id: 1, username: 'testuser' };
        sinon.stub(jsonwebtoken, 'verify').returns(userData);

        auth(req, res, next);

        expect(jsonwebtoken.verify.calledOnce).to.be.true;
        expect(req.user).to.deep.equal(userData);
        expect(next.calledOnce).to.be.true;
        expect(res.status.called).to.be.false;
    });

    it('should return 403 if no token is provided', () => {
        req.header = sinon.stub().returns(null);

        auth(req, res, next);

        expect(res.status.calledOnceWith(403)).to.be.true;
        expect(res.send.calledOnceWith({ message: 'Access denied' })).to.be.true;
        expect(next.called).to.be.false;
    });

    it('should return 404 if token is invalid', () => {
        sinon.stub(jsonwebtoken, 'verify').throws();

        auth(req, res, next);

        expect(jsonwebtoken.verify.calledOnce).to.be.true;
        expect(res.status.calledOnceWith(404)).to.be.true;
        expect(res.send.calledOnceWith({ message: 'Invalid token' })).to.be.true;
        expect(next.called).to.be.false;
    });
});