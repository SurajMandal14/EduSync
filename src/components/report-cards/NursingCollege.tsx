
"use client";

import React from 'react';

export interface NursingStudentInfo {
  regNo?: string;
  email?: string;
  schoolName?: string;
  schoolAddress?: string;
  symbolNo?: string;
  rollNo?: string;
  studentName?: string;
  fatherName?: string;
  program?: string;
  year?: string;
  examTitle?: string;
  session?: string;
}

export interface NursingMarksEntry {
  subject: string;
  totalMarks: number;
  passingMarks: number;
  obtainMarks: number;
}

interface NursingCollegeProps {
  studentInfo: NursingStudentInfo;
  marks: NursingMarksEntry[];
}

const NursingCollege: React.FC<NursingCollegeProps> = ({ studentInfo, marks }) => {
  const totalObtained = marks.reduce((sum, mark) => sum + mark.obtainMarks, 0);
  const totalMarksPossible = marks.reduce((sum, mark) => sum + mark.totalMarks, 0);
  const totalPercentage = totalMarksPossible > 0 ? Math.round((totalObtained / totalMarksPossible) * 100) : 0;
  const overallStatus = marks.every(mark => mark.obtainMarks >= mark.passingMarks) ? "PASS" : "FAIL";

  return (
    <>
      <style jsx global>{`
        .nursing-container {
          font-family: Arial, sans-serif;
          width: 21cm;
          min-height: 29.7cm;
          padding: 1cm;
          margin: 0 auto;
          color: #000;
          background: #fff;
          border: 1px solid #ccc;
        }
        .nursing-header {
          text-align: center;
          margin-bottom: 20px;
        }
        .nursing-header .reg, .nursing-header .email {
          font-size: 10px;
          text-align: right;
        }
        .nursing-header .email {
            text-align: left;
            float: right;
        }
        .nursing-header .school-logo {
            float: left;
            height: 60px;
            width: 60px;
        }
        .nursing-header h1 {
          font-size: 24px;
          font-weight: bold;
          color: #333;
          margin: 0;
        }
        .nursing-header p {
          font-size: 14px;
          margin: 2px 0;
        }
        .exam-title {
          font-size: 18px;
          font-weight: bold;
          border: 2px solid #000;
          padding: 5px;
          display: inline-block;
          margin-top: 10px;
        }
        .student-info-table, .marks-table, .grading-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
          font-size: 12px;
        }
        .student-info-table td {
          border: 1px solid #000;
          padding: 4px;
        }
        .student-info-table .label {
          font-weight: bold;
          width: 120px;
        }
        .marks-table th, .marks-table td {
          border: 1px solid #000;
          padding: 5px;
          text-align: center;
        }
        .marks-table th {
          background-color: #f2f2f2;
          font-weight: bold;
        }
        .marks-table .subject-cell {
            text-align: left;
        }
        .footer-section {
          margin-top: 40px;
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          font-weight: bold;
        }
        .grading-table td{
             border: 1px solid #000;
            padding: 4px;
        }
      `}</style>
      <div className="nursing-container">
        <div className="nursing-header">
            <div style={{overflow: 'hidden'}}>
                <span className="reg">Reg No: {studentInfo.regNo}</span>
                <span className="email">Email: {studentInfo.email}</span>
            </div>
            {/* Logo could be here */}
            {/* <img src="/path/to/logo.png" alt="logo" className="school-logo"/> */}
            <p>Affiliation to Council for Technical Education & Vocational Training</p>
            <h1>{studentInfo.schoolName}</h1>
            <p>{studentInfo.schoolAddress}</p>
            <div className="exam-title">Result of {studentInfo.examTitle || "Examination"} {studentInfo.session ? `- ${studentInfo.session} Session` : ''}</div>
        </div>

        <table className="student-info-table">
            <tbody>
                <tr>
                    <td className="label">Symbol No</td>
                    <td>{studentInfo.symbolNo}</td>
                    <td className="label" style={{width:'80px'}}>Rollno</td>
                    <td>{studentInfo.rollNo}</td>
                </tr>
                <tr>
                    <td className="label">Students Name</td>
                    <td colSpan={3}>{studentInfo.studentName}</td>
                </tr>
                 <tr>
                    <td className="label">Father Name</td>
                    <td colSpan={3}>{studentInfo.fatherName}</td>
                </tr>
                 <tr>
                    <td className="label">Program</td>
                    <td>{studentInfo.program}</td>
                     <td className="label" style={{width:'80px'}}>Year</td>
                    <td>{studentInfo.year}</td>
                </tr>
            </tbody>
        </table>

        <p style={{textAlign: 'center', marginTop: '20px', fontStyle:'italic'}}>According to this result the candidate obtain the following marks.</p>

        <table className="marks-table">
          <thead>
            <tr>
              <th>Subject</th>
              <th>Total Marks</th>
              <th>Passing Marks</th>
              <th>Obtain Marks</th>
              <th>Percentage</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {marks.map((mark, index) => (
              <tr key={index}>
                <td className="subject-cell">{mark.subject}</td>
                <td>{mark.totalMarks}</td>
                <td>{mark.passingMarks}</td>
                <td>{mark.obtainMarks}</td>
                {index === 0 && <td rowSpan={marks.length + 1}>{totalPercentage}%</td>}
                {index === 0 && <td rowSpan={marks.length + 1}>{overallStatus}</td>}
              </tr>
            ))}
            <tr>
                <td className="subject-cell"><strong>Total</strong></td>
                <td><strong>{totalMarksPossible}</strong></td>
                <td></td>
                <td><strong>{totalObtained}</strong></td>
            </tr>
          </tbody>
        </table>
        
        <table style={{width: '60%', float:'left'}}>
            <tbody>
                <tr>
                    <td colSpan={2}>
                        <table className="grading-table" style={{width: '100%', marginTop: '0'}}>
                             <tbody>
                                <tr><td>No Grade</td><td>0%-49%</td></tr>
                                <tr><td>Grade C</td><td>50%-59%</td></tr>
                                <tr><td>Grade B</td><td>60%-69%</td></tr>
                                <tr><td>Grade B+</td><td>70%-79%</td></tr>
                                <tr><td>Grade A</td><td>80%-89%</td></tr>
                                <tr><td>Grade A+</td><td>90%-100%</td></tr>
                            </tbody>
                        </table>
                    </td>
                    <td>
                        <table className="grading-table" style={{width: '100%', height:'100%', marginTop: '0'}}>
                            <tbody>
                                <tr><td>Division</td></tr>
                                <tr><td>Grade</td></tr>
                            </tbody>
                        </table>
                    </td>
                </tr>
            </tbody>
        </table>
        

        <div style={{clear: 'both', paddingTop: '20px'}}>
             <p><strong>Note:-</strong> This Result is according to the {studentInfo.examTitle || "examination"} {studentInfo.session}. This is computer generated result card parents can contact to admin office for enquiry .</p>
        </div>

        <div className="footer-section">
          <div>
            <p>Checked by:..................</p>
            <p>Dated:........................</p>
          </div>
          <div>
            <p>Stamp</p>
          </div>
           <div>
            <p>Campus</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default NursingCollege;
