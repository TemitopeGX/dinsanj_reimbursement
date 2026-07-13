import React, { useEffect, useState } from 'react';
import { dashboardApi } from '../api';
import { useStore } from '../store';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Wallet, CheckCircle, FileText, Activity } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalOutstanding: 0,
    totalCollectedAllTime: 0,
    totalInvoicesSent: 0,
    activeJobsCount: 0
  });
  const [loading, setLoading] = useState(true);
  const { settings } = useStore();

  useEffect(() => {
    async function loadStats() {
      try {
        const data = await dashboardApi.getStats();
        setStats(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: settings.default_currency || 'USD'
    }).format(amount || 0);
  };

  if (loading) {
    return <div className="animate-pulse space-y-4">
      <div className="h-10 bg-slate-200 rounded w-1/4"></div>
      <div className="grid grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="h-32 bg-slate-200 rounded"></div>)}
      </div>
    </div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
            <Wallet className="h-4 w-4 text-warning text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(stats.totalOutstanding)}</div>
            <p className="text-xs text-muted-foreground mt-1">Pending payments from clients</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Collected</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{formatCurrency(stats.totalCollectedAllTime)}</div>
            <p className="text-xs text-muted-foreground mt-1">All-time settled reimbursements</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
            <Activity className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeJobsCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Jobs with logged expenses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Invoices Sent</CardTitle>
            <FileText className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalInvoicesSent}</div>
            <p className="text-xs text-muted-foreground mt-1">Total requests processed</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Aging Report (Placeholder for future iteration, waiting on more complex data logic) */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Accounts Receivable Aging</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center">
                <div className="w-16 text-sm font-medium">0-30 Days</div>
                <div className="flex-1 h-2 bg-slate-100 rounded-full mx-4 overflow-hidden">
                  <div className="h-full bg-emerald-400 w-[60%]"></div>
                </div>
                <div className="text-sm text-slate-500">60%</div>
              </div>
              <div className="flex items-center">
                <div className="w-16 text-sm font-medium">31-60 Days</div>
                <div className="flex-1 h-2 bg-slate-100 rounded-full mx-4 overflow-hidden">
                  <div className="h-full bg-yellow-400 w-[25%]"></div>
                </div>
                <div className="text-sm text-slate-500">25%</div>
              </div>
              <div className="flex items-center">
                <div className="w-16 text-sm font-medium">60+ Days</div>
                <div className="flex-1 h-2 bg-slate-100 rounded-full mx-4 overflow-hidden">
                  <div className="h-full bg-red-400 w-[15%]"></div>
                </div>
                <div className="text-sm text-slate-500">15%</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
