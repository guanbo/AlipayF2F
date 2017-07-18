"use strict";

const app = require('./fixtures/app');
const http = require('http');
const url = require('url');

const app_auth_token = '201702BB8bc9d194e74248e986444856bae13X20'

const trans = {
  // app_auth_token: app_auth_token,
  out_biz_no: "3142321423432", //Date.now().toString(),
  payee_type: "ALIPAY_LOGONID",
  payee_account: "hyaqtf8277@sandbox.com",
  amount: "12.34",
  payer_show_name: "transfer_test",
  payee_real_name: "沙箱环境",
  remark: "transfer_test"
}

describe.only('Fund', ()=>{
  it('transfer', (done) => {
    app.alipay_f2f.transfer(trans).then(result=>{
      result.should.have.property('code', '10000');
      result.should.have.property('out_biz_no', trans.out_biz_no);
      result.should.have.property('order_id');
      result.should.have.property('pay_date');
      done();
    }, done);
  });

  it('query', (done) => {
    app.alipay_f2f.transQuery({out_biz_no:  trans.out_biz_no}).then(result=>{
      result.should.have.property('code', '10000');
      result.should.have.property('status', 'SUCCESS');
      result.should.have.property('order_id');
      done();
    }, done);
  });
})