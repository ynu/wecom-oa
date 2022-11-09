import assert from 'assert';
import cache from 'memory-cache';
import {
  getJournalRecordDetail, getJournalRecordList,
  getJournalUuidList, getApprovalDetail,
  getApprovalInfo, getSpNoList,
  separateTimeSpan,
} from '../index.mjs';
const {
  CORP_ID,
  REPORT_SECRET,
  APPROVAL_SECRET,
  TEST_JOURNAL_RECORD_ID,
  TEST_APPROVAL_NO,
  TEST_JOURNAL_TEMPLATE_ID
} = process.env;

describe('wecom-oa 测试', function() {
  after(() => cache.clear());
  this.timeout(100000);
  describe('汇报记录', () => {
    const options = {
      corpId: CORP_ID,
      secret: REPORT_SECRET,
    };
    it('批量获取汇报记录', async () => {
      const res = await getJournalRecordList({}, options);
      assert.ok(res);
    });
    it('批量获取指定模板ID的汇报记录', async () => {
      const res = await getJournalRecordList({
        filters: {
          template_id: TEST_JOURNAL_TEMPLATE_ID,
        },
      }, options);
      assert.ok(res);
    });
    it('获取汇报记录详情', async () => {
      const res = await getJournalRecordDetail(TEST_JOURNAL_RECORD_ID, options);
      assert.equal(res.journal_uuid, TEST_JOURNAL_RECORD_ID);
    });
    it('获取指定条件的所有汇报的uuid列表(31天内)', async () => {
      const res = await getJournalUuidList({}, options);
      assert.equal(1, res.endflag);
      assert.equal(0, res.next_cursor);
    });
    it('获取指定条件的所有汇报的uuid列表(31天外)', async () => {
      const res = await getJournalUuidList({
        starttime: Math.round((new Date('2022-01-01')).getTime()/1000),
        endtime: Math.round((new Date('2022-07-12')).getTime()/1000),
      }, options);
      assert.equal(1, res.endflag);
      assert.equal(0, res.next_cursor);
    });
  });
  describe('审批', () => {
    const options = {
      corpId: CORP_ID,
      secret: APPROVAL_SECRET,
    };
    it('获取审批详情', async () => {
      const res = await getApprovalDetail(TEST_APPROVAL_NO, options);
      assert.equal(res.sp_no, TEST_APPROVAL_NO);
    });
    it ('批量获取审批单', async () => {
      const res = await getApprovalInfo({ size: 1 }, options);
      assert.ok(res);
    })
    it('时间段分割', () => {
      const start = Math.round((new Date('2022-01-01')).getTime()/1000);
      const end = Math.round((new Date('2022-11-12')).getTime()/1000);
      const spans = separateTimeSpan(start, end);
      assert.equal(spans.length, 12);
    });
    it('获取符合条件的所有审批单号(31天内)', async () => {
      const res = await getSpNoList({}, options);
      assert.equal(res.next_cursor, 0);
      assert.ok(res);
    });
    it('获取符合条件的所有审批单号(31天外)', async () => {
      const res = await getSpNoList({
        starttime: Math.round((new Date('2022-01-01')).getTime()/1000),
        endtime: Math.round((new Date('2022-07-12')).getTime()/1000),
      }, options);
      assert.equal(res.next_cursor, 0);
      assert.ok(res);
    });
  });
});
