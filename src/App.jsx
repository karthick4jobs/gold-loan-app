import React, { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, Download, Plus, ChevronDown, ChevronUp } from "lucide-react";
import * as XLSX from "xlsx";

export default function GoldLoanCalculator() {
  const dateInputRef = useRef(null);
  const getCurrentDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [principal, setPrincipal] = useState("");
  const [pledgeDate, setPledgeDate] = useState(getCurrentDate());
  const [currentDate, setCurrentDate] = useState(getCurrentDate());
  const [isAyyaPeru, setIsAyyaPeru] = useState(true);
  const interestRateFirst12 = 1.25; // First 12 months
  const interestRateAfter12 = isAyyaPeru ? 1.75 : 2; // After 12 months
  const [months, setMonths] = useState(0);
  const [interest, setInterest] = useState(null);
  const [total, setTotal] = useState(null);
  const [history, setHistory] = useState([]);
  const [partPayments, setPartPayments] = useState([]);
  const [partAmount, setPartAmount] = useState("");
  const [partDate, setPartDate] = useState(getCurrentDate());
  const denominations = [500, 200, 100, 50, 20, 10, 1];
  const [counts, setCounts] = useState({
    500: "",
    200: "",
    100: "",
    50: "",
    20: "",
    10: "",
    1: ""
  });
  const [isPartPaymentOpen, setIsPartPaymentOpen] = useState(false);
  const [isCashCounterOpen, setIsCashCounterOpen] = useState(false);

  const addPartPayment = () => {
    if (!partAmount || !partDate) return;
    setPartPayments(prev => [...prev, {
      id: Date.now(),
      date: partDate,
      amount: parseFloat(partAmount)
    }]);
    setPartAmount("");
  };

  const removePartPayment = (id) => {
    setPartPayments(prev => prev.filter(p => p.id !== id));
  };

  // Accurate month calculation
  const calculateMonths = (start, end) => {
    let years = end.getFullYear() - start.getFullYear();
    let months = end.getMonth() - start.getMonth();
    let totalMonths = years * 12 + months;
    let daysDiff = end.getDate() - start.getDate();
    console.log("daysDiff", daysDiff);

    if (daysDiff < 0) {
      totalMonths -= 1;
      console.log("totalMonths", totalMonths);
      const prevMonth = new Date(end.getFullYear(), end.getMonth(), 0);
      console.log("prevMonth", prevMonth);
      console.log("prevMonth", prevMonth.getMonth());
      if (prevMonth.getMonth() == 1) {
        daysDiff += 30; //for Feburuary month consider it as 30 days
      } else {
        daysDiff += prevMonth.getDate();
      }
      console.log("daysDiff", daysDiff);
    }

    let fractional = 0;
    if (daysDiff >= 1 && daysDiff <= 7) fractional = 0.25;
    else if (daysDiff >= 8 && daysDiff <= 15) fractional = 0.5;
    else if (isAyyaPeru) {
      if (daysDiff >= 16 && daysDiff <= 21) fractional = 0.75;
      else if (daysDiff >= 22) fractional = 1;
    } else {
      if (daysDiff >= 16 && daysDiff <= 22) fractional = 0.75;
      else if (daysDiff >= 23) fractional = 1;
    }
    console.log("fractional", fractional);

    let total = totalMonths + fractional;
    return total < 0 ? 0 : total;
  };

  const calculateLoan = () => {
    const p = parseFloat(principal);
    if (!p || !pledgeDate || !currentDate) return;
    const startDate = new Date(pledgeDate);
    const today = new Date(currentDate);
    const finalMonthsTotal = calculateMonths(startDate, today);

    // Iterative calculation with part payments
    let currentPrincipal = p;
    let totalMonthsProcessed = 0;
    let accumulatedInterest = 0;

    // Helper to calculate interest for a specific period since pledge
    const getInterestForPeriod = (principal, startMonths, endMonths) => {
      let interest = 0;
      if (startMonths < 12) {
        let firstSegment = Math.min(12, endMonths) - startMonths;
        if (firstSegment > 0) {
          interest += (principal * interestRateFirst12 * firstSegment) / 100;
        }
      }
      if (endMonths > 12) {
        let secondSegment = endMonths - Math.max(12, startMonths);
        if (secondSegment > 0) {
          interest += (principal * interestRateAfter12 * secondSegment) / 100;
        }
      }
      return interest;
    };

    // Sort part payments chronologically
    const sortedPayments = [...partPayments].sort((a, b) => new Date(a.date) - new Date(b.date));

    for (let pay of sortedPayments) {
      const payDate = new Date(pay.date);
      console.log("payDate", payDate);
      const monthsSincePledge = calculateMonths(startDate, payDate);
      console.log("monthsSincePledge", monthsSincePledge);

      // Determine effective months: 
      // If payment falls on the last month of the total loan, use fractions (0.25, 0.5, 0.75)
      // Otherwise, round up to the next full month as per previous rule
      let effectiveMonths;
      if (Math.floor(monthsSincePledge) === Math.floor(finalMonthsTotal)) {
        effectiveMonths = monthsSincePledge;
      } else {
        effectiveMonths = Math.ceil(monthsSincePledge);
      }
      console.log("effectiveMonths", effectiveMonths);
      const deltaMonths = effectiveMonths - totalMonthsProcessed;
      console.log("deltaMonths", deltaMonths);
      if (deltaMonths > 0) {
        accumulatedInterest += getInterestForPeriod(currentPrincipal, totalMonthsProcessed, effectiveMonths);
      }
      console.log("accumulatedInterest", accumulatedInterest);
      // Apply payment: reduce interest first, then principal
      if (pay.amount >= accumulatedInterest) {
        const remainingPayment = pay.amount - accumulatedInterest;
        currentPrincipal -= remainingPayment;
        accumulatedInterest = 0;
      } else {
        accumulatedInterest -= pay.amount;
      }
      totalMonthsProcessed = effectiveMonths;
    }

    // Calculate interest for the final period (from last payment to current date)
    const finalDeltaMonths = finalMonthsTotal - totalMonthsProcessed;
    if (finalDeltaMonths > 0) {
      accumulatedInterest += getInterestForPeriod(currentPrincipal, totalMonthsProcessed, finalMonthsTotal);
    }

    // Final calculations
    const partPaymentTotal = partPayments.reduce((sum, pay) => sum + pay.amount, 0);
    const additionalAmount = Math.floor(finalMonthsTotal / 12) * 50;

    // The final total is (remaining principal + remaining interest + additional), rounded up to the nearest 5.
    const finalTotalValue = Math.ceil((currentPrincipal + accumulatedInterest + additionalAmount) / 5) * 5;

    // To ensure consistency (Principal + Interest + Additional - PartPayment = Total) in the history table:
    const displayedInterest = finalTotalValue - p - additionalAmount + partPaymentTotal;

    setMonths(finalMonthsTotal);
    setInterest(displayedInterest.toFixed(2));
    setTotal(finalTotalValue.toFixed(2));

    const formattedDate = `${String(startDate.getDate()).padStart(2, "0")}-${String(startDate.getMonth() + 1).padStart(2, "0")}-${String(startDate.getFullYear()).slice(-2)}`;

    setHistory(prev => [{
      id: Date.now(),
      principal: p,
      pledgeDate: formattedDate,
      months: finalMonthsTotal,
      interest: displayedInterest.toFixed(2),
      additional: additionalAmount,
      partPayment: partPaymentTotal,
      total: finalTotalValue.toFixed(2)
    }, ...prev]);

    setPrincipal("");
    setPledgeDate(currentDate);
    setInterest(null);
    setPartPayments([]);
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
        const additionalAmount = parseFloat(record.additional) || 0;
        const partPaymentAmount = parseFloat(record.partPayment) || 0;
        return {
          ...record,
          interest: newInterest,
          total: (Math.ceil((parseFloat(record.principal) + floatInterest + additionalAmount - partPaymentAmount) / 5) * 5).toFixed(2)
        };
      }
      return record;
    }));
  };

  const updateAdditional = (id, newAdditional) => {
    setHistory(prev => prev.map(record => {
      if (record.id === id) {
        const val = parseFloat(newAdditional);
        const floatAdditional = isNaN(val) ? 0 : val;
        const interestAmount = parseFloat(record.interest) || 0;
        const partPaymentAmount = parseFloat(record.partPayment) || 0;
        return {
          ...record,
          additional: newAdditional,
          total: (Math.ceil((parseFloat(record.principal) + interestAmount + floatAdditional - partPaymentAmount) / 5) * 5).toFixed(2)
        };
      }
      return record;
    }));
  };

  const updatePartPayment = (id, newPartPayment) => {
    setHistory(prev => prev.map(record => {
      if (record.id === id) {
        const val = parseFloat(newPartPayment);
        const floatPartPayment = isNaN(val) ? 0 : val;
        const interestAmount = parseFloat(record.interest) || 0;
        const additionalAmount = parseFloat(record.additional) || 0;
        return {
          ...record,
          partPayment: newPartPayment,
          total: (Math.ceil((parseFloat(record.principal) + interestAmount + additionalAmount - floatPartPayment) / 5) * 5).toFixed(2)
        };
      }
      return record;
    }));
  };

  const exportToExcel = () => {
    const today = new Date(currentDate);
    const formattedTitleDate = `${String(today.getDate()).padStart(2, "0")}-${String(today.getMonth() + 1).padStart(2, "0")}-${today.getFullYear()}`;
    const fileName = `Gold_Loan_History_${formattedTitleDate}${isAyyaPeru ? "_ayya" : ""}.xlsx`;

    // 1. Prepare history data with totals
    const historyData = [...history].reverse().map((record, index) => ({
      "S.No.": index + 1,
      "Date Pledged": record.pledgeDate,
      "Principal (₹)": parseFloat(record.principal),
      "Months": record.months,
      "Interest (₹)": parseFloat(record.interest),
      "Additional (₹)": parseFloat(record.additional) || 0,
      "Part Payment (₹)": parseFloat(record.partPayment) || 0,
      "Total Payable (₹)": parseFloat(record.total)
    }));

    // Calculate totals
    const totalPrincipal = history.reduce((sum, r) => sum + (parseFloat(r.principal) || 0), 0);
    const totalInterest = history.reduce((sum, r) => sum + (parseFloat(r.interest) || 0), 0);
    const totalAdditional = history.reduce((sum, r) => sum + (parseFloat(r.additional) || 0), 0);
    const totalPartPayment = history.reduce((sum, r) => sum + (parseFloat(r.partPayment) || 0), 0);
    const finalGrandTotal = history.reduce((sum, r) => sum + (parseFloat(r.total) || 0), 0);

    const worksheet = XLSX.utils.json_to_sheet(historyData);

    // 2. Add Grand Totals below the table
    const grandTotals = [
      [""], // Spacer
      ["", "GRAND TOTALS", totalPrincipal, "", totalInterest, totalAdditional, totalPartPayment, finalGrandTotal]
    ];
    XLSX.utils.sheet_add_aoa(worksheet, grandTotals, { origin: -1 });

    // 3. Add Cash Counter Details
    const cashCounterRows = [
      [""], // Spacer
      [""], // Spacer
      ["CASH COUNTER DETAILS"],
      ["Denomination", "Count", "Subtotal"]
    ];

    denominations.forEach(denom => {
      const count = parseInt(counts[denom]) || 0;
      if (count > 0) {
        cashCounterRows.push([`₹ ${denom}`, count, count * denom]);
      }
    });

    const totalCashAmount = Object.entries(counts).reduce((sum, [denom, count]) => sum + ((parseInt(count) || 0) * parseInt(denom)), 0);
    cashCounterRows.push(["TOTAL CASH", "", totalCashAmount]);

    XLSX.utils.sheet_add_aoa(worksheet, cashCounterRows, { origin: -1 });

    // 4. Create and save workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start bg-gray-50 p-6 pt-10 gap-8">
      <div className="flex flex-col lg:flex-row gap-8 items-start justify-center w-full max-w-7xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <Card className="rounded-2xl shadow-lg p-4 bg-white">
            <CardContent>
              <div className="flex justify-between items-center mb-4">
                <h1 className="text-xl font-bold">Gold Loan Calculator</h1>
                <Button
                  onClick={() => setIsAyyaPeru(!isAyyaPeru)}
                  className={`h-9 px-3 text-xs font-semibold rounded-full shadow-sm transition-all duration-300 transform active:scale-95 ${isAyyaPeru
                    ? "bg-gradient-to-r from-orange-400 to-red-500 text-white hover:from-orange-500 hover:to-red-600"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                >
                  AyyaPeru: {isAyyaPeru ? "Enabled" : "Disabled"}
                </Button>
              </div>
              <label className="block mb-1 text-sm font-medium">Current Date</label>
              <Input
                type="date"
                value={currentDate}
                onChange={(e) => setCurrentDate(e.target.value)}
                className="p-2 mb-4 w-full"
              />

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

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="w-full max-w-md">
          <Card className="rounded-2xl shadow-lg p-4 bg-white">
            <CardContent>
              <div 
                className="flex justify-between items-center mb-4 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
                onClick={() => setIsPartPaymentOpen(!isPartPaymentOpen)}
              >
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    Part Payments
                  </h2>
                  {isPartPaymentOpen ? <ChevronUp size={20} className="text-gray-500" /> : <ChevronDown size={20} className="text-gray-500" />}
                </div>
                <div className="flex items-center gap-2">
                  {partPayments.length > 0 && (
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPartPayments([]);
                      }}
                      variant="ghost"
                      className="text-xs h-7 px-2 text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      Clear All
                    </Button>
                  )}
                </div>
              </div>

              <AnimatePresence>
                {isPartPaymentOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-4 mb-6 p-4 bg-blue-50 rounded-xl">
                      <div>
                        <label className="block mb-1 text-xs font-medium text-gray-600">Payment Date</label>
                        <Input
                          type="date"
                          value={partDate}
                          onChange={(e) => setPartDate(e.target.value)}
                          className="h-9"
                        />
                      </div>
                      <div>
                        <label className="block mb-1 text-xs font-medium text-gray-600">Amount (₹)</label>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            placeholder="Amount"
                            value={partAmount}
                            onChange={(e) => setPartAmount(e.target.value)}
                            className="h-9"
                          />
                          <Button onClick={addPartPayment} className="h-9 w-9 p-0 bg-blue-600 hover:bg-blue-700">
                            <Plus size={18} />
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {partPayments.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-8">No part payments added</p>
                      ) : (
                        partPayments.map((p) => (
                          <div key={p.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100 group transition-all hover:border-blue-200">
                            <div>
                              <p className="text-xs text-gray-500">{p.date}</p>
                              <p className="font-bold text-gray-800">₹{p.amount.toLocaleString()}</p>
                            </div>
                            <Button
                              onClick={() => removePartPayment(p.id)}
                              className="h-8 w-8 p-0 bg-transparent text-gray-400 hover:text-red-500 hover:bg-red-50 shadow-none opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        ))
                      )}
                    </div>

                    {partPayments.length > 0 && (
                      <div className="mt-6 pt-4 border-t border-dashed">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600">Total Part Payment:</span>
                          <span className="font-bold text-blue-600">
                            ₹{partPayments.reduce((sum, p) => sum + p.amount, 0).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="w-full max-w-sm">
          <Card className="rounded-2xl shadow-lg p-4 bg-white">
            <CardContent>
              <div 
                className="flex justify-between items-center mb-4 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
                onClick={() => setIsCashCounterOpen(!isCashCounterOpen)}
              >
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    Cash Counter
                  </h2>
                  {isCashCounterOpen ? <ChevronUp size={20} className="text-gray-500" /> : <ChevronDown size={20} className="text-gray-500" />}
                </div>
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCounts({ 500: "", 200: "", 100: "", 50: "", 20: "", 10: "", 1: "" });
                  }}
                  variant="ghost"
                  className="text-xs h-7 px-2 text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  Clear
                </Button>
              </div>

              <AnimatePresence>
                {isCashCounterOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-3">
                      {denominations.map((denom) => (
                        <div key={denom} className="flex items-center gap-3">
                          <span className="w-10 text-sm font-semibold text-gray-600 whitespace-nowrap">₹ {denom}</span>
                          <span className="text-gray-300">×</span>
                          <Input
                            type="number"
                            placeholder="0"
                            value={counts[denom]}
                            onChange={(e) => setCounts({ ...counts, [denom]: e.target.value })}
                            className="w-20 h-9 text-center"
                          />
                          <span className="text-gray-300">=</span>
                          <span className="flex-1 text-right font-bold text-gray-800">
                            ₹{((parseInt(counts[denom]) || 0) * denom).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 pt-4 border-t border-dashed border-gray-200">
                      <div className="flex justify-between items-center text-lg font-bold">
                        <span className="text-gray-600">Total Cash:</span>
                        <span className="text-green-600">
                          ₹{Object.entries(counts).reduce((sum, [denom, count]) => sum + ((parseInt(count) || 0) * parseInt(denom)), 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>
      </div>

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
                    <th className="p-2 font-medium">Additional (₹)</th>
                    <th className="p-2 font-medium">Part Payment (₹)</th>
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
                      <td className="p-2">
                        <Input
                          type="number"
                          value={record.additional}
                          onChange={(e) => updateAdditional(record.id, e.target.value)}
                          className="w-24 h-8 px-2 py-1 text-sm bg-white"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          value={record.partPayment}
                          onChange={(e) => updatePartPayment(record.id, e.target.value)}
                          className="w-24 h-8 px-2 py-1 text-sm bg-white text-red-600 font-medium"
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
                {history.length > 0 && (
                  <tfoot className="border-t-2 border-gray-200">
                    <tr className="bg-gray-50 font-bold text-gray-800">
                      <td colSpan={2} className="p-2 text-right">Grand Totals:</td>
                      <td className="p-2">
                        ₹{history.reduce((sum, r) => sum + (parseFloat(r.principal) || 0), 0).toLocaleString()}
                      </td>
                      <td className="p-2">-</td>
                      <td className="p-2">
                        ₹{history.reduce((sum, r) => sum + (parseFloat(r.interest) || 0), 0).toFixed(2)}
                      </td>
                      <td className="p-2">
                        ₹{history.reduce((sum, r) => sum + (parseFloat(r.additional) || 0), 0).toFixed(2)}
                      </td>
                      <td className="p-2 text-red-600">
                        ₹{history.reduce((sum, r) => sum + (parseFloat(r.partPayment) || 0), 0).toFixed(2)}
                      </td>
                      <td className="p-2 text-blue-600">
                        ₹{history.reduce((sum, r) => sum + (parseFloat(r.total) || 0), 0).toFixed(2)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
