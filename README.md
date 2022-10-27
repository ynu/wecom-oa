# wecom-oa
企业微信API - OA  SDK

## 类
### ApprovalDetail

### RecordList

### Record

## 方法
### getJournalRecordDetail

### getJournalRecordList

### getApprovalDetail

## 测试
### 准备测试数据
`wecom-oa`采用`mocha`单元测试，测试过程需要通过环境变量配置一些实际业务数据，包括：
- `CORP_ID` 企业微信ID
- `REPORT_SECRET` 企业微信`汇报`应用的Secret
- `APPROVAL_SECRET` 企业微信`审批`应用的Secret
- `TEST_JOURNAL_RECORD_ID` 一个汇报结果的ID
- `TEST_APPROVAL_NO` 一个审批单的编号

### 测试脚本
可以在根目录下创建一个测试脚本`test.sh`，脚本内容：
```
clear && \
export CORP_ID=... && \
export REPORT_SECRET=... && \
export APPROVAL_SECRET=... && \
export TEST_JOURNAL_RECORD_ID=... && \
export TEST_APPROVAL_NO=... && \
mocha
```
运行脚本就可以完成测试：
```
./test.sh
```