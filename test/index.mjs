import assert from 'assert';
import { getJournalRecordDetail, getJournalRecordList, getApprovalDetail } from '../index.mjs';
const {
  CORP_ID,
  REPORT_SECRET,
  APPROVAL_SECRET,
  TEST_JOURNAL_RECORD_ID,
  TEST_APPROVAL_NO,
} = process.env;

describe('wecom-oa 测试', function() {
  this.timeout(10000);
  describe('汇报记录', () => {
    it('批量获取汇报记录', async () => {
      const res = await getJournalRecordList({}, {
        corpId: CORP_ID,
        secret: REPORT_SECRET,
      });
      assert.ok(res);
    });
    it('获取汇报记录详情', async () => {
      const res = await getJournalRecordDetail(TEST_JOURNAL_RECORD_ID, {
        corpId: CORP_ID,
        secret: REPORT_SECRET,
      });
      assert.equal(res.journal_uuid, TEST_JOURNAL_RECORD_ID);
    });
  });
  describe('审批', () => {
    it('获取审批详情', async () => {
      const res = await getApprovalDetail(TEST_APPROVAL_NO, {
        corpId: CORP_ID,
        secret: APPROVAL_SECRET,
      });
      assert.equal(res.sp_no, TEST_APPROVAL_NO);
    });
  });
});