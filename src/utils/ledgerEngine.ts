/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Transaction, Sale, Withdrawal, Employee } from '../types/index.js';

export interface LedgerEntry {
  id: string;
  timestamp: string;
  type: 'CREDIT' | 'DEBIT';
  categoryBn: string;
  categoryEn: string;
  description: string;
  reference: string;
  amount: number;
  runningBalance: number;
  status: 'COMPLETED' | 'PENDING' | 'CANCELLED';
  rawType: string;
}

export interface LedgerSummary {
  totalCredit: number;
  totalDebit: number;
  netBalance: number;
  totalSalesProfit: number;
  totalReferralBonus: number;
  totalTopup: number;
  totalWithdrawn: number;
  totalDeductions: number;
  entryCount: number;
}

export function buildResellerLedger(params: {
  employee?: Employee | null;
  transactions?: Transaction[];
  sales?: Sale[];
  withdrawals?: Withdrawal[];
}): { ledger: LedgerEntry[]; summary: LedgerSummary } {
  const { employee, transactions = [], sales = [], withdrawals = [] } = params;

  // Filter transactions for this employee if employee is provided
  const empId = employee?.id;
  const rawTrxs = empId ? transactions.filter(t => t.employeeId === empId) : transactions;
  const userSales = empId ? sales.filter(s => s.employeeId === empId) : sales;
  const userWithdrawals = empId ? withdrawals.filter(w => w.employeeId === empId) : withdrawals;

  const rawEntries: Array<{
    id: string;
    timestamp: string;
    type: 'CREDIT' | 'DEBIT';
    categoryBn: string;
    categoryEn: string;
    description: string;
    reference: string;
    amount: number;
    status: 'COMPLETED' | 'PENDING' | 'CANCELLED';
    rawType: string;
  }> = [];

  if (rawTrxs.length > 0) {
    // Collect references for paid withdrawals to prevent double-counting withdrawal requests
    const paidWdrRefs = new Set(
      rawTrxs
        .filter(t => (t.type || '').toUpperCase() === 'WITHDRAWAL_PAID')
        .map(t => t.reference)
        .filter(Boolean)
    );

    const wdrReqRefs = new Set(
      rawTrxs
        .filter(t => (t.type || '').toUpperCase() === 'WITHDRAWAL_REQUEST')
        .map(t => t.reference)
        .filter(Boolean)
    );

    rawTrxs.forEach(t => {
      const typeUpper = (t.type || '').toUpperCase();
      const ref = t.reference || t.id;

      // Handle duplicate withdrawal entries:
      // If both WITHDRAWAL_REQUEST and WITHDRAWAL_PAID exist for the same reference,
      // we only want ONE debit on the financial ledger (at the time the funds were deducted).
      if (typeUpper === 'WITHDRAWAL_PAID' && wdrReqRefs.has(ref)) {
        return; // Handled by WITHDRAWAL_REQUEST below to preserve original debit timestamp
      }

      let isCredit = false;
      let categoryBn = 'ট্রানজেকশন';
      let categoryEn = 'Transaction';
      let displayDesc = t.description || '';

      if (typeUpper === 'COMMISSION_EARNED' || typeUpper === 'COMMISSION') {
        isCredit = true;
        categoryBn = 'বিক্রয় কমিশন';
        categoryEn = 'Sales Commission';
      } else if (typeUpper === 'REFERRAL_BONUS' || typeUpper === 'BONUS') {
        isCredit = true;
        categoryBn = 'রেফারেল বোনাস';
        categoryEn = 'Referral Bonus';
      } else if (typeUpper === 'BALANCE_TOPUP') {
        isCredit = true;
        categoryBn = 'ব্যালেন্স টপ-আপ';
        categoryEn = 'Balance Top-up';
      } else if (typeUpper === 'WITHDRAWAL_REFUND') {
        isCredit = true;
        categoryBn = 'উইথড্রয়াল রিফান্ড';
        categoryEn = 'Withdrawal Refund';
      } else if (typeUpper === 'WITHDRAWAL_PAID') {
        isCredit = false;
        categoryBn = 'উইথড্রয়াল';
        categoryEn = 'Withdrawal';
      } else if (typeUpper === 'WITHDRAWAL_REQUEST') {
        isCredit = false;
        const isAlreadyPaid = paidWdrRefs.has(ref);
        categoryBn = isAlreadyPaid ? 'উইথড্রয়াল' : 'উইথড্রয়াল আবেদন';
        categoryEn = isAlreadyPaid ? 'Withdrawal' : 'Withdrawal Request';
        if (isAlreadyPaid && displayDesc.includes('রিকোয়েস্ট')) {
          displayDesc = displayDesc.replace('রিকোয়েস্ট', 'সম্পন্ন');
        }
      } else if (typeUpper === 'ADJUSTMENT' || typeUpper === 'ADJUSTMENT_DEDUCT') {
        isCredit = t.amount > 0;
        categoryBn = isCredit ? 'অ্যাডজাস্টমেন্ট' : 'চার্জ কর্তন';
        categoryEn = isCredit ? 'Adjustment' : 'Fee Deduction';
      } else {
        isCredit = t.amount > 0;
        categoryBn = isCredit ? 'জমা' : 'কর্তন';
        categoryEn = isCredit ? 'Credit' : 'Debit';
      }

      // Clean up description if it has ugly minus strings like "(-৳500)" or "+৳-500"
      displayDesc = displayDesc.replace(/\(\s*[-+]\s*৳?\d+\s*\)/g, '').trim();

      rawEntries.push({
        id: t.id,
        timestamp: t.timestamp,
        type: isCredit ? 'CREDIT' : 'DEBIT',
        categoryBn,
        categoryEn,
        description: displayDesc,
        reference: ref,
        amount: Math.abs(t.amount),
        status: (t.status as any) || 'COMPLETED',
        rawType: typeUpper
      });
    });
  } else {
    // Synthesize mathematically from sales and withdrawals if transactions are empty
    userSales.forEach(s => {
      if (s.commissionAmount > 0) {
        rawEntries.push({
          id: `sale-${s.id}`,
          timestamp: s.saleDate,
          type: 'CREDIT',
          categoryBn: 'বিক্রয় কমিশন',
          categoryEn: 'Sales Commission',
          description: `অর্ডার #${s.orderCode} (${s.productName}) থেকে অর্জিত কমিশন`,
          reference: `#${s.orderCode}`,
          amount: s.commissionAmount,
          status: 'COMPLETED',
          rawType: 'COMMISSION_EARNED'
        });
      }
    });

    userWithdrawals.forEach(w => {
      rawEntries.push({
        id: `wdr-${w.id}`,
        timestamp: w.requestDate,
        type: 'DEBIT',
        categoryBn: w.status === 'APPROVED' ? 'উইথড্রয়াল' : 'উইথড্রয়াল আবেদন',
        categoryEn: w.status === 'APPROVED' ? 'Withdrawal' : 'Withdrawal Request',
        description: `${w.paymentMethod} (${w.accountNumber}) এ উত্তোলন ${w.status === 'APPROVED' ? 'সম্পন্ন' : 'রিকোয়েস্ট'}`,
        reference: `#${w.id}`,
        amount: w.amount,
        status: w.status === 'APPROVED' ? 'COMPLETED' : 'PENDING',
        rawType: 'WITHDRAWAL'
      });

      if (w.status === 'REJECTED') {
        rawEntries.push({
          id: `wdr-ref-${w.id}`,
          timestamp: w.processedDate || w.requestDate,
          type: 'CREDIT',
          categoryBn: 'উইথড্রয়াল ফেরত',
          categoryEn: 'Withdrawal Refund',
          description: `উইথড্রয়াল #${w.id} বাতিল হওয়ায় টাকা ওয়ালেটে রিফান্ড`,
          reference: `#${w.id}`,
          amount: w.amount,
          status: 'COMPLETED',
          rawType: 'WITHDRAWAL_REFUND'
        });
      }
    });
  }

  // Sort ascending chronologically (oldest first) to calculate running balance accurately
  rawEntries.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  let currentRunning = 0;
  let totalCredit = 0;
  let totalDebit = 0;
  let totalSalesProfit = 0;
  let totalReferralBonus = 0;
  let totalTopup = 0;
  let totalWithdrawn = 0;
  let totalDeductions = 0;

  const withRunningBalance: LedgerEntry[] = rawEntries.map(entry => {
    if (entry.type === 'CREDIT') {
      currentRunning += entry.amount;
      totalCredit += entry.amount;

      if (entry.rawType.includes('COMMISSION')) {
        totalSalesProfit += entry.amount;
      } else if (entry.rawType.includes('REFERRAL') || entry.rawType.includes('BONUS')) {
        totalReferralBonus += entry.amount;
      } else if (entry.rawType.includes('TOPUP')) {
        totalTopup += entry.amount;
      }
    } else {
      currentRunning -= entry.amount;
      totalDebit += entry.amount;

      if (entry.rawType.includes('WITHDRAWAL')) {
        totalWithdrawn += entry.amount;
      } else {
        totalDeductions += entry.amount;
      }
    }

    return {
      ...entry,
      runningBalance: currentRunning
    };
  });

  // Reconcile with employee wallet balance if there is a legacy base
  const expectedAvailableBalance = employee?.wallet?.availableBalance;
  if (expectedAvailableBalance !== undefined && withRunningBalance.length > 0) {
    const calculatedFinal = currentRunning;
    const diff = expectedAvailableBalance - calculatedFinal;
    if (diff !== 0 && Math.abs(diff) < 1000000) {
      // Re-align running balances so the top entry matches expectedAvailableBalance
      for (const item of withRunningBalance) {
        item.runningBalance += diff;
      }
    }
  }

  // REVERSE: Newest entries at the TOP (সবার উপরে থাকবে)
  const finalLedger = [...withRunningBalance].reverse();

  const summary: LedgerSummary = {
    totalCredit,
    totalDebit,
    netBalance: employee?.wallet?.availableBalance ?? (totalCredit - totalDebit),
    totalSalesProfit,
    totalReferralBonus,
    totalTopup,
    totalWithdrawn,
    totalDeductions,
    entryCount: finalLedger.length
  };

  return { ledger: finalLedger, summary };
}
