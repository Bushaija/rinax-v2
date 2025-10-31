# DG Approval Queue - Quick Start Guide

## Overview
The DG (Directeur Général) Approval Queue is the final approval stage in the financial report workflow. DG users review reports that have been approved by DAF users and provide final approval or rejection.

## Accessing the Queue
1. Login as a user with the **DG** role
2. Navigate to **Approvals → DG Queue** in the sidebar
3. Or use keyboard shortcut: **D + G**

## Understanding the Interface

### Hierarchy Context Card
At the top of the page, you'll see your facility information:
- **Your Facility**: Name and type (Hospital/Health Center)
- **District**: Your district name
- **Accessible Facilities**: Number of facilities you can approve for

### Reports List (Left Column)
Shows all reports pending your final approval:
- **Report Code**: Unique identifier
- **Title**: Report description
- **Facility**: Where the report originated
- **DAF Approval**: Green badge showing DAF approver and date
- **Status Badge**: Current approval status

### Report Details (Right Column)
When you select a report, you'll see:
1. **Facility Hierarchy Context**
   - Facility name, type, and district
   - Submitter information

2. **DAF Approval Details** (Green Card)
   - DAF approver name
   - Approval timestamp
   - DAF comment (if provided)

3. **Report Metadata**
   - Fiscal year
   - Submission date
   - Project name
   - Link to view full report

4. **Final Approval Actions**
   - Final Approve button
   - Reject button

5. **Workflow Timeline**
   - Complete history of all actions
   - Shows submission, DAF approval, and any previous actions

## Approving a Report

### Steps to Approve
1. Select a report from the list
2. Review the report details and DAF approval information
3. Click "View Full Report" to see complete details (opens in new tab)
4. Click **"Final Approve"** button
5. Optionally add a comment in the dialog
6. Click **"Confirm"**

### What Happens on Approval
- Report status changes to **fully_approved**
- PDF is generated and saved
- Report is permanently locked
- Accountant receives notification
- Report removed from your queue

## Rejecting a Report

### Steps to Reject
1. Select a report from the list
2. Review the report details
3. Click **"Reject"** button
4. **Enter a comment** explaining the rejection (required)
5. Click **"Confirm"**

### What Happens on Rejection
- Report status changes to **rejected_by_dg**
- Report is unlocked for editing
- Accountant receives notification with your comment
- Report removed from your queue
- Accountant can make corrections and resubmit

## Hierarchy Rules

### Who Can You Approve For?
- **Hospital DG**: Your hospital + all health centers in your district
- **Health Center DG**: Only your health center (rare case)

### Cross-District Protection
- You cannot approve reports from facilities in other districts
- System will show error if you try to approve outside your hierarchy

## Workflow Stages

### Before Your Approval
1. **Accountant** creates and submits report
2. **DAF** reviews and approves report
3. Report appears in **your DG queue**

### After Your Approval
- Report is **fully approved**
- PDF is generated
- Report is permanently locked
- Workflow is complete

### After Your Rejection
- Report returns to **accountant**
- Accountant makes corrections
- Accountant resubmits
- Goes back to **DAF** for approval
- Returns to **your queue** after DAF approval

## Tips for Efficient Review

### Use the Workflow Timeline
- See complete approval chain
- Review all previous comments
- Understand report history

### Check DAF Comments
- DAF may have left important notes
- Review their approval reasoning
- Consider their feedback

### Review Full Report
- Always click "View Full Report" for detailed review
- Check all financial data
- Verify calculations and totals

### Provide Clear Comments
- When rejecting, be specific about issues
- Help accountant understand what needs fixing
- Reference specific sections if possible

## Common Scenarios

### Scenario 1: Health Center Report
- Health center accountant submits report
- Hospital DAF approves (your hospital)
- You (Hospital DG) provide final approval
- Report is complete

### Scenario 2: Hospital Report
- Hospital accountant submits report
- Hospital DAF approves (same hospital)
- You (Hospital DG) provide final approval
- Report is complete

### Scenario 3: Rejection
- You find an error in the report
- Click Reject and explain the issue
- Accountant receives notification
- Accountant fixes and resubmits
- DAF approves again
- Report returns to your queue

## Keyboard Shortcuts
- **D + G**: Navigate to DG Queue
- **Tab**: Navigate between elements
- **Enter**: Confirm dialogs
- **Esc**: Close dialogs

## Troubleshooting

### No Reports in Queue
- No reports have been approved by DAF yet
- All reports have been processed
- Check with DAF users about pending approvals

### Cannot Approve Report
- Report may be from outside your district
- You may not have DG role
- Report may have been processed by another DG user

### Error Messages
- **"Access denied: Facility is outside your hierarchy"**: Report is from different district
- **"Comment is required for rejection"**: Must provide comment when rejecting
- **"Failed to approve report"**: Contact system administrator

## Best Practices

1. **Review Thoroughly**: This is the final approval stage
2. **Check DAF Comments**: Understand previous reviewer's perspective
3. **Be Timely**: Don't let reports sit in queue too long
4. **Provide Feedback**: Clear comments help improve future reports
5. **Verify Data**: Check calculations and totals before approving
6. **Use Full Report View**: Don't rely only on summary information

## Support
For technical issues or questions:
- Contact your system administrator
- Refer to the main documentation
- Check the workflow timeline for report history

---

**Remember**: As DG, you provide the final approval. Your decision completes the workflow and locks the report permanently. Review carefully before approving!
