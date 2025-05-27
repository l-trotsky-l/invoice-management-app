'use client';

import { useInvoiceStore } from '../app/store/invoiceStore';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

interface MonthlyData {
  month: string;
  amount: number;
}

interface StatusData {
  name: string;
  value: number;
}

interface CustomerData {
  name: string;
  amount: number;
}

export default function InvoiceAnalytics() {
  const { invoices } = useInvoiceStore();

  // Calculate total amount and balance
  const totalAmount = invoices.reduce((sum, invoice) => sum + invoice.TotalAmt, 0);
  const totalBalance = invoices.reduce((sum, invoice) => sum + invoice.Balance, 0);

  // Prepare data for monthly revenue chart
  const monthlyData = invoices.reduce((acc: MonthlyData[], invoice) => {
    const date = new Date(invoice.TxnDate);
    const monthYear = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
    
    const existingMonth = acc.find(item => item.month === monthYear);
    if (existingMonth) {
      existingMonth.amount += invoice.TotalAmt;
    } else {
      acc.push({ month: monthYear, amount: invoice.TotalAmt });
    }
    return acc;
  }, []).sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

  // Prepare data for payment status pie chart
  const statusData = invoices.reduce((acc: StatusData[], invoice) => {
    const status = invoice.Balance === 0 ? 'Paid' : 'Unpaid';
    const existingStatus = acc.find(item => item.name === status);
    if (existingStatus) {
      existingStatus.value += 1;
    } else {
      acc.push({ name: status, value: 1 });
    }
    return acc;
  }, []);

  // Prepare data for top customers
  const customerData = invoices.reduce((acc: CustomerData[], invoice) => {
    const customer = invoice.CustomerRef.name;
    const existingCustomer = acc.find(item => item.name === customer);
    if (existingCustomer) {
      existingCustomer.amount += invoice.TotalAmt;
    } else {
      acc.push({ name: customer, amount: invoice.TotalAmt });
    }
    return acc;
  }, []).sort((a, b) => b.amount - a.amount).slice(0, 5);

  return (
    <div className="p-6 space-y-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white/5 rounded-lg p-6 border border-white/10">
          <h3 className="text-lg font-medium text-gray-300 mb-2">Total Revenue</h3>
          <p className="text-3xl font-bold text-white">${totalAmount.toFixed(2)}</p>
        </div>
        <div className="bg-white/5 rounded-lg p-6 border border-white/10">
          <h3 className="text-lg font-medium text-gray-300 mb-2">Outstanding Balance</h3>
          <p className="text-3xl font-bold text-white">${totalBalance.toFixed(2)}</p>
        </div>
      </div>

      {/* Monthly Revenue Chart */}
      <div className="bg-white/5 rounded-lg p-6 border border-white/10">
        <h3 className="text-lg font-medium text-gray-300 mb-4">Monthly Revenue</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
              <XAxis dataKey="month" stroke="#ffffff80" />
              <YAxis stroke="#ffffff80" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(0, 0, 0, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Bar dataKey="amount" name="Revenue" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Payment Status and Top Customers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Payment Status Pie Chart */}
        <div className="bg-white/5 rounded-lg p-6 border border-white/10">
          <h3 className="text-lg font-medium text-gray-300 mb-4">Payment Status</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Customers */}
        <div className="bg-white/5 rounded-lg p-6 border border-white/10">
          <h3 className="text-lg font-medium text-gray-300 mb-4">Top Customers</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={customerData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                <XAxis type="number" stroke="#ffffff80" />
                <YAxis dataKey="name" type="category" stroke="#ffffff80" width={100} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="amount" name="Amount" fill="#00C49F" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
} 