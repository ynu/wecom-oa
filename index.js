/**
 * 企业微信API-OA
 */
 const fetch = require('node-fetch');
 const { getToken, qyHost } = require('wecom-common');
 const warn = require('debug')('wecom-oa:warn');
 const error = require('debug')('wecom-oa:error');
 const info = require('debug')('wecom-oa:info');
 
 /**
  * 获取审批单详情
  * @param {String} sp_no 审批单号
  * @param {String} secret 对应应用的SECRET
  * @returns 审批单详情
  */
 const getApprovalDetail = async (sp_no, options = {}) => {
   info(`获取审批详情[${sp_no}]`);
   if (typeof(options) == 'string') options = {
     secret: options,
   }
   const token = await getToken(options);
   const res = await fetch(`${qyHost}/oa/getapprovaldetail?access_token=${token}`, {
     method: 'POST',
     body: JSON.stringify({
       sp_no,
     }),
   });
 return res.json();
 }
 
 /**
  * 获取审批单提交的数据
  * @param {String} sp 审批单详情数据
  * @returns 审批单提交数据
  */
 const getApplyData = sp => {
   let result = {};
   sp.info.apply_data.contents.forEach(({ control, id, title, value}) => {
     result[id] = {
       id,
       control,
       text: title[0].text,
     };
     switch (control) {
       case 'Selector':
         result[id].value = value.selector.options.map(opt => opt.value[0].text);
         break;
       case 'Text':
       case 'Textarea':
         result[id].value = value.text;
         break;
       case 'Number':
         result[id].value = parseFloat(value.new_number);
         break;
       case 'Money':
         result[id].value = parseFloat(value.new_money);
       case 'Tips':
         result[id].value = '';
         break;
       case 'Date':
         result[id].value = value.date;
         break;
       case 'Contact':
       case 'File':
       case 'Table':
       case 'Attendance':
       case 'Vacation':
       case 'PunchCorrection':
       case 'DateRange':
       default:
         result[id].value = value;
     }
   });
   return result;
 }
 
 /**
  * 批量获取汇报记录单号
  * @param {Number} starttime 开始时间
  * @param {Number} end 结束时间，默认为当前时间
  * @param {Number} cursor 游标，默认为0
  * @param {Number} limit 拉取条数
  * @param {Object} filters 过滤条件
  * @param {Object} options 配置参数
  * @seealso https://developer.work.weixin.qq.com/document/path/93393
  */
 const getJournalRecordList = async (params = {}, options = {}) => {
   params = Object.assign({
     endtime: Math.round(Date.now()/1000),
     starttime: Math.round(Date.now()/1000) + 1 - 3600 * 24 * 28, // 默认读取最近28天的数据
     cursor: 0,
     limit: 100,
     filters: {},
   }, params);
   const token = await getToken(options);
   const res = await fetch(`${qyHost}/oa/journal/get_record_list?access_token=${token}`, {
     method: 'POST',
     body: JSON.stringify({
       ...params,
       filters: Object.entries(params.filters).map(([key, value]) => ({ key, value })),
     }),
   });
   const result = await res.json();
   if (result.errcode) {
     warn(`getJournalRecordList失败: ${result.errmsg}(${result.errcode})`);
     return [];
   }
   return result.journaluuid_list;
 };
 
 const getJournalRecordDetail = async (journaluuid, options = {}) => {
   const token = await getToken(options);
   const res = await fetch(`${qyHost}/oa/journal/get_record_detail?access_token=${token}`, {
     method: 'POST',
     body: JSON.stringify({
       journaluuid,
     }),
   });
   const result = await res.json();
   if (result.errcode) {
     warn(`getJournalRecordDetail失败: ${result.errmsg}(${result.errcode})`);
     return {};
   }
   return result.info;
 };
 
 /**
  * 根据控件id返回汇报表单具体的值
  * @param {Object} contents 控价内容
  * @param {String} id id
  * @returns 
  */
 const getValueFromJournalRecordContents = (contents, id) => {
   const content = contents.find(content => content.id == id);
   const { control, value } = content;
   switch (control) {
     case 'Text':
     case 'Textarea':
       return value.text;
     case 'Number':
       return value.new_number;
     case 'Money':
       return value.new_money;
     case 'Selector':
       return value.selector.options.map(option => option.value[0].text).join(',');
     default:
       warn(`当前类型(${control})暂未被识别`);
       return '';
   }
 }
 
 module.exports = {
   getApprovalDetail,
   getApplyData,
   getJournalRecordList,
   getJournalRecordDetail,
   getValueFromJournalRecordContents,
 };