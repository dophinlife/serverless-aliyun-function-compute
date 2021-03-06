/*global beforeEach, afterEach, expect*/

'use strict';

const sinon = require('sinon');
const BbPromise = require('bluebird');
const path = require('path');

const AliyunProvider = require('../../provider/aliyunProvider');
const AliyunInvoke = require('../aliyunInvoke');
const Serverless = require('../../test/serverless');

describe('InvokeFunction', () => {
  let serverless;
  let aliyunInvoke;

  beforeEach(() => {
    serverless = new Serverless();
    serverless.service.service =  'my-service';
    serverless.service.provider = {
      name: 'aliyun',
      credentials: path.join(__dirname, '..', 'test', 'credentials'),
    };
    serverless.config = {
      servicePath: path.join(__dirname, '..', 'test')
    };
    const options = {
      stage: 'dev',
      region: 'my-region',
    };
    serverless.setProvider('aliyun', new AliyunProvider(serverless, options));
    serverless.pluginManager.setCliOptions(options);
    aliyunInvoke = new AliyunInvoke(serverless, options);
  });

  describe('#invokeFunction()', () => {
    let invokeStub;
    let printResultStub;
    let handleErrorStub;

    beforeEach(() => {
      invokeStub = sinon.stub(aliyunInvoke, 'invoke');
      printResultStub = sinon.stub(aliyunInvoke, 'printResult')
        .returns(BbPromise.resolve());
      handleErrorStub = sinon.stub(aliyunInvoke, 'handleError')
        .returns(BbPromise.resolve());
    });

    afterEach(() => {
      aliyunInvoke.invoke.restore();
      aliyunInvoke.printResult.restore();
      aliyunInvoke.handleError.restore();
    });

    it('should run promise chain when invocation succeeds', () => {
      const data = { test: 'ok' };
      invokeStub.returns(BbPromise.resolve(data));
      return aliyunInvoke.invokeFunction().then(() => {
        expect(invokeStub.calledOnce).toEqual(true);
        expect(printResultStub.calledAfter(invokeStub)).toEqual(true);
        expect(printResultStub.calledOnce).toEqual(true);
        expect(printResultStub.calledWithExactly(data)).toEqual(true);
        expect(handleErrorStub.called).toEqual(false);
      });
    });

    it('should run promise chain when invocation fails', () => {
      const err = new Error();
      invokeStub.returns(BbPromise.reject(err));
      return aliyunInvoke.invokeFunction().then(() => {
        expect(invokeStub.calledOnce).toEqual(true);
        expect(handleErrorStub.calledAfter(invokeStub));
        expect(handleErrorStub.calledAfter(invokeStub)).toEqual(true);
        expect(handleErrorStub.calledOnce).toEqual(true);
        expect(handleErrorStub.calledWithExactly(err)).toEqual(true);
        expect(printResultStub.called).toEqual(false);
      });
    });
  });

  describe('#invokeFunction()', () => {
    let invokeFunctionStub;
    let consoleLogStub;

    const response = '{"statusCode":200,"body":"{"message":"' +
      'Hello, the current time is 2017-07-22:15:20:42!"}"}';

    beforeEach(() => {
      invokeFunctionStub = sinon.stub(aliyunInvoke.provider, 'invokeFunction');
      consoleLogStub = sinon.stub(aliyunInvoke.serverless.cli, 'log').returns();
      aliyunInvoke.serverless.service.functions = {
        getTest: {
          handler: 'index.getHandler',
          events: [
            { http: {
              path: '/baz',
              method: 'get'
            } }
          ]
        },
      };
    });

    afterEach(() => {
      aliyunInvoke.provider.invokeFunction.restore();
      aliyunInvoke.serverless.cli.log.restore();
    });

    it('should invoke the provided function without data option', () => {
      aliyunInvoke.options.function = 'getTest';
      invokeFunctionStub.returns(BbPromise.resolve(response));
      return aliyunInvoke.invokeFunction().then(() => {
        expect(invokeFunctionStub.calledOnce).toEqual(true);
        expect(
          invokeFunctionStub.calledWithExactly(
            'my-service-dev',
            'my-service-dev-getTest',
            undefined)
        ).toEqual(true);
        const logs = [
          'Invoking my-service-dev-getTest of my-service-dev',
          response
        ];
        expect(consoleLogStub.callCount).toEqual(logs.length);
        for (var i = 0; i < consoleLogStub.callCount; ++i) {
          expect(consoleLogStub.getCall(i).args[0]).toEqual(logs[i]);
        }
      });
    });

    it('should invoke the provided function with JSON data', () => {
      aliyunInvoke.options.function = 'getTest';
      aliyunInvoke.options.data = '{"a": "b"}';
      invokeFunctionStub.returns(BbPromise.resolve(response));

      return aliyunInvoke.invokeFunction().then(() => {
        expect(invokeFunctionStub.calledOnce).toEqual(true);
        expect(
          invokeFunctionStub.calledWithExactly(
            'my-service-dev',
            'my-service-dev-getTest',
            {a: 'b'})
        ).toEqual(true);
        const logs = [
          'Invoking my-service-dev-getTest of my-service-dev with { a: \'b\' }',
          response
        ];
        expect(consoleLogStub.callCount).toEqual(logs.length);
        for (var i = 0; i < consoleLogStub.callCount; ++i) {
          expect(consoleLogStub.getCall(i).args[0]).toEqual(logs[i]);
        }
      });
    });

    it('should invoke the provided function with string data', () => {
      aliyunInvoke.options.function = 'getTest';
      aliyunInvoke.options.data = 'test';
      invokeFunctionStub.returns(BbPromise.resolve(response));

      return aliyunInvoke.invokeFunction().then(() => {
        expect(invokeFunctionStub.calledOnce).toEqual(true);
        expect(
          invokeFunctionStub.calledWithExactly(
            'my-service-dev',
            'my-service-dev-getTest',
            'test')
        ).toEqual(true);
        const logs = [
          'Invoking my-service-dev-getTest of my-service-dev with \'test\'',
          response
        ];
        expect(consoleLogStub.callCount).toEqual(logs.length);
        for (var i = 0; i < consoleLogStub.callCount; ++i) {
          expect(consoleLogStub.getCall(i).args[0]).toEqual(logs[i]);
        }
      });
    });

    it('should invoke the provided function with data in path', () => {
      aliyunInvoke.options.function = 'getTest';
      aliyunInvoke.options.path = path.join(__dirname, '..', '..',  'test', 'invokeData.json');
      invokeFunctionStub.returns(BbPromise.resolve(response));

      return aliyunInvoke.invokeFunction().then(() => {
        expect(invokeFunctionStub.calledOnce).toEqual(true);
        expect(
          invokeFunctionStub.calledWithExactly(
            'my-service-dev',
            'my-service-dev-getTest',
            { foo: 'bar' })
        ).toEqual(true);
        const logs = [
          'Invoking my-service-dev-getTest of my-service-dev with { foo: \'bar\' }',
          response
        ];
        expect(consoleLogStub.callCount).toEqual(logs.length);
        for (var i = 0; i < consoleLogStub.callCount; ++i) {
          expect(consoleLogStub.getCall(i).args[0]).toEqual(logs[i]);
        }
      });
    });

    it('should log an error if the function could not be found in the service', () => {
      aliyunInvoke.options.function = 'missingFunc';
      return aliyunInvoke.invokeFunction().then(() => {
        expect(consoleLogStub.calledOnce).toEqual(true);
        expect(consoleLogStub.getCall(0).args[0]).toBeInstanceOf(Error);
      });
    });
  });
});
