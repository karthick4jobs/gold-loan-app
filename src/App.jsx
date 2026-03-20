import React, { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { Trash2, Download } from "lucide-react";
import * as XLSX from "xlsx";

export default function GoldLoanCalculator() {
  const dateInputRef = useRef(null);
  const [principal, setPrincipal] = useState("");
  const [pledgeDate, setPledgeDate] = useState("");
  const [interestRateFirst12] = useState(1.25); // First 12 months
  const [interestRateAfter12] = useState(2); // After 12 months
  const [months, setMonths] = useState(0);
  const [interest, setInterest] = useState(null);
  const [total, setTotal] = useState(null);
  const [history, setHistory] = useState([]);

  // Accurate month calculation
  const calculateMonths = (start, end) => {
    let years = end.getFullYear() - start.getFullYear();
    let months = end.getMonth() - start.getMonth();
    let totalMonths = years * 12 + months;
    let daysDiff = end.getDate() - start.getDate();

    if (daysDiff < 0) {
      totalMonths -= 1;
      const prevMonth = new Date(end.getFullYear(), end.getMonth(), 0);
      daysDiff += prevMonth.getDate();
    }

    let fractional = 0;
    if (daysDiff >= 0 && daysDiff <= 7) fractional = 0.25;
    else if (daysDiff >= 8 && daysDiff <= 14) fractional = 0.5;
    else if (daysDiff >= 15 && daysDiff <= 21) fractional = 0.75;
    else if (daysDiff > 21) fractional = 1;

    let total = totalMonths + fractional;
    return total < 0 ? 0 : total;
  };

  const calculateLoan = () => {
    const p = parseFloat(principal);
    if (!p || !pledgeDate) return;
    const startDate = new Date(pledgeDate);
    const today = new Date();

    const totalMonths = calculateMonths(startDate, today);
    setMonths(totalMonths);

    let interestAmount = 0;
    if (totalMonths <= 12) {
      interestAmount = (p * interestRateFirst12 * totalMonths) / 100;
    } else {
      const first12 = (p * interestRateFirst12 * 12) / 100;
      const remaining = totalMonths - 12;
      const after12 = (p * interestRateAfter12 * remaining) / 100;
      interestAmount = first12 + after12;
    }

    interestAmount = Math.round(interestAmount / 5) * 5;

    setInterest(interestAmount.toFixed(2));
    setTotal((p + interestAmount).toFixed(2));

    const formattedDate = `${String(startDate.getDate()).padStart(2, "0")}-${String(startDate.getMonth() + 1).padStart(2, "0")}-${String(startDate.getFullYear()).slice(-2)}`;

    setHistory(prev => [{
      id: Date.now(),
      principal: p,
      pledgeDate: formattedDate,
      months: totalMonths,
      interest: interestAmount.toFixed(2),
      total: (p + interestAmount).toFixed(2)
    }, ...prev]);

    setPrincipal("");
    setPledgeDate("");
    setInterest(null);
    setTimeout(() => dateInputRef.current?.focus(), 0);
  };

  const deleteRecord = (id) => {
    setHistory(prev => prev.filter(record => record.id !== id));
  };

  const updateInterest = (id, newInterest) => {
    setHistory(prev => prev.map(record => {
      if (record.id === id) {
        const val = parseFloat(newInterest);
        const floatInterest = isNaN(val) ? 0 : val;
        return {
          ...record,
          interest: newInterest,
          total: (parseFloat(record.principal) + floatInterest).toFixed(2)
        };
      }
      return record;
    }));
  };

  const exportToExcel = () => {
    const today = new Date();
    const formattedTitleDate = `${String(today.getDate()).padStart(2, "0")}-${String(today.getMonth() + 1).padStart(2, "0")}-${today.getFullYear()}`;
    const fileName = `Gold_Loan_History_${formattedTitleDate}.xlsx`;

    const worksheetData = history.map((record, index) => ({
      "S.No.": history.length - index,
      "Date Pledged": record.pledgeDate,
      "Principal (₹)": parseFloat(record.principal),
      "Months": record.months,
      "Interest (₹)": parseFloat(record.interest),
      "Total Payable (₹)": parseFloat(record.total)
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "History");
    
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start bg-gray-50 p-6 pt-10 gap-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <Card className="rounded-2xl shadow-lg p-4 bg-white">
          <CardContent>
            <h1 className="text-2xl font-bold mb-4 text-center">Gold Loan Calculator</h1>
            <label className="block mb-1 text-sm font-medium">Date of Pledge</label>
            <Input
              type="date"
              value={pledgeDate}
              onChange={(e) => setPledgeDate(e.target.value)}
              className="p-2 mb-4 w-full"
              ref={dateInputRef}
            />

            <label className="block mb-1 text-sm font-medium">Principal Amount</label>
            <Input
              type="number"
              placeholder="Enter principal amount"
              value={principal}
              onChange={(e) => setPrincipal(e.target.value)}
              className="p-2 mb-4 w-full"
            />

            <Button onClick={calculateLoan} className="w-full p-2 rounded-xl text-white bg-blue-600 hover:bg-blue-700">
              Calculate
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {history.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-4xl">
          <Card className="rounded-2xl shadow-lg p-4 bg-white overflow-x-auto">
            <CardContent>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Calculation History</h2>
                <Button onClick={exportToExcel} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white rounded-lg px-4 py-2">
                  <Download size={16} /> Export to Excel
                </Button>
              </div>
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="border-b text-sm text-gray-600">
                    <th className="p-2 font-medium text-center w-12">S.No.</th>
                    <th className="p-2 font-medium">Date Pledged</th>
                    <th className="p-2 font-medium">Principal (₹)</th>
                    <th className="p-2 font-medium">Months</th>
                    <th className="p-2 font-medium">Interest (₹)</th>
                    <th className="p-2 font-medium">Total Payable (₹)</th>
                    <th className="p-2 font-medium text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((record, index) => (
                    <tr key={record.id} className="border-b hover:bg-gray-50 transition-colors">
                      <td className="p-2 text-center text-gray-500">{history.length - index}</td>
                      <td className="p-2">{record.pledgeDate}</td>
                      <td className="p-2">{record.principal}</td>
                      <td className="p-2">{record.months}</td>
                      <td className="p-2">
                        <Input 
                          type="number"
                          value={record.interest}
                          onChange={(e) => updateInterest(record.id, e.target.value)}
                          className="w-24 h-8 px-2 py-1 text-sm bg-white"
                        />
                      </td>
                      <td className="p-2 font-bold">{record.total}</td>
                      <td className="p-2 text-center flex justify-center items-center">
                        <Button 
                          onClick={() => deleteRecord(record.id)} 
                          className="h-8 w-8 p-0 bg-transparent text-red-500 hover:text-red-700 hover:bg-red-50 focus-visible:ring-red-500 shadow-none"
                        >
                          <Trash2 size={18} />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
