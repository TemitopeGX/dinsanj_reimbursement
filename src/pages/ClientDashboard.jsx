import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { recordsApi } from '../api';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { ArrowLeft, Building2, Mail, Phone, Clock, CheckCircle } from 'lucide-react';

export default function ClientDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState(null);
  const [reimbursements, setReimbursements] = useState([]);
  
  // Settings Form State
  const [editForm, setEditForm] = useState({ name: '', company: '', phone: '', email: '' });

  // Edit Job State
  const [editJobModalOpen, setEditJobModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [jobForm, setJobForm] = useState({ job_reference: '', internal_reference: '' });

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [allClients, allReimbursements] = await Promise.all([
          recordsApi.getClients(),
          recordsApi.getReimbursements()
        ]);
        
        const foundClient = allClients.find(c => c.id === id);
        if (foundClient) {
          setClient(foundClient);
          setEditForm({
            name: foundClient.name,
            company: foundClient.company || '',
            phone: foundClient.phone || '',
            email: foundClient.email || ''
          });
        }
        
        // Filter reimbursements for this client only
        const clientReimbursements = allReimbursements.filter(r => r.client_id === id);
        setReimbursements(clientReimbursements);
        
      } catch (error) {
        console.error("Failed to load client data", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  // Aggregate Data for Charts
  const chartData = useMemo(() => {
    // Group by month
    const monthlyData = {};
    reimbursements.forEach(r => {
      const date = new Date(r.created_at);
      const monthYear = format(date, 'MMM yyyy');
      
      if (!monthlyData[monthYear]) {
        monthlyData[monthYear] = { name: monthYear, TotalBilled: 0, TotalPaid: 0 };
      }
      
      monthlyData[monthYear].TotalBilled += parseFloat(r.total_amount);
      monthlyData[monthYear].TotalPaid += parseFloat(r.amount_paid);
    });
    
    // Sort chronologically (simple sort assuming recent data)
    return Object.values(monthlyData).reverse(); 
  }, [reimbursements]);

  const stats = useMemo(() => {
    let totalBilled = 0;
    let totalPaid = 0;
    reimbursements.forEach(r => {
      totalBilled += parseFloat(r.total_amount);
      totalPaid += parseFloat(r.amount_paid);
    });
    return {
      totalBilled,
      totalPaid,
      outstanding: totalBilled - totalPaid,
      jobCount: reimbursements.length
    };
  }, [reimbursements]);

  const handleUpdateSettings = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await recordsApi.updateClient({ id: client.id, ...editForm });
      alert("Client settings updated successfully!");
      setClient({ ...client, ...editForm });
    } catch (err) {
      alert("Error updating client: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateJob = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await recordsApi.updateJob({ 
        id: selectedJob.job_id, 
        job_reference: jobForm.job_reference, 
        internal_reference: jobForm.internal_reference 
      });
      alert("Job updated successfully!");
      setEditJobModalOpen(false);
      // Reload page to get new job reference in all tables
      window.location.reload();
    } catch (err) {
      alert("Error updating job: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const StatusBadge = ({ status }) => {
    switch(status) {
      case 'Paid':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800"><CheckCircle className="w-3 h-3 mr-1"/> Paid</span>;
      case 'Partially Paid':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1"/> Partial</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800"><Clock className="w-3 h-3 mr-1"/> Pending</span>;
    }
  };

  if (loading) return <div className="p-8">Loading client data...</div>;
  if (!client) return <div className="p-8">Client not found.</div>;

  const currency = client.default_currency || 'NGN';
  const formatMoney = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(val);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 pb-4 border-b">
        <Button variant="ghost" size="icon" onClick={() => navigate('/clients')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{client.company || client.name}</h1>
          <div className="flex items-center text-sm text-muted-foreground mt-1 space-x-4">
            <span className="flex items-center"><Building2 className="w-4 h-4 mr-1"/> {client.name}</span>
            <span className="flex items-center"><Mail className="w-4 h-4 mr-1"/> {client.email}</span>
            {client.phone && <span className="flex items-center"><Phone className="w-4 h-4 mr-1"/> {client.phone}</span>}
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview & Analytics</TabsTrigger>
          <TabsTrigger value="jobs">Jobs & Invoices</TabsTrigger>
          <TabsTrigger value="settings">Client Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Stats Row */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Total Billed</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-slate-900">{formatMoney(stats.totalBilled)}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Total Paid</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-emerald-600">{formatMoney(stats.totalPaid)}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Outstanding Balance</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-orange-600">{formatMoney(stats.outstanding)}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Total Jobs</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{stats.jobCount}</div></CardContent>
            </Card>
          </div>

          {/* Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Financial History</CardTitle>
              <CardDescription>Monthly breakdown of invoiced amounts vs received payments for this client.</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(val) => `${val / 1000}k`} />
                    <RechartsTooltip formatter={(val) => formatMoney(val)} />
                    <Legend />
                    <Bar dataKey="TotalBilled" name="Total Billed" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="TotalPaid" name="Total Paid" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">No financial data available yet.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="jobs">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle>Jobs & Invoices</CardTitle>
                <CardDescription>A filtered view of all operations associated with {client.company || client.name}.</CardDescription>
              </div>
              <Button onClick={() => navigate(`/create?client_id=${client.id}`)} size="sm">
                Add Invoice
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Job Reference</TableHead>
                    <TableHead>Amount Due</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reimbursements.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center h-24 text-muted-foreground">No jobs recorded for this client.</TableCell></TableRow>
                  ) : (
                    reimbursements.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>{format(new Date(record.created_at), 'MMM d, yyyy')}</TableCell>
                        <TableCell className="font-medium">{record.job_reference} {record.internal_reference && <span className="text-muted-foreground text-xs ml-1">({record.internal_reference})</span>}</TableCell>
                        <TableCell className="font-bold">{formatMoney(record.total_amount)}</TableCell>
                        <TableCell><StatusBadge status={record.derived_status} /></TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedJob(record);
                              setJobForm({ job_reference: record.job_reference, internal_reference: record.internal_reference || '' });
                              setEditJobModalOpen(true);
                            }}
                          >
                            Edit Ref
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle>Client Settings</CardTitle>
              <CardDescription>Update contact information. (If you use multiple emails in Outlook, you can just paste them there later).</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateSettings} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Primary Contact Name</label>
                  <Input value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Company Name</label>
                  <Input value={editForm.company} onChange={e => setEditForm({...editForm, company: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Contact Emails (Comma separated)</label>
                  <Input value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} />
                  <p className="text-xs text-muted-foreground">e.g. billing@company.com, ceo@company.com</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Phone</label>
                  <Input value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} />
                </div>
                <div className="pt-4">
                  <Button type="submit">Save Changes</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Job Modal */}
      {editJobModalOpen && selectedJob && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50">
          <Card className="w-[450px]">
            <form onSubmit={handleUpdateJob}>
              <CardHeader>
                <CardTitle>Edit Job Reference</CardTitle>
                <CardDescription>Update the display identifiers for this job.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Job Reference</label>
                  <Input required value={jobForm.job_reference} onChange={e => setJobForm({...jobForm, job_reference: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Internal Reference (Optional)</label>
                  <Input value={jobForm.internal_reference} onChange={e => setJobForm({...jobForm, internal_reference: e.target.value})} />
                </div>
                <div className="flex justify-end space-x-2 pt-4">
                  <Button variant="outline" type="button" onClick={() => setEditJobModalOpen(false)}>Cancel</Button>
                  <Button type="submit">Save Changes</Button>
                </div>
              </CardContent>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
