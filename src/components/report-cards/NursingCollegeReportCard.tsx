
"use client";

import React from 'react';

export interface NursingStudentInfo {
  regdNo?: string;
  email?: string;
  schoolName?: string;
  address_school?: string;
  examTitle?: string;
  session?: string;
  symbolNo?: string;
  studentName?: string;
  fatherName?: string;
  program?: string;
  year?: string;
}

export interface NursingMarksInfo {
  sn: number;
  subject: string;
  fullMarks: number;
  passMarks: number;
  theoryMarks: number;
  practicalMarks: number;
  totalMarks: number;
  remarks: string;
}

interface NursingReportCardProps {
  studentInfo: NursingStudentInfo;
  marks: NursingMarksInfo[];
}

const NursingCollegeReportCard: React.FC<NursingReportCardProps> = ({ studentInfo, marks }) => {
  const totalMarksObtained = marks.reduce((acc, mark) => acc + mark.totalMarks, 0);
  const totalFullMarks = marks.reduce((acc, mark) => acc + mark.fullMarks, 0);
  const percentage = totalFullMarks > 0 ? ((totalMarksObtained / totalFullMarks) * 100).toFixed(2) : "0.00";

  return (
    <>
      <style jsx global>{`
        .report-card-nursing-container {
          font-family: 'Times New Roman', Times, serif;
          width: 21cm;
          min-height: 29.7cm;
          padding: 1cm;
          margin: auto;
          border: 2px solid #000;
          color: #000;
          background: #fff;
        }
        .report-card-nursing-header {
          text-align: center;
          line-height: 1.2;
        }
        .report-card-nursing-header h1 {
          font-size: 24px;
          font-weight: bold;
          color: #FF0000;
          margin: 0;
        }
        .report-card-nursing-header p {
          font-size: 14px;
          margin: 0;
        }
        .report-card-nursing-title {
          background-color: #C0C0C0;
          padding: 4px;
          text-align: center;
          font-weight: bold;
          font-size: 16px;
          margin: 10px 0;
          border: 1px solid #000;
        }
        .student-info-table {
          width: 100%;
          font-size: 14px;
          margin-bottom: 10px;
        }
        .student-info-table td {
          padding: 2px 5px;
        }
        .marks-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }
        .marks-table th, .marks-table td {
          border: 1px solid #000;
          padding: 4px;
          text-align: center;
        }
        .marks-table th {
          background-color: #E0E0E0;
          font-weight: bold;
        }
        .marks-table .subject-cell {
            text-align: left;
        }
        .footer-summary-table {
            width: 100%;
            margin-top: 10px;
            font-size: 14px;
        }
        .footer-summary-table td {
            padding: 2px 5px;
        }
        .footer-signatures {
            margin-top: 50px;
            display: flex;
            justify-content: space-between;
            font-size: 14px;
        }
      `}</style>
      <div className="report-card-nursing-container">
        <div className="report-card-nursing-header">
          <h1>{studentInfo.schoolName || "Mirchaiya Health Nursing Campus Pvt.Ltd"}</h1>
          <p>Regd. No: {studentInfo.regdNo || "70044/066/067"}</p>
          <p>{studentInfo.address_school || "Mirchaiya-07, Siraha"}</p>
          <p>Email: {studentInfo.email || "mirchaiyanursingcampussiraha@gmail.com"}</p>
        </div>

        <div className="report-card-nursing-title">
          {studentInfo.examTitle || "Terminal Examination"} - {studentInfo.session || "2080"}
        </div>
        
        <table className="student-info-table">
            <tbody>
                <tr>
                    <td>Symbol No: <strong>{studentInfo.symbolNo}</strong></td>
                    <td>Student's Name: <strong>{studentInfo.studentName}</strong></td>
                </tr>
                <tr>
                    <td>Father's Name: <strong>{studentInfo.fatherName}</strong></td>
                    <td>Program: <strong>{studentInfo.program}</strong></td>
                    <td>Year: <strong>{studentInfo.year}</strong></td>
                </tr>
            </tbody>
        </table>

        <table className="marks-table">
          <thead>
            <tr>
              <th rowSpan={2}>S.N</th>
              <th rowSpan={2}>Subject</th>
              <th rowSpan={2}>Full Marks</th>
              <th rowSpan={2}>Pass Marks</th>
              <th colSpan={3}>Marks Obtained</th>
              <th rowSpan={2}>Remarks</th>
            </tr>
            <tr>
              <th>Theory</th>
              <th>Practical</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {marks.map((mark, index) => (
              <tr key={index}>
                <td>{mark.sn}</td>
                <td className="subject-cell">{mark.subject}</td>
                <td>{mark.fullMarks}</td>
                <td>{mark.passMarks}</td>
                <td>{mark.theoryMarks}</td>
                <td>{mark.practicalMarks}</td>
                <td>{mark.totalMarks}</td>
                <td>{mark.remarks}</td>
              </tr>
            ))}
            <tr style={{fontWeight: "bold"}}>
                <td colSpan={2}>Total</td>
                <td>{totalFullMarks}</td>
                <td></td>
                <td colSpan={2}></td>
                <td>{totalMarksObtained}</td>
                <td></td>
            </tr>
          </tbody>
        </table>

        <table className="footer-summary-table">
            <tbody>
                <tr>
                    <td>Total Marks Obtained: <strong>{totalMarksObtained}</strong></td>
                    <td>Percentage: <strong>{percentage}%</strong></td>
                    <td>Result: <strong>{parseFloat(percentage) >= 40 ? "Pass" : "Fail"}</strong></td>
                </tr>
            </tbody>
        </table>
        
        <div className="footer-signatures">
            <div>
                <p>.............................</p>
                <p>Date</p>
            </div>
            <div>
                <p>.............................</p>
                <p>Co-ordinator</p>
            </div>
            <div>
                <p>.............................</p>
                <p>Campus Chief</p>
            </div>
        </div>

      </div>
    </>
  );
};

export default NursingCollegeReportCard;
