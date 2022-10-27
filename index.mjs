/**
 * 企业微信API-OA
 */
 import axios from 'axios';
 import { getToken, qyHost, WecomError } from 'wecom-common';
 import Debug from 'debug';
 const warn = Debug('wecom-oa:warn');
 const error = Debug('wecom-oa:error');
 const info = Debug('wecom-oa:info');
 

export class ApprovalDetail {
  constructor (info) {
    Object.assign(this, info);
    this.data = this.getApplyData();
  }
  /**
  * 获取审批单提交的数据
  * @returns 审批单提交数据
  */
  getApplyData() {
    let result = {};
    this.apply_data.contents.forEach(({ control, id, title, value}) => {
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
}
 /**
  * 获取审批单详情
  * @param {String} sp_no 审批单号
  * @param {String} secret 对应应用的SECRET
  * @returns 审批单详情
  */
export const getApprovalDetail = async (sp_no, options = {}) => {
   info(`获取审批详情[${sp_no}]`);
   const token = await getToken(options);
   const res = await axios.post(`${qyHost}/oa/getapprovaldetail?access_token=${token}`, {
    sp_no,
  });
  return new ApprovalDetail(res.data?.info);
}
 
 export class RecordList extends Array {
  constructor (list, next_cursor, endflag) {
    super(...list);
    this.next_cursor = next_cursor;
    this.endflag = endflag;
  }
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
export const getJournalRecordList = async (params = {}, options = {}) => {
   params = Object.assign({
     endtime: Math.round(Date.now()/1000),
     starttime: Math.round(Date.now()/1000) + 1 - 3600 * 24 * 28, // 默认读取最近28天的数据
     cursor: 0,
     limit: 100,
     filters: {},
   }, params);
   const token = await getToken(options);
   const res = await axios.post(`${qyHost}/oa/journal/get_record_list?access_token=${token}`, {
    ...params,
    filters: Object.entries(params.filters).map(([key, value]) => ({ key, value })),
  });
   const result = res.data;
   if (result.errcode) {
     warn(`getJournalRecordList失败: ${result.errmsg}(${result.errcode})`);
     throw new WecomError(result.errcode, result.errmsg);
   }
   const uuid_list = new RecordList(result.journaluuid_list, result.next_cursor, result.endflag);
   return uuid_list;
 };

export class Record {
  constructor(info) {
    Object.assign(this, info);
    this.values = {};
    this?.apply_data?.contents.forEach(content => {
      const { control, value, id } = content;
      let val = null;
      switch (control) {
        case 'Text':
        case 'Textarea':
          val = value.text;
          break;
        case 'Number':
          val = value.new_number;
          break;
        case 'Money':
          val = value.new_money;
          break;
        case 'Selector':
          val = value.selector.options.map(option => option.value[0].text).join(',');
          break;
        default:
          warn(`当前类型(${control})暂未被识别`);
      }
      this.values[id] = val;
    });
  }
  /**
  * 根据控件id返回汇报表单具体的值
  * @param {String} id id
  * @returns 
  */
  getValue (id) {
    const { contents } = this?.apply_data;
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
        throw new WecomError(-1, `当前类型(${control})暂未被识别`);
   }
  }
}
 
export const getJournalRecordDetail = async (journaluuid, options = {}) => {
   const token = await getToken(options);
   const res = await axios.post(`${qyHost}/oa/journal/get_record_detail?access_token=${token}`, {
    journaluuid,
  });
   const result = res.data;
   if (result.errcode) {
     warn(`getJournalRecordDetail失败: ${result.errmsg}(${result.errcode})`);
     throw new WecomError(result.errcode, result.errmsg)
   }
   return new Record(result.info);
};
 
 export default {
   getApprovalDetail,
   getJournalRecordList,
   getJournalRecordDetail,
 };