/**
 * 企业微信API-OA
 */
 import axios from 'axios';
 import dayjs from 'dayjs';
 import { getToken, qyHost, WecomError } from 'wecom-common';
 import Debug from 'debug';
 const warn = Debug('wecom-oa:warn');
 const error = Debug('wecom-oa:error');
 const info = Debug('wecom-oa:info');
 const debug = Debug('wecom-oa:debug');
 

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
    const getValueFromContent = (content) => {
      const { control, id, title, value} = content;
      switch (control) {
        case 'Selector':
          return value.selector.options.map(opt => opt.value[0].text);
        case 'Text':
        case 'Textarea':
          return value.text;
        case 'Number':
          return parseFloat(value.new_number);
        case 'Money':
          return parseFloat(value.new_money);
        case 'Tips':
          return '';
        case 'Date':
          return value.date;
        case 'Table':
          debug(`当前是Table类型控件,递归获取数据`);
          return value.children.map(({ list }) => {
            let result = {};
            list.forEach(content2 => {
              result[content2.id] = {
                id: content2.id,
                control: content2.control,
                text: content2.title[0].text,
                value: getValueFromContent(content2),
              };
            });
            return result;
          });
        case 'Contact':
          return value.members;
        case 'File':
        case 'Attendance':
        case 'Vacation':
        case 'PunchCorrection':
        case 'DateRange':
        default:
          return value;
      }
    }
    let result = {};
    this.apply_data.contents.forEach(content => {
     result[content.id] = {
       id: content.id,
       control: content.control,
       text: content.title[0].text,
       value: getValueFromContent(content),
     };
   });
   return result;
  }
}

export class SpNoList extends Array {
  constructor (list, next_cursor = 0) {
    super(...list);
    this.next_cursor = next_cursor;
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
  if (res.data.errcode) {
    throw new WecomError(res.data.errcode, res.data.errmsg);
  }
  return new ApprovalDetail(res.data?.info);
}
 
 export class RecordList extends Array {
  constructor (list, next_cursor = 0, endflag = 1) {
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

/**
 * 获取指定过滤条件的所有汇报的uuid的列表
 * @param {Object} params 过滤参数
 * @param {Object} options 
 */
export const getJournalUuidList = async (params = {}, options = {}) => {
  let result = new RecordList([], 0, 1);
  let { starttime, endtime } = params;
  const timepoints = separateTimeSpan(starttime, endtime);
  if (timepoints.length > 2) {
    debug(`查询时间区间超过31天,将分步查询`);
    for (let i = 1  ; i < timepoints.length; i++) {
      const res = await getJournalRecordList({
        ...params,
        starttime: timepoints[i - 1],
        endtime: i == timepoints.length - 1 ? timepoints[i] : timepoints[i] - 1, // 最后一组是闭区间[],其余是半开半闭区间[)
      }, options);
      result = new RecordList([
        ...result,
        ...res,
      ]);
    }
  } else {
    debug(`查询时间区间未超过31天,开始查询`);
    do {
      const res = await getJournalRecordList({
        ...params,
        cursor: result.next_cursor,
      }, options);
      result = new RecordList([
        ...result,
        ...res,
      ]);
    } while (!result.endflag);
  }
  return result;
}

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

/**
 * 批量获取审批单号
 * @param {Object} params 查询参数
 *    - starttime 审批单提交的时间范围，开始时间，UNix时间戳, 默认为28天之前
 *    - endtime 审批单提交的时间范围，开始时间，UNix时间戳, 默认为当前时间
 *    - cursor 分页查询游标，默认为0，后续使用返回的next_cursor进行分页拉取
 *    - size 一次请求拉取审批单数量，默认值为100，上限值为100。若accesstoken为自建应用，仅允许获取在应用可见范围内申请人提交的表单，返回的sp_no_list个数可能和size不一致，开发者需用next_cursor判断表单记录是否拉取完
 *    - filters 筛选条件，可对批量拉取的审批申请设置约束条件，支持设置多个条件
 * @param {Object} options 获取token的参数
 * @returns 审批单号列表对象
 * @see https://developer.work.weixin.qq.com/document/path/91816
 */
export const getApprovalInfo = async (params = {}, options = {}) => {
  const now = dayjs();
  params = Object.assign({
    endtime: now.unix(),
    starttime: now.subtract(1, 'month').unix(), // 默认读取最近一个月的数据
    cursor: 0,
    size: 100,
    filters: {},
  }, params);
  const token = await getToken(options);
  const res = await axios.post(`${qyHost}/oa/getapprovalinfo?access_token=${token}`, {
    ...params,
    filters: Object.entries(params.filters).map(([key, value]) => ({ key, value })),
  });
   const result = res.data;
   if (result.errcode) {
     warn(`getApprovalInfo失败: ${result.errmsg}(${result.errcode})`);
     throw new WecomError(result.errcode, result.errmsg);
   }
   const spnos = new SpNoList(result.sp_no_list, result.next_cursor);
   return spnos;
}

/**
 * 获取所有的审批单号
 *  * @param {Object} params 查询参数
 *    - starttime 审批单提交的时间范围，开始时间，UNix时间戳, 默认为28天之前
 *    - endtime 审批单提交的时间范围，开始时间，UNix时间戳, 默认为当前时间
 *    - cursor 分页查询游标，默认为0，后续使用返回的next_cursor进行分页拉取
 *    - size 一次请求拉取审批单数量，默认值为100，上限值为100。若accesstoken为自建应用，仅允许获取在应用可见范围内申请人提交的表单，返回的sp_no_list个数可能和size不一致，开发者需用next_cursor判断表单记录是否拉取完
 *    - filters 筛选条件，可对批量拉取的审批申请设置约束条件，支持设置多个条件
 * @param {Object} options 获取token的参数
 * @returns 符合指定参数的所有审批单号
 * @see https://developer.work.weixin.qq.com/document/path/91816
 */
export const getSpNoList = async (params = {}, options = {}) => {
  let result = new SpNoList([], 0);

  let { starttime, endtime } = params;
  const timepoints = separateTimeSpan(starttime, endtime);
  if (timepoints.length > 2) {
    debug(`查询时间区间超过31天,将分步查询`);
    for (let i = 1  ; i < timepoints.length; i++) {
      const res = await getSpNoList({
        ...params,
        starttime: timepoints[i - 1],
        endtime: i == timepoints.length - 1 ? timepoints[i] : timepoints[i] - 1, // 最后一组是闭区间[],其余是半开半闭区间[)
      }, options);
      result = new SpNoList([
        ...result,
        ...res,
      ]);
    }
  } else {
    debug(`查询时间区间未超过31天,开始查询`);
    do {
      const res = await getApprovalInfo({
        ...params,
        cursor: result.next_cursor,
      }, options);
      result = new SpNoList([
        ...result,
        ...res,
      ], res.next_cursor);
    } while (result.next_cursor);
  }
  return result;
}

/**
 * 将starttime和endtime (Unix 秒)分成不超过span时长(秒)的时间段
 * @returns 
 */
export const separateTimeSpan = (starttime, endtime, span = 31 * 24 * 3600) => {
  const timepoints = [];
  do {
    timepoints.push(starttime);
    starttime += span;
  } while (starttime < endtime);
  timepoints.push(endtime);
  return timepoints;
}


/**
 * 获取审批模板详情
 * @param {String} template_id 模板的唯一标识id
 * @param {Object} options options 获取token的参数
 * @returns 
 */
export const gettemplatedetail = async (template_id, options = {}) => {
  info(`获取审批模板详情[${template_id}]`);
   const token = await getToken(options);
   const res = await axios.post(`${qyHost}/oa/gettemplatedetail?access_token=${token}`, {
    template_id,
  });
  if (res.data.errcode) {
    throw new WecomError(res.data.errcode, res.data.errmsg);
  }
  return res.data;
}
 
 export default {
   getApprovalDetail,
   getApprovalInfo,
   getSpNoList,
   getJournalRecordList,
   getJournalRecordDetail,
   separateTimeSpan,
 };