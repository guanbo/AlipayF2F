"use strict";

const aop  = require("./aop.js");

module.exports = class alipay_f2f {

    constructor(config) {
        this._config = {};
        this._config["appid"] = config["appid"] || "";
        this._config["notifyUrl"] = config["notifyUrl"] || "";
        /* 默认为沙盒 详见 https://openhome.alipay.com/platform/appDaily.htm */
        this._config["gatewayUrl"] = config["gatewayUrl"] || "https://openapi.alipaydev.com/gateway.do";
        this._config["merchantPrivateKey"] = config["merchantPrivateKey"] || "";
        this._config["alipayPublicKey"] = config["alipayPublicKey"] || 
`-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDIgHnOn7LLILlKETd6BFRJ0Gqg
S2Y3mn1wMQmyh9zEyWlz5p1zrahRahbXAfCfSqshSNfqOmAQzSHRVjCqjsAw1jyq
rXaPdKBmr90DIpIxmIyKXv4GGAkPyJ/6FTFY99uhpiq0qadD/uSzQsefWo0aTvP/
65zi3eof7TcZ32oWpwIDAQAB
-----END PUBLIC KEY-----`;
    }

    checkRequired(option, properties) {
      let lastKey;
      let result = properties.some(function (key) {
        lastKey = key;
        return option[key]&&option[key]!="";
      });
      if (!result) {
        return {message: 'required parameter: '+lastKey};
      } else {
        return false;
      }
    }
	/**
     * 校验通知签名
     * @param  {string} postData  支付宝post过的来数据
     * @return {bool}             是否通过校验   
     */
	verifyCallback(postData) {
		return aop.notifyVerify(postData, this._config);
	}

	/**
	 * 检测订单状况
	 * @param  {string} tradeNo 订单号
	 * @return {Promise}
	 */
	checkInvoiceStatus(tradeNo) {
		return new Promise((resolve, reject) => {
			if (tradeNo == "" || tradeNo == null || tradeNo == undefined) {
				return reject({ message: "订单号不能为空.", info : null });
			}
			aop.execute("alipay.trade.query", this._config, {
				out_trade_no: tradeNo
			}).then(resolve).catch(reject);
		});
	}

    /**
     * 创建二维码订单
     * @param {Object} option 支付参数
     *        必填 tradeNo(String)              商户网站订单系统中唯一订单号，64个字符以内，只能包含字母、数字、下划线需保证商户系统端不能重复，建议通过数据库sequence生成.
     *        必填 subject(String)              订单标题，粗略描述用户的支付目的。如“xxx品牌xxx门店当面付扫码消费”
     *        必填 totalAmount(Double)          订单总金额，整形，此处单位为元，精确到小数点后2位，不能超过1亿元
     *        可填 body(String)                 订单描述，可以对交易或商品进行一个详细地描述，比如填写"购买商品2件共15.00元"
     *        可填 timeExpress(Int)             支付超时，线下扫码交易定义为5分钟
     *        选填 app_auth_token(String)          通过该令牌来帮助商户发起请求，完成业务
     * @return {Promise}
     */
    createQRPay(option) {
    	return new Promise((resolve, reject) => {
		    var tradeNo     = option["tradeNo"] || "";
		    var subject     = option["subject"] || "";
		    var body        = option["body"] || "";
		    var totalAmount = option["totalAmount"] || "";
		    var timeExpress = option["timeExpress"] || 5;

		    if (tradeNo == "") {
			    return reject({
			    	message: "tradeNo 参数不能为空.", info : null
			    });
		    }

		    if (subject == "") {
			    return reject({
				    message: "subject 参数不能为空.", info : null
			    });
		    }

		    if (totalAmount == "") {
			    return reject({
				    message: "totalAmount 参数为空.", info : null
			    });
		    }
		    totalAmount = parseFloat(totalAmount);
		    if (isNaN(totalAmount)) {
			    return reject({
				    message: "totalAmount 参数非法.", info : null
			    });
		    }

		    if (timeExpress == "") {
			    return reject({
				    message: "timeExpress 参数为空.", info : null
			    });
		    }
		    timeExpress = parseInt(timeExpress);
		    if (isNaN(timeExpress)) {
			    return reject({
				    message: "timeExpress 参数非法.", info : null
			    });
		    }
		    timeExpress = timeExpress + "m";

		    var alipayArrayData = {};
		    alipayArrayData["subject"] = subject;
		    alipayArrayData["body"] = body;
		    alipayArrayData["out_trade_no"] = tradeNo;
		    alipayArrayData["total_amount"] = totalAmount;
		    alipayArrayData["timeout_express"] = timeExpress;
        if(option["app_auth_token"]) alipayArrayData["app_auth_token"] = option["app_auth_token"];

		    aop.execute("alipay.trade.precreate", this._config, alipayArrayData).then(resolve).catch(reject);
	    });
      
    }
    
    /**
    * 创建退款
    * @param {Object} option 退款参数
    *        必填 tradeNo(String)              商户网站订单系统中唯一订单号，64个字符以内，只能包含字母、数字、下划线需保证商户系统端不能重复，建议通过数据库sequence生成.
    *        必填 refundNo(String)              标识一次退款请求，同一笔交易多次退款需要保证唯一，如需部分退款，则此参数必传。
    *        必填 refundAmount(Price)          需要退款的金额，该金额不能大于订单金额,单位为元，支持两位小数
    *        选填 app_auth_token(String)          通过该令牌来帮助商户发起请求，完成业务
    * @return {Promise}
    */    
    createRefund(option) {
      return new Promise((resolve, reject) => {
		    var tradeNo     = option["tradeNo"] || "";
		    var refundNo    = option["refundNo"] || "";
		    var refundAmount = option["refundAmount"] || "";

		    if (tradeNo == "") {
			    return reject({
			    	message: "tradeNo 参数不能为空.", info : null
			    });
		    }

		    if (refundNo == "") {
			    return reject({
				    message: "refundNo 参数不能为空.", info : null
			    });
		    }

		    if (refundAmount == "") {
			    return reject({
				    message: "refundAmount 参数为空.", info : null
			    });
		    }
		    refundAmount = parseFloat(refundAmount);
		    if (isNaN(refundAmount)) {
			    return reject({
				    message: "refundAmount 参数非法.", info : null
			    });
		    }

		    var alipayArrayData = {};
		    alipayArrayData["out_trade_no"] = tradeNo;
		    alipayArrayData["out_request_no"] = refundNo;
		    alipayArrayData["refund_amount"] = refundAmount;
        if(option["app_auth_token"]) alipayArrayData["app_auth_token"] = option["app_auth_token"];

		    aop.execute("alipay.trade.refund", this._config, alipayArrayData).then(resolve).catch(reject);
      })
    }
    
    
    /**
    * 支付
    * @param {Object} option 支付参数
    *        必填 out_trade_no(String)              商户网站订单系统中唯一订单号，64个字符以内，只能包含字母、数字、下划线需保证商户系统端不能重复，建议通过数据库sequence生成.
    *        必填 auth_code(String)              支付授权码
    *        必填 subject(String)          订单标题
    *        必填 total_amount(Price)          订单总金额，整形，此处单位为元，精确到小数点后2位，不能超过1亿元
    *        选填 app_auth_token(String)          通过该令牌来帮助商户发起请求，完成业务
    * @return {Promise}
    */
    pay(option) {
      const _this = this;
      return new Promise((resolve, reject) => {
        const properties = ['out_trade_no', 'auth_code', 'subject', 'total_amount'];
        const err = _this.checkRequired(option, properties);
        if(err) return reject(err);

        option.scene = option.scene||'bar_code';
        option.timeout_express = option.timeout_express|| 120;
        option.timeout_express += 'm';
        
		    aop.execute("alipay.trade.pay", this._config, option).then(resolve).catch(reject);
      })
    }

   /**
    * 交易预创建
    * @param {Object} option 交易参数
    *        必填 out_trade_no(String)              商户网站订单系统中唯一订单号，64个字符以内，只能包含字母、数字、下划线需保证商户系统端不能重复，建议通过数据库sequence生成.
    *        必填 subject(String)              订单标题，粗略描述用户的支付目的。如“xxx品牌xxx门店当面付扫码消费”
    *        必填 total_amount(Double)          订单总金额，整形，此处单位为元，精确到小数点后2位，不能超过1亿元
    *        可填 body(String)                 订单描述，可以对交易或商品进行一个详细地描述，比如填写"购买商品2件共15.00元"
    *        可填 timeExpress(Int)             支付超时，线下扫码交易定义为5分钟
    *        选填 app_auth_token(String)          通过该令牌来帮助商户发起请求，完成业务
    * @return {Promise}
    */
    precreate(option) {
      const _this = this;
      return new Promise((resolve, reject) => {
        const properties = ['out_trade_no', 'subject', 'total_amount'];
        const err = _this.checkRequired(option, properties);
        if(err) return reject(err);

        option.timeout_express = option.timeout_express|| 120;
        option.timeout_express += 'm';
        
		    aop.execute("alipay.trade.precreate", this._config, option).then(resolve).catch(reject);
      })
    }
    
    /**
    * 支付取消
    * @param {Object} option 支付参数
    *        必填 out_trade_no(String)              商户网站订单系统中唯一订单号，64个字符以内，只能包含字母、数字、下划线需保证商户系统端不能重复，建议通过数据库sequence生成.
    *        选填 app_auth_token(String)          通过该令牌来帮助商户发起请求，完成业务
    * @return {Promise}
    */
    cancel(option) {
      const _this = this;
      return new Promise((resolve, reject)=>{
        const properties = ['out_trade_no'];
        const err = _this.checkRequired(option, properties);
        if(err) return reject(err);
		    aop.execute("alipay.trade.cancel", this._config, option).then(resolve).catch(reject);
      })
    }
    
    /**
    * 查询交易
    * @param {Object} option 查询参数
    *        必填 out_trade_no(String)              商户网站订单系统中唯一订单号，64个字符以内，只能包含字母、数字、下划线需保证商户系统端不能重复，建议通过数据库sequence生成.
    *        选填 app_auth_token(String)          通过该令牌来帮助商户发起请求，完成业务
    * @return {Promise}
    */
    query(option) {
      const _this = this;
      return new Promise((resolve, reject)=>{
        const properties = ['out_trade_no'];
        const err = _this.checkRequired(option, properties);
        if(err) return reject(err);
		    aop.execute("alipay.trade.query", this._config, option).then(resolve).catch(reject);
      })
    }
    
    /**
    * 退款
    * @param {Object} option 退款参数
    *        必填 out_trade_no(String)              商户网站订单系统中唯一订单号，64个字符以内，只能包含字母、数字、下划线需保证商户系统端不能重复，建议通过数据库sequence生成.
    *        必填 out_request_no(String)              标识一次退款请求，同一笔交易多次退款需要保证唯一，如需部分退款，则此参数必传。
    *        必填 refund_amount(Price)          需要退款的金额，该金额不能大于订单金额,单位为元，支持两位小数
    *        选填 app_auth_token(String)          通过该令牌来帮助商户发起请求，完成业务
    * @return {Promise}
    */
    refund(option) {
      const _this = this;
      return new Promise((resolve, reject) => {
        const properties = ['out_trade_no', 'out_request_no', 'refund_amount'];
        const err = _this.checkRequired(option, properties);
        if(err) return reject(err);

		    aop.execute("alipay.trade.refund", this._config, option).then(resolve).catch(reject);
      })
    }

    /**
    * 查询退款
    * @param {Object} option 查询参数
    *        必填 out_trade_no(String)              商户网站订单系统中唯一订单号，64个字符以内，只能包含字母、数字、下划线需保证商户系统端不能重复，建议通过数据库sequence生成.
    *        必填 out_request_no(String)              标识一次退款请求，同一笔交易多次退款需要保证唯一，如需部分退款，则此参数必传。
    *        选填 app_auth_token(String)          通过该令牌来帮助商户发起请求，完成业务
    * @return {Promise}
    */
    refundQuery(option) {
      const _this = this;
      return new Promise((resolve, reject)=>{
        const properties = ['out_trade_no', 'out_request_no'];
        const err = _this.checkRequired(option, properties);
        if(err) return reject(err);
		    aop.execute("alipay.trade.fastpay.refund.query", this._config, option).then(resolve).catch(reject);
      })
    }

    /**
    * 授权
    * @param {Object} option 授权参数
    *        必填 grant_type(String)              如果使用app_auth_code换取token，则为authorization_code，如果使用refresh_token换取新的token，则为refresh_token
    *        必填 code(String)              与refresh_token二选一，用户对应用授权后得到，即第一步中开发者获取到的app_auth_code值。
    *        必填 refresh_token(String)          与code二选一，可为空，刷新令牌时使用
    * @return {Promise}
    */
    openAuthTokenApp(option) {
      return  new Promise((resolve, reject) => {
        option.grant_type = option.grant_type||'authorization_code';
        if((option.grant_type=='authorization_code')) {
          if(!option.code||option.code=='') return reject({message: "bad code"});
        } else if((option.grant_type=='refresh_token')) {
          if(!option.refresh_token||option.refresh_token=='') {
            return reject({message: "bad refresh_token"});
          }
        } else {
          return reject({message: "bad grant_type"});
        }
		    aop.execute("alipay.open.auth.token.app", this._config, option).then(resolve).catch(reject);
      })
    }
    
    /**
    * 单笔转账到支付宝账户
    * @param {Object} option 参数
    *        必填 out_biz_no(String)              商户网站订单系统中唯一订单号，64个字符以内，只能包含字母、数字、下划线需保证商户系统端不能重复，建议通过数据库sequence生成.
    *        必填 payee_type(String)          			收款方账户类型。1、ALIPAY_USERID：支付宝账号对应的支付宝唯一用户号。以2088开头的16位纯数字组成。2、ALIPAY_LOGONID：支付宝登录号，支持邮箱和手机号格式。
    *        必填 payee_account(String)             收款方账户。与payee_type配合使用。付款方和收款方不能是同一个账户。
    *        必填 amount(String)          					转账金额，单位：元。 只支持2位小数，小数点前最大支持13位，金额必须大于等于0.1元。
    *        选填 payer_show_name(String)          	付款方姓名（最长支持100个英文/50个汉字）。显示在收款方的账单详情页。如果该字段不传，则默认显示付款方的支付宝认证姓名或单位名称。
    *        选填 payee_real_name(String)          	收款方真实姓名（最长支持100个英文/50个汉字）。如果本参数不为空，则会校验该账户在支付宝登记的实名是否与收款方真实姓名一致。
    *        选填 remark(String)          					转账备注（支持200个英文/100个汉字）。当付款方为企业账户，且转账金额达到（大于等于）50000元，remark不能为空。收款方可见，会展示在收款用户的收支详情中。
    *        选填 app_auth_token(String)          	通过该令牌来帮助商户发起请求，完成业务
    * @return {Promise}
    */
    transfer(option) {
      const _this = this;
      return new Promise((resolve, reject) => {
        const properties = ['out_biz_no', 'payee_type', 'payee_account', 'amount'];
        const err = _this.checkRequired(option, properties);
        if(err) return reject(err);

		    aop.execute("alipay.fund.trans.toaccount.transfer", this._config, option).then(resolve).catch(reject);
      })
    }

    /**
    * 查询转账订单
    * @param {Object} option 参数
    *        选填 out_biz_no(String)              商户转账唯一订单号：发起转账来源方定义的转账单据ID。和支付宝转账单据号不能同时为空。当和支付宝转账单据号同时提供时，将用支付宝转账单据号进行查询，忽略本参数。
    *        选填 order_id(String)          			支付宝转账单据号：和商户转账唯一订单号不能同时为空。当和商户转账唯一订单号同时提供时，将用本参数进行查询，忽略商户转账唯一订单号。
    *        选填 app_auth_token(String)          通过该令牌来帮助商户发起请求，完成业务
    * @return {Promise}
    */
    transQuery(option) {
      const _this = this;
      return new Promise((resolve, reject) => {
        let result = ['out_biz_no', 'order_id'].some(function (key) {
          return option[key]&&option[key]!="";
        });
        if (!result) {
          return reject({message: 'not found out_biz_no or order_id'});
        }

		    aop.execute("alipay.fund.trans.order.query", this._config, option).then(resolve).catch(reject);
      })
    }

};

