import assert from 'assert';
import cache from 'memory-cache';
import { getJournalRecordDetail, getJournalRecordList, getJournalUuidList, getApprovalDetail, getApprovalInfo, getSpNoList } from '../index.mjs';
const {
  CORP_ID,
  REPORT_SECRET,
  APPROVAL_SECRET,
  TEST_JOURNAL_RECORD_ID,
  TEST_APPROVAL_NO,
} = process.env;

describe('wecom-oa 测试', function() {
  after(() => cache.clear());
  this.timeout(10000);
  describe('汇报记录', () => {
    const options = {
      corpId: CORP_ID,
      secret: REPORT_SECRET,
    };
    it('批量获取汇报记录', async () => {
      const res = await getJournalRecordList({}, options);
      assert.ok(res);
    });
    it('获取汇报记录详情', async () => {
      const res = await getJournalRecordDetail(TEST_JOURNAL_RECORD_ID, options);
      assert.equal(res.journal_uuid, TEST_JOURNAL_RECORD_ID);
    });
    it('获取指定条件的所有汇报的uuid列表', async () => {
      const res = await getJournalUuidList({}, options);
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
    it('获取符合条件的所有审批单号', async () => {
      const res = await getSpNoList({}, options);
      assert.equal(res.next_cursor, undefined);
      assert.ok(res);
    });
  });
});