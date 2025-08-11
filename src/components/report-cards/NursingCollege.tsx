
"use client";

import React from 'react';

// Updated interfaces to reflect real, calculated data
export interface NursingStudentInfo {
  regNo?: string;
  email?: string;
  schoolName?: string;
  schoolAddress?: string;
  symbolNo?: string;
  studentName?: string;
  course?: string;
  quota?: string;
  address?: string;
  photoUrl?: string;
}

export interface NursingFeeSummary {
  totalAnnualTuition: number;
  totalAnnualBusFee: number;
  totalConcessions: number;
  totalPaid: number;
  amountOfThisPayment: number;
}

interface NursingFeeSlipProps {
  studentInfo: NursingStudentInfo;
  feeSummary: NursingFeeSummary;
}

const NursingCollegeFeeSlip: React.FC<NursingFeeSlipProps> = ({ studentInfo, feeSummary }) => {

  const {
    totalAnnualTuition,
    totalAnnualBusFee,
    totalConcessions,
    totalPaid,
    amountOfThisPayment,
  } = feeSummary;

  const totalApplicableFees = totalAnnualTuition + totalAnnualBusFee;
  const netPayable = totalApplicableFees - totalConcessions;
  const balanceDue = netPayable - totalPaid;

  return (
    <>
      <style jsx global>{`
        .fee-slip-container {
          font-family: Arial, sans-serif;
          width: 21cm;
          min-height: 15cm;
          padding: 1cm;
          margin: 0 auto;
          color: #000;
          background: #fff;
        }
        .fee-slip-header {
          text-align: center;
          margin-bottom: 15px;
        }
        .fee-slip-header h1 {
          font-size: 22px;
          font-weight: bold;
          color: red;
          margin: 0;
        }
        .fee-slip-header p {
          font-size: 14px;
          margin: 2px 0;
        }
        .title-bar {
            background-color: #E0E0E0;
            padding: 5px;
            text-align: center;
            font-weight: bold;
            font-size: 16px;
            font-style: italic;
            margin-bottom: 10px;
        }
        .info-table, .fees-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }
        .info-table td {
          border: 1px solid #000;
          padding: 4px 8px;
        }
        .info-table .label {
          font-weight: bold;
          width: 100px;
        }
        .fees-table th, .fees-table td {
          border: 1px solid #000;
          padding: 6px 8px; /* Increased padding */
          text-align: left;
        }
        .fees-table th {
          background-color: #00BFFF;
          color: red;
          text-align: center;
          font-weight: bold;
        }
        .fees-table .amount {
            text-align: right;
            font-family: monospace;
            font-weight: bold;
        }
        .fees-table .total-row {
            font-weight: bold;
        }
        .summary-table {
            margin-top: 15px;
        }
        .final-summary-row td {
             background-color: #90EE90;
             font-weight: bold;
             font-size: 14px;
        }
        .footer-signatures {
            margin-top: 40px;
            display: flex;
            justify-content: space-between;
            font-size: 12px;
        }
      `}</style>
      <div className="fee-slip-container">
        <div className="fee-slip-header">
          <h1>{studentInfo.schoolName || 'Mirchaiya Health Nursing Campus Pvt.Ltd'}</h1>
          <p>{studentInfo.schoolAddress || 'Mirchaiya-7, Siraha'}</p>
        </div>
        <div className="title-bar">College Fee Slip</div>
        
        <table className="info-table">
            <tbody>
                <tr>
                    <td className="label">Students Name</td>
                    <td>{studentInfo.studentName}</td>
                    <td className="label">Symbol No</td>
                    <td>{studentInfo.symbolNo}</td>
                </tr>
                 <tr>
                    <td className="label">Quota</td>
                    <td>{studentInfo.quota || 'Classified'}</td>
                    <td className="label">Course</td>
                    <td>{studentInfo.course}</td>
                </tr>
                 <tr>
                    <td className="label">Address</td>
                    <td>{studentInfo.address}</td>
                    <td className="label">Photo</td>
                    <td rowSpan={2} style={{verticalAlign: 'top', textAlign:'center'}}>
                        {studentInfo.photoUrl ? <img src={studentInfo.photoUrl} alt="student" width="75" height="90" data-ai-hint="student photo"/> : <div style={{width: '75px', height: '90px', border: '1px solid #ccc', margin: 'auto', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'10px', color:'#999'}}>Photo</div>}
                    </td>
                </tr>
                <tr><td></td><td></td><td></td></tr>
            </tbody>
        </table>

        <table className="fees-table summary-table">
            <thead>
                <tr>
                    <th>Fee Description</th>
                    <th className='amount'>Amount (NPR)</th>
                </tr>
            </thead>
            <tbody>
                <tr><td>Annual Tuition Fee</td><td className="amount">{totalAnnualTuition.toLocaleString()}</td></tr>
                <tr><td>Annual Bus Fee</td><td className="amount">{totalAnnualBusFee.toLocaleString()}</td></tr>
                <tr><td>(-) Concessions</td><td className="amount">{totalConcessions > 0 ? `-${totalConcessions.toLocaleString()}` : '-'}</td></tr>
                <tr className="total-row"><td>Net Payable Amount</td><td className="amount">{netPayable.toLocaleString()}</td></tr>
                <tr><td>Amount Paid (This Transaction)</td><td className="amount">{amountOfThisPayment.toLocaleString()}</td></tr>
                <tr><td>Cumulative Amount Paid</td><td className="amount">{totalPaid.toLocaleString()}</td></tr>
                <tr className="final-summary-row">
                    <td>Total Fee Amount</td>
                    <td className="amount">{totalApplicableFees.toLocaleString()}</td>
                </tr>
                <tr className="final-summary-row">
                    <td>Total Dues Amount</td>
                    <td className="amount">{balanceDue.toLocaleString()}</td>
                </tr>
            </tbody>
        </table>

        <div className="footer-signatures">
            <p>Parents Signature:...........................</p>
            <p>Accountant Signature..........................</p>
        </div>
      </div>
    </>
  );
};

export default NursingCollegeFeeSlip;
