
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

  const getGrade = (percentage: number): string => {
    if (percentage >= 90) return "A+";
    if (percentage >= 80) return "A";
    if (percentage >= 70) return "B+";
    if (percentage >= 60) return "B";
    if (percentage >= 50) return "C";
    if (percentage < 40) return "No Grade";
    return "No Grade";
  };
  
  const getDivision = (percentage: number): string => {
    if (overallStatus === "FAIL") return "FAIL";
    if (percentage >= 80) return "Distinction";
    if (percentage >= 60) return "First Division";
    if (percentage >= 50) return "Second Division";
    if (percentage >= 40) return "Third Division";
    return "FAIL";
  };

  const finalGrade = getGrade(totalPercentage);
  const finalDivision = getDivision(totalPercentage);


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
        .exam-title-wrapper {
            display: flex;
            align-items: center;
            justify-content: center;
            margin-top: 10px;
            gap: 10px;
        }
        .exam-title {
          font-size: 18px;
          font-weight: bold;
          border-bottom: 2px solid #000;
          padding: 2px 5px;
          display: inline-block;
        }
        .arrow {
            font-size: 24px;
            font-weight: bold;
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
          background-color: #FFF9C4; /* Light yellow background */
          font-weight: bold;
        }
        .marks-table tfoot td {
             background-color: #FFF9C4; /* Light yellow background */
        }
        .marks-table .subject-cell {
            text-align: left;
            font-weight: bold;
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
            text-align: center;
        }
        .grading-table .label {
            text-align: left;
            padding-left: 8px;
        }
      `}</style>
      <div className="nursing-container">
        <div className="nursing-header">
            <div className="flex justify-between">
                <span className="reg">Reg No: {studentInfo.regNo}</span>
                <span className="email">Email: {studentInfo.email}</span>
            </div>
            {/* Logo could be here */}
            {/* <img src="/path/to/logo.png" alt="logo" className="school-logo"/> */}
            <p className='mt-2'>Affiliation to Council for Technical Education & Vocational Training</p>
            <h1 className="font-serif">{studentInfo.schoolName}</h1>
            <p>{studentInfo.schoolAddress}</p>
            <div className="exam-title-wrapper">
                <div className="arrow">&lt;--</div>
                <div className="exam-title">Result of {studentInfo.examTitle || "Examination"} {studentInfo.session ? `- ${studentInfo.session} Session` : ''}</div>
                <div className="arrow">--&gt;</div>
            </div>
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
                    <td colSpan={3} className="font-bold">{studentInfo.studentName}</td>
                </tr>
                 <tr>
                    <td className="label">Father Name</td>
                    <td colSpan={3} className="font-bold">{studentInfo.fatherName}</td>
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
                {index === 0 && <td rowSpan={marks.length + 1} className="font-bold">{overallStatus}</td>}
              </tr>
            ))}
          </tbody>
          <tfoot>
             <tr>
                <td className="subject-cell"><strong>Total</strong></td>
                <td><strong>{totalMarksPossible}</strong></td>
                <td></td>
                <td><strong>{totalObtained}</strong></td>
            </tr>
          </tfoot>
        </table>
        
        <div className="flex mt-4">
            <div className="w-2/3 pr-4">
                 <table className="grading-table">
                     <tbody>
                        <tr><td className="label">No Grade</td><td>0%-49%</td></tr>
                        <tr><td className="label">Grade C</td><td>50%-59%</td></tr>
                        <tr><td className="label">Grade B</td><td>60%-69%</td></tr>
                        <tr><td className="label">Grade B+</td><td>70%-79%</td></tr>
                        <tr><td className="label">Grade A</td><td>80%-89%</td></tr>
                        <tr><td className="label">Grade A+</td><td>90%-100%</td></tr>
                    </tbody>
                </table>
            </div>
            <div className="w-1/3 pl-4">
                 <table className="grading-table h-full">
                    <tbody>
                        <tr><td><strong>Division</strong></td><td>{finalDivision}</td></tr>
                        <tr><td><strong>Grade</strong></td><td>{finalGrade}</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
        

        <div className="pt-5">
             <p><strong>Note:-</strong> This Result is according to the {studentInfo.examTitle || "examination"} {studentInfo.session}. This is computer generated result card parents can contact to admin office for enquiry .</p>
        </div>

        <div className="footer-section">
          <div>
            <p>Checked by:..................</p>
          </div>
           <div>
            <p>Dated:........................</p>
          </div>
           <div>
            <p>Campus Stamp</p>
          </div>
        </div>
        <div className="text-center mt-4">
            <p>.......................................</p>
        </div>
      </div>
    </>
  );
};

export default NursingCollege;
