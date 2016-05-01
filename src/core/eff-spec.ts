'use strict';

import * as mocha from 'mocha';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';

import {Op, Eff} from './eff';
import {Context} from './ctx';
import {Run} from './run';
import {EffUtil} from './util';

chai.use(chaiAsPromised);

describe('Regular Operation', () => {

  it('should work fine', () => {
    const op1 = Eff.immediate(() => 3);
    return chai.expect(op1.run({}).toPromise()).to.eventually.equal(3);
  });

  it('can be cancelled', () => {
    const op1 = Eff.immediate(() => 3);
    const run = op1.run({});
    const promise = run.toPromise();
    const cause = new Error('Operation cancelled');
    run.cancel(cause);
    return chai.expect(promise).to.be.rejectedWith(cause);
  });
});

describe('Bind Operation', function () {
  this.timeout(4000);

  it('should work fine', () => {
    const op1 = Eff.immediate(() => 3);
    const op2 = op1.chain((multiplier) => Eff.immediate(() => 2 * multiplier));
    return chai.expect(op2.run({}).toPromise()).to.eventually.equal(6);
  });

  it('can be cancelled', () => {
    const op1 = Eff.immediate(() => 3);
    const op2 = op1.chain((multiplier) => Eff.immediate(() => 2 * multiplier));
    const run = op2.run({});
    const cause = new Error('Operation cancelled');
    run.cancel(cause);
    return chai.expect(run.toPromise()).to.be.rejectedWith(cause);
  });

  it('can handle exceptions', () => {
    const op1 = Eff.immediate(() => 3);
    const op2 = op1.chain((multiplier) => Eff.immediate(() => {
      throw new Error('No need for a ' + multiplier);
    }));
    return chai.expect(op2.run({}).toPromise()).to.be.rejectedWith('No need for a 3');
  });

  it('trampolines', () => {
    let operation = Eff.immediate(() => 0);
    const numberOfLoops = 20000;
    for (let l = 0; l < numberOfLoops; l++) {
      operation = operation.chain((i:number) => Eff.of(i + 1));
    }
    return chai.expect(operation.exec({})).to.eventually.equal(numberOfLoops);
  });

  it('trampolines with delay', () => {
    let operation = Eff.immediate(() => 0);
    const numberOfLoops = 20000;
    for (let l = 0; l < numberOfLoops; l++) {
      operation = operation.chain((i:number) => EffUtil.delay(() => i + 1));
    }
    return chai.expect(operation.exec({})).to.eventually.equal(numberOfLoops);
  });

  it('trampolines with cancellation', () => {
    let operation = Eff.immediate(() => 0);
    const numberOfLoops = 20000;
    const cause = new Error('Operation cancelled');
    const finished = new Error('Operation should not have finished');
    let count = 0;
    for (let l = 0; l < numberOfLoops; l++) {
      operation = operation.chain((i:number) => EffUtil.delay(() => {
        count = i;
        return i + 1;
      }));
    }
    const ctx = new Context();
    const promise = operation.exec({}, ctx).then((success:number) => Promise.reject(finished), (reject:Error) => Promise.resolve(count));
    setTimeout(() => {
      ctx.cancel(cause);
    }, 100);
    return chai.expect(promise).to.eventually.lessThan(numberOfLoops);
  });

});
