
"use client";

import React from 'react';

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

export interface NursingMarksEntry {
  subject: string;
  totalMarks: number; // Represents the amount for this line item
  passingMarks: number; // Not used in fee slip, can be 0
  obtainMarks: number; // Not used in fee slip, can be 0
}

interface NursingFeeSlipProps {
  studentInfo: NursingStudentInfo;
  marks: NursingMarksEntry[]; // Re-using marks structure for line items
}

const NursingCollegeFeeSlip: React.FC<NursingFeeSlipProps> = ({ studentInfo, marks }) => {
  const collageFees = marks.filter(m => ['Admission Fee', 'Refundable Fee', 'Registration Fee'].includes(m.subject));
  const extraFees = marks.filter(m => ['Transpotation Fee', 'Dress Fee', 'Book Fee', 'Hostel Fee'].includes(m.subject));

  const getTotal = (items: NursingMarksEntry[]) => items.reduce((sum, item) => sum + item.totalMarks, 0);

  const totalCollageFee = getTotal(collageFees);
  const totalExtraFee = getTotal(extraFees);
  const totalPayAmount = marks.find(m => m.subject === 'Refundable Fee')?.totalMarks || 0; // As per image
  const totalFeeAmount = totalCollageFee + totalExtraFee;

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
        .fees-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-top: 15px;
        }
        .fees-table th, .fees-table td {
          border: 1px solid #000;
          padding: 5px;
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
        }
        .fees-table .total-row {
            font-weight: bold;
        }
        .summary-table {
            margin-top: -1px;
            border-top: none !important;
        }
        .summary-table td {
             background-color: #90EE90;
             font-weight: bold;
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
        <div className="title-bar">Collage Fee Slip</div>
        
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
                    <td>{studentInfo.course || 'PCL (NURSING)'}</td>
                </tr>
                 <tr>
                    <td className="label">Adree</td>
                    <td>{studentInfo.address || 'Besishahar-1, Lamjung'}</td>
                    <td className="label">Photo</td>
                    <td rowSpan={2} style={{verticalAlign: 'top', textAlign:'center'}}>
                        {studentInfo.photoUrl ? <img src={studentInfo.photoUrl} alt="student" width="75" height="90" data-ai-hint="student photo"/> : <div style={{width: '75px', height: '90px', border: '1px solid #ccc', margin: 'auto', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'10px', color:'#999'}}>Photo</div>}
                    </td>
                </tr>
                <tr><td></td><td></td><td></td></tr>
            </tbody>
        </table>

        <div className="fees-grid">
            <div>
                <table className="fees-table">
                    <thead><tr><th colSpan={2}>Collage Fee</th></tr></thead>
                    <tbody>
                        {collageFees.map(item => (
                            <tr key={item.subject}>
                                <td>{item.subject}</td>
                                <td className="amount">{item.totalMarks > 0 ? item.totalMarks.toLocaleString() : '-'}</td>
                            </tr>
                        ))}
                        <tr className="total-row"><td>Total Pay Amount</td><td className="amount">{totalPayAmount > 0 ? totalPayAmount.toLocaleString() : '-'}</td></tr>
                        <tr className="total-row"><td>Total Collage Fee</td><td className="amount">{totalCollageFee.toLocaleString()}</td></tr>
                        <tr className="total-row"><td>Dues Amount</td><td className="amount">-</td></tr>
                    </tbody>
                </table>
            </div>
            <div>
                 <table className="fees-table">
                    <thead><tr><th colSpan={2}>Extra Fee</th></tr></thead>
                    <tbody>
                        {extraFees.map(item => (
                            <tr key={item.subject}>
                                <td>{item.subject}</td>
                                <td className="amount">{item.totalMarks > 0 ? item.totalMarks.toLocaleString() : '-'}</td>
                            </tr>
                        ))}
                         <tr className="total-row"><td>Total Extra Fee</td><td className="amount">{totalExtraFee.toLocaleString()}</td></tr>
                         <tr className="total-row"><td>Dues Amount</td><td className="amount">-</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
        <table className="fees-table summary-table">
            <tbody>
                <tr>
                    <td className="total-row">Total Fee Amount</td>
                    <td className="amount total-row">{totalFeeAmount.toLocaleString()}</td>
                </tr>
                <tr>
                    <td className="total-row">Total Dues Amount</td>
                    <td className="amount total-row">-</td>
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

    