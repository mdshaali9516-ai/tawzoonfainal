/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import {
  TrendingUp,
  Wallet,
  ShoppingBag,
  Users,
  CreditCard,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  FileSpreadsheet,
} from 'lucide-react';
import { useApp } from '../../context/AppContext.js';
import { Transaction, Sale, Withdrawal } from '../../types/index.js';
import { buildResellerLedger } from '../../utils/ledgerEngine.js';

interface ResellerEarningsTabProps {
  transactionsList: Transaction[];
  salesList: Sale[];
  withdrawalsList?: Withdrawal[];
}

export const ResellerEarningsTab: React.FC<ResellerEarningsTabProps> = ({
  transactionsList,
  salesList,
  withdrawalsList = [],
}) => {
  const { lang, employee } = useApp();
  if (!employee) return null;

  // Build 100% mathematically verified ledger with newest-first ordering and running balance proof
  const { ledger, summary } = useMemo(() => {
    return buildResellerLedger({
      employee,
      transactions: transactionsList,
      sales: salesList,
      withdrawals: withdrawalsList,
    });
  }, [employee, transactionsList, salesList, withdrawalsList]);

  const directProductSalesCount = salesList.filter(
    s => s.saleStatus === 'Approved' || (s.paymentStatus === 'PAID' && s.saleStatus !== 'Rejected')
  ).length;

  return (
    <div className="space-y-5">
      {/* 1. Summary Cards for Earnings Sources - 4 Cards with Crystal-Clear Breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Card 1: Product Sales Profit */}
        <div className="bg-gradient-to-br from-emerald-50/80 via-white to-emerald-50/40 border border-emerald-200/90 rounded-2xl p-3 sm:p-4 shadow-3xs flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] sm:text-xs font-extrabold text-slate-700 uppercase tracking-tight line-clamp-1">
              {lang === 'bn' ? 'পণ্য বিক্রি থেকে প্রফিট' : 'Sales Commission'}
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-100/80 text-[#009245] flex items-center justify-center font-bold shrink-0 shadow-3xs">
              <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div>
            <div className="text-base sm:text-2xl font-black text-slate-900 font-mono tracking-tight">
              ৳{summary.totalSalesProfit.toLocaleString()}
            </div>
            <p className="text-[10px] sm:text-[11px] text-emerald-800 font-bold truncate mt-0.5">
              {directProductSalesCount} {lang === 'bn' ? 'টি সফল বিক্রি' : 'sales'}
            </p>
          </div>
        </div>

        {/* Card 2: Referral Network Bonus */}
        <div className="bg-gradient-to-br from-sky-50/80 via-white to-sky-50/40 border border-sky-200/90 rounded-2xl p-3 sm:p-4 shadow-3xs flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] sm:text-xs font-extrabold text-slate-700 uppercase tracking-tight line-clamp-1">
              {lang === 'bn' ? 'রেফারেল ও নেটওয়ার্ক বোনাস' : 'Referral Bonus'}
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-sky-100/80 text-sky-700 flex items-center justify-center font-bold shrink-0 shadow-3xs">
              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div>
            <div className="text-base sm:text-2xl font-black text-slate-900 font-mono tracking-tight">
              ৳{summary.totalReferralBonus.toLocaleString()}
            </div>
            <p className="text-[10px] sm:text-[11px] text-sky-800 font-bold truncate mt-0.5">
              {lang === 'bn' ? 'রেফারেল অ্যাকাউন্ট থেকে' : 'From referral network'}
            </p>
          </div>
        </div>

        {/* Card 3: Balance Top-up */}
        <div className="bg-gradient-to-br from-indigo-50/80 via-white to-indigo-50/40 border border-indigo-200/90 rounded-2xl p-3 sm:p-4 shadow-3xs flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] sm:text-xs font-extrabold text-slate-700 uppercase tracking-tight line-clamp-1">
              {lang === 'bn' ? 'ব্যালেন্স টপ-আপ' : 'Balance Top-up'}
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-indigo-100/80 text-indigo-700 flex items-center justify-center font-bold shrink-0 shadow-3xs">
              <CreditCard className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div>
            <div className="text-base sm:text-2xl font-black text-slate-900 font-mono tracking-tight">
              ৳{summary.totalTopup.toLocaleString()}
            </div>
            <p className="text-[10px] sm:text-[11px] text-indigo-800 font-bold truncate mt-0.5">
              {lang === 'bn' ? 'ওয়ালেটে যোগ হয়েছে' : 'Deposited to wallet'}
            </p>
          </div>
        </div>

        {/* Card 4: Current Withdrawable Balance */}
        <div className="bg-gradient-to-br from-amber-50/90 via-amber-50/40 to-white border-2 border-amber-300 rounded-2xl p-3 sm:p-4 shadow-3xs flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] sm:text-xs font-extrabold text-slate-800 uppercase tracking-tight line-clamp-1">
              {lang === 'bn' ? 'বর্তমান উত্তোলনযোগ্য ব্যালেন্স' : 'Withdrawable Balance'}
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold shrink-0 shadow-3xs">
              <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div>
            <div
              className={`text-base sm:text-2xl font-black font-mono tracking-tight ${
                summary.netBalance < 0 ? 'text-rose-600' : 'text-slate-900'
              }`}
            >
              {summary.netBalance < 0
                ? `-৳${Math.abs(summary.netBalance).toLocaleString()}`
                : `৳${summary.netBalance.toLocaleString()}`}
            </div>
            <p className="text-[10px] sm:text-[11px] text-amber-800 font-extrabold truncate mt-0.5 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-[#009245]" />
              {lang === 'bn' ? 'উইথড্র প্রস্তুত' : 'Ready for withdrawal'}
            </p>
          </div>
        </div>
      </div>

      {/* 3. Detailed Transaction Ledger (Newest at Top) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#009245] flex items-center justify-center font-bold shrink-0 border border-emerald-200/80">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-slate-900">
                {lang === 'bn'
                  ? 'আর্নিং ও ইনকাম ডিটেইলস লেজার (প্রতিটি লেনদেনের স্বচ্ছ হিসাব)'
                  : 'Detailed Income & Earnings Ledger'}
              </h3>
              <p className="text-[10px] text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3 text-emerald-600" />
                <span>{lang === 'bn' ? 'সর্বশেষ লেনদেন সবার উপরে প্রদর্শিত হচ্ছে' : 'Latest transactions shown on top'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-xl border border-slate-200 font-mono">
              {ledger.length} {lang === 'bn' ? 'টি সফল এন্ট্রি' : 'entries'}
            </span>
          </div>
        </div>

        {ledger.length === 0 ? (
          <div className="py-14 text-center space-y-2.5 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
            <div className="w-12 h-12 rounded-2xl bg-white text-slate-400 mx-auto flex items-center justify-center shadow-3xs border border-slate-200">
              <Wallet className="w-6 h-6" />
            </div>
            <p className="text-xs font-bold text-slate-600">
              {lang === 'bn' ? 'এখনো কোনো ইনকাম বা লেনদেনের খতিয়ান রেকর্ড নেই।' : 'No transaction records found yet.'}
            </p>
            <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
              {lang === 'bn'
                ? 'অর্ডার ডেলিভারি হলে কমিশন অথবা ব্যালেন্স টপ-আপ অনুমোদিত হলে এখানে প্রতিটি লেনদেনের হিসাব দেখতে পাবেন।'
                : 'Commissions and top-ups will automatically appear here once processed.'}
            </p>
          </div>
        ) : (
          <div>
            {/* Desktop Full Table View */}
            <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200/80">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-600 font-extrabold text-[11px] bg-slate-50/90 uppercase tracking-wider">
                    <th className="p-3.5 font-extrabold whitespace-nowrap">
                      {lang === 'bn' ? 'তারিখ ও সময়' : 'Date & Time'}
                    </th>
                    <th className="p-3.5 font-extrabold">
                      {lang === 'bn' ? 'ইনকামের উৎস ও বিবরণ' : 'Income Source & Details'}
                    </th>
                    <th className="p-3.5 font-extrabold whitespace-nowrap">
                      {lang === 'bn' ? 'রেফারেন্স / অর্ডার আইডি' : 'Reference / ID'}
                    </th>
                    <th className="p-3.5 font-extrabold text-right whitespace-nowrap">
                      {lang === 'bn' ? 'যোগ / বিয়োগ টাকা' : 'Credit / Debit Amount'}
                    </th>
                    <th className="p-3.5 font-extrabold text-right whitespace-nowrap">
                      {lang === 'bn' ? 'আপডেটেড ব্যালেন্স' : 'Updated Balance'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {ledger.map((item, idx) => {
                    const isCredit = item.type === 'CREDIT';
                    const isTopRow = idx === 0;

                    return (
                      <tr
                        key={item.id}
                        className={`transition-all border-b border-slate-200 ${
                          isTopRow
                            ? 'bg-emerald-50/50 hover:bg-emerald-50/80 font-bold border-l-4 border-l-[#009245]'
                            : 'hover:bg-slate-50/90 border-l-4 border-l-slate-300'
                        }`}
                      >
                        {/* 1. Date & Time */}
                        <td className="p-3.5 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                          <div className="font-bold text-slate-800">
                            {new Date(item.timestamp).toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {new Date(item.timestamp).toLocaleTimeString(lang === 'bn' ? 'bn-BD' : 'en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true,
                            })}
                          </div>
                        </td>

                        {/* 2. Source & Description */}
                        <td className="p-3.5">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold whitespace-nowrap border shrink-0 ${
                                isCredit
                                  ? item.rawType.includes('TOPUP')
                                    ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                                    : item.rawType.includes('REFERRAL')
                                    ? 'bg-sky-50 text-sky-800 border-sky-200'
                                    : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : item.rawType.includes('WITHDRAWAL')
                                  ? 'bg-rose-50 text-rose-800 border-rose-200'
                                  : 'bg-amber-50 text-amber-800 border-amber-200'
                              }`}
                            >
                              {lang === 'bn' ? item.categoryBn : item.categoryEn}
                            </span>
                            <span className="font-bold text-slate-900 leading-snug">
                              {item.description}
                            </span>
                          </div>
                        </td>

                        {/* 3. Reference / Order ID */}
                        <td className="p-3.5 font-mono text-[11px] font-bold text-sky-800 whitespace-nowrap">
                          {item.reference || 'N/A'}
                        </td>

                        {/* 4. Credit / Debit Amount */}
                        <td className="p-3.5 text-right font-black font-mono text-sm whitespace-nowrap">
                          {isCredit ? (
                            <span className="inline-flex items-center gap-0.5 text-emerald-700 bg-emerald-50/90 px-2.5 py-1 rounded-lg border border-emerald-200/90">
                              <ArrowUpRight className="w-3.5 h-3.5" />
                              <span>+৳{item.amount.toLocaleString()}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 text-rose-700 bg-rose-50/90 px-2.5 py-1 rounded-lg border border-rose-200/90">
                              <ArrowDownLeft className="w-3.5 h-3.5" />
                              <span>-৳{item.amount.toLocaleString()}</span>
                            </span>
                          )}
                        </td>

                        {/* 5. Running Balance */}
                        <td className="p-3.5 text-right font-black font-mono text-slate-900 text-sm whitespace-nowrap">
                          <span
                            className={`px-2.5 py-1 rounded-lg inline-block font-extrabold ${
                              isTopRow
                                ? 'bg-amber-50 text-amber-950 border border-amber-200/90 font-black'
                                : item.runningBalance < 0
                                ? 'text-rose-600'
                                : 'text-slate-900'
                            }`}
                          >
                            {item.runningBalance < 0
                              ? `-৳${Math.abs(item.runningBalance).toLocaleString()}`
                              : `৳${item.runningBalance.toLocaleString()}`}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile View: High-Definition Cards */}
            <div className="md:hidden space-y-2.5">
              {ledger.map((item, idx) => {
                const isCredit = item.type === 'CREDIT';
                const isTopRow = idx === 0;

                return (
                  <div
                    key={item.id}
                    className={`bg-white rounded-2xl p-4 space-y-2.5 transition-all ${
                      isTopRow
                        ? 'border-2 border-emerald-500 ring-4 ring-emerald-100/70 shadow-md bg-gradient-to-br from-emerald-50/50 via-white to-white'
                        : 'border-2 border-slate-300/90 hover:border-emerald-400 shadow-xs hover:shadow-sm'
                    }`}
                  >
                    {/* Header Row: Category Badge + Amount */}
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-black border uppercase tracking-tight ${
                          isCredit
                            ? item.rawType.includes('TOPUP')
                              ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}
                      >
                        {lang === 'bn' ? item.categoryBn : item.categoryEn}
                      </span>

                      <span
                        className={`font-mono text-xs font-black px-2 py-0.5 rounded-lg border shrink-0 ${
                          isCredit
                            ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                            : 'text-rose-700 bg-rose-50 border-rose-200'
                        }`}
                      >
                        {isCredit ? `+৳${item.amount.toLocaleString()}` : `-৳${item.amount.toLocaleString()}`}
                      </span>
                    </div>

                    {/* Middle: Description */}
                    <p className="text-xs font-bold text-slate-900 leading-snug">
                      {item.description}
                    </p>

                    {/* Footer Row: Reference, Date & Updated Balance */}
                    <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-100 gap-2">
                      <div className="min-w-0">
                        <span className="font-mono text-[10px] text-sky-800 font-bold block truncate">
                          {item.reference || 'N/A'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(item.timestamp).toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US', {
                            day: 'numeric',
                            month: 'short',
                          })}{' '}
                          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">
                          {lang === 'bn' ? 'আপডেটেড ব্যালেন্স' : 'Balance'}
                        </span>
                        <span
                          className={`font-mono font-black text-xs ${
                            item.runningBalance < 0 ? 'text-rose-600' : 'text-slate-900'
                          }`}
                        >
                          {item.runningBalance < 0
                            ? `-৳${Math.abs(item.runningBalance).toLocaleString()}`
                            : `৳${item.runningBalance.toLocaleString()}`}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
