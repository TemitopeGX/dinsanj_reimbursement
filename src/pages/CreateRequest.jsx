import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { recordsApi } from '../api';
import { useStore } from '../store';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Plus, Trash2 } from 'lucide-react';

export default function CreateRequest() {
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState([]);
  const [jobs, setJobs] = useState([]);
  const navigate = useNavigate();
  const { settings } = useStore();

  // URL Params parsing
  const params = new URLSearchParams(window.location.search);
  const initialClientId = params.get('client_id') || 'new';

  const [form, setForm] = useState({
    clientId: initialClientId,
    newClientName: '',
    newClientEmail: '',
    jobId: 'new', // 'new' or an existing job ID
    jobRef: '',
    ownRef: '',
    currency: settings.default_currency || 'NGN'
  });

  const [lineItems, setLineItems] = useState([
    { id: 1, description: 'Shipping Invoice', amount: '' },
    { id: 2, description: 'Terminal Invoice', amount: '' }
  ]);

  useEffect(() => {
    Promise.all([recordsApi.getClients(), recordsApi.getJobs()])
      .then(([clientsData, jobsData]) => {
        setClients(clientsData);
        setJobs(jobsData);
      })
      .catch(console.error);
  }, []);

  const clientJobs = jobs.filter(j => j.client_id === form.clientId);

  const addLine = () => {
    setLineItems([...lineItems, { id: Date.now(), description: '', amount: '' }]);
  };

  const updateLine = (id, field, value) => {
    setLineItems(lineItems.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const removeLine = (id) => {
    setLineItems(lineItems.filter(item => item.id !== id));
  };

  const total = lineItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (total <= 0) return alert("Total amount must be greater than 0");
    
    setLoading(true);
    try {
      let clientId = form.clientId;
      
      // 1. Create client if new
      if (clientId === 'new') {
        const clientRes = await recordsApi.createClient({
          name: form.newClientName,
          email: form.newClientEmail,
          default_currency: form.currency
        });
        clientId = clientRes.id;
      }

      // 2. Create or Use Job
      let finalJobId = form.jobId;
      if (finalJobId === 'new') {
        const jobRes = await recordsApi.createJob({
          client_id: clientId,
          job_reference: form.jobRef,
          internal_reference: form.ownRef
        });
        finalJobId = jobRes.id;
      }

      // 3. Create Reimbursement
      const validLines = lineItems.filter(l => l.description && parseFloat(l.amount) > 0);
      await recordsApi.createReimbursement({
        job_id: finalJobId,
        client_id: clientId,
        currency: form.currency,
        line_items: validLines
      });

      navigate('/records');
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Log Reimbursement</h1>
        <p className="text-muted-foreground mt-2">Record expenses and automatically generate an invoice to the client.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Client & Job Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Client</label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.clientId}
                  onChange={e => setForm({...form, clientId: e.target.value})}
                >
                  <option value="new">+ Create New Client</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name} ({c.email})</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Currency</label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.currency}
                  onChange={e => setForm({...form, currency: e.target.value})}
                >
                  <option value="NGN">NGN (Naira)</option>
                  <option value="USD">USD (Dollar)</option>
                  <option value="GBP">GBP (Pounds)</option>
                  <option value="EUR">EUR (Euro)</option>
                </select>
              </div>
            </div>

            {form.clientId === 'new' && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg border">
                <div className="space-y-2">
                  <label className="text-sm font-medium">New Client Name</label>
                  <Input required value={form.newClientName} onChange={e => setForm({...form, newClientName: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">New Client Email</label>
                  <Input type="email" required value={form.newClientEmail} onChange={e => setForm({...form, newClientEmail: e.target.value})} />
                </div>
              </div>
            )}

            {form.clientId !== 'new' && (
              <div className="space-y-2 mt-4">
                <label className="text-sm font-medium">Select Job for {clients.find(c => c.id === form.clientId)?.name}</label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.jobId}
                  onChange={e => setForm({...form, jobId: e.target.value})}
                >
                  <option value="new">+ Create New Job</option>
                  {clientJobs.map(j => <option key={j.id} value={j.id}>{j.job_reference} {j.internal_reference && `(${j.internal_reference})`}</option>)}
                </select>
              </div>
            )}

            {form.jobId === 'new' && (
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">New Job Reference No.</label>
                  <Input required placeholder="e.g. JOB-2026-001" value={form.jobRef} onChange={e => setForm({...form, jobRef: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Internal Reference No. (Optional)</label>
                  <Input placeholder="e.g. INT-992" value={form.ownRef} onChange={e => setForm({...form, ownRef: e.target.value})} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Expense Line Items</CardTitle>
            <CardDescription>Add all third-party invoices paid on behalf of the client for this job.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {lineItems.map((item, index) => (
              <div key={item.id} className="flex gap-4 items-start">
                <div className="flex-1 space-y-2">
                  <label className="text-xs font-medium text-slate-500">Description</label>
                  <Input 
                    placeholder="e.g. Shipping Line Invoice" 
                    value={item.description}
                    onChange={(e) => updateLine(item.id, 'description', e.target.value)}
                  />
                </div>
                <div className="w-48 space-y-2">
                  <label className="text-xs font-medium text-slate-500">Amount ({form.currency})</label>
                  <Input 
                    type="number" 
                    step="0.01" 
                    placeholder="0.00" 
                    value={item.amount}
                    onChange={(e) => updateLine(item.id, 'amount', e.target.value)}
                  />
                </div>
                <div className="pt-6">
                  <Button type="button" variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => removeLine(item.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
            
            <Button type="button" variant="outline" className="w-full mt-2" onClick={addLine}>
              <Plus className="w-4 h-4 mr-2" /> Add Line Item
            </Button>
            
            <div className="flex justify-end pt-6 mt-6 border-t">
              <div className="text-right">
                <p className="text-sm text-slate-500 font-medium mb-1">Total Invoice Amount</p>
                <p className="text-3xl font-bold text-slate-900">{form.currency} {total.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" size="lg" disabled={loading || total <= 0}>
            {loading ? 'Processing...' : 'Save Record'}
          </Button>
        </div>
      </form>
    </div>
  );
}
