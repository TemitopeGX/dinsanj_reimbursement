import React, { useState, useEffect, useMemo } from 'react';
import { recordsApi } from '../api';
import { useStore } from '../store';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Search, Mail, CheckCircle, Clock, Copy, ExternalLink, Edit, Plus, Trash2, Banknote, Printer } from 'lucide-react';
import { format } from 'date-fns';

export default function Records() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Payment Modal
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  
  // Invoice Modal (Email)
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  
  // Edit Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editLines, setEditLines] = useState([]);
  
  const { settings } = useStore();

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await recordsApi.getReimbursements();
      setRecords(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePayment = async (e) => {
    e.preventDefault();
    try {
      await recordsApi.addPayment({
        reimbursement_id: selectedRecord.id,
        amount_received: paymentAmount,
        notes: paymentNotes
      });
      alert('Payment recorded successfully');
      setPaymentModalOpen(false);
      setPaymentAmount('');
      setPaymentNotes('');
      loadData();
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    try {
      const validLines = editLines.filter(l => l.description && parseFloat(l.amount) > 0);
      await recordsApi.updateReimbursement({
        id: selectedRecord.id,
        line_items: validLines
      });
      alert('Invoice updated successfully');
      setEditModalOpen(false);
      loadData();
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const generateInvoiceText = (record) => {
    let text = `Hello ${record.client_name},\n\n`;
    text += `This is an official request for reimbursement regarding out-of-pocket expenses paid on your behalf for the following references:\n\n`;
    text += `Job Reference: ${record.job_reference}\n`;
    if (record.internal_reference) text += `Our Reference: ${record.internal_reference}\n`;
    
    text += `\nBreakdown of expenses:\n`;
    let remainingTotal = 0;
    record.line_items.forEach(item => {
      if(item.description && parseFloat(item.amount) > 0 && !item.paid) {
        remainingTotal += parseFloat(item.amount);
        text += `- ${item.description}: ${record.currency} ${parseFloat(item.amount).toLocaleString(undefined, {minimumFractionDigits: 2})}\n`;
      }
    });
    
    text += `--------------------------------------\n`;
    text += `Total Amount Due: ${record.currency} ${remainingTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}\n\n`;
    
    text += `Payment Instructions:\n`;
    text += `Kindly transfer the funds into the following account and find the attached invoices for your reference.\n\n`;
    text += `Account Name: ${settings.company_name}\n`;
    text += `Bank: ${settings.bank_name}\n`;
    text += `Account Number: ${settings.account_number}\n\n`;
    text += `Thank you for your prompt payment.`;
    
    return text;
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      alert("Invoice text copied to clipboard! You can now paste it into Outlook.");
    } catch (err) {
      alert("Failed to copy text. Please select and copy manually.");
    }
  };

  const StatusBadge = ({ status }) => {
    switch(status) {
      case 'Paid':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800"><CheckCircle className="w-4 h-4 mr-1"/> Paid</span>;
      case 'Partially Paid':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"><Clock className="w-4 h-4 mr-1"/> Partial</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800"><Clock className="w-4 h-4 mr-1"/> Pending</span>;
    }
  };

  const filteredRecords = useMemo(() => {
    return records.filter(r => 
      r.client_name.toLowerCase().includes(search.toLowerCase()) ||
      r.job_reference.toLowerCase().includes(search.toLowerCase())
    );
  }, [records, search]);

  const pendingRecords = filteredRecords.filter(r => r.derived_status !== 'Paid');
  const paidRecords = filteredRecords.filter(r => r.derived_status === 'Paid');

  // Group for print view
  const groupedByClient = useMemo(() => {
    const groups = {};
    pendingRecords.forEach(r => {
      if (!groups[r.client_name]) groups[r.client_name] = [];
      groups[r.client_name].push(r);
    });
    // Sort clients alphabetically
    return Object.keys(groups).sort().map(clientName => ({
      clientName,
      records: groups[clientName]
    }));
  }, [pendingRecords]);

  const RecordTable = ({ data }) => (
    <CardContent className="p-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Client & Job</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow><TableCell colSpan={5} className="text-center h-24 text-muted-foreground">Loading records...</TableCell></TableRow>
          ) : data.length === 0 ? (
            <TableRow><TableCell colSpan={5} className="text-center h-24 text-muted-foreground">No invoices found.</TableCell></TableRow>
          ) : (
            data.map((record) => (
              <TableRow key={record.id}>
                <TableCell className="text-sm">{format(new Date(record.created_at), 'MMM d, yyyy')}</TableCell>
                <TableCell>
                  <div className="font-medium text-slate-900">{record.client_name}</div>
                  <div className="text-xs text-muted-foreground">{record.job_reference} {record.internal_reference && `(${record.internal_reference})`}</div>
                </TableCell>
                <TableCell>
                  <div className="font-bold text-slate-900">
                    {record.currency} {parseFloat(record.total_amount).toLocaleString()}
                  </div>
                  {record.amount_paid > 0 && record.derived_status !== 'Paid' && (
                    <div className="text-xs text-emerald-600 font-medium">
                      Paid: {parseFloat(record.amount_paid).toLocaleString()}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <StatusBadge status={record.derived_status} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end space-x-2">
                    <Button 
                      variant="secondary" 
                      size="icon"
                      onClick={() => { setSelectedRecord(record); setInvoiceModalOpen(true); }}
                      title="Generate Email Invoice"
                    >
                      <Mail className="h-4 w-4 text-slate-600" />
                    </Button>
                    {record.derived_status !== 'Paid' && (
                      <>
                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={() => { 
                            setSelectedRecord(record); 
                            setEditLines(record.line_items || []);
                            setEditModalOpen(true); 
                          }}
                          title="Edit Invoice"
                        >
                          <Edit className="h-4 w-4 text-blue-600" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={() => { 
                            setSelectedRecord(record); 
                            setPaymentAmount(''); 
                            setPaymentNotes('');
                            setPaymentModalOpen(true); 
                          }}
                          title="Add Payment"
                        >
                          <Banknote className="h-4 w-4 text-emerald-600" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </CardContent>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center print:hidden">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invoice Management</h1>
          <p className="text-muted-foreground mt-1">Manage all pending and paid invoices.</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="relative w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search client or job ref..." 
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <Tabs defaultValue="pending" className="w-full print:hidden">
        <TabsList className="mb-4">
          <TabsTrigger value="pending">Pending / Partial ({pendingRecords.length})</TabsTrigger>
          <TabsTrigger value="paid">Fully Paid ({paidRecords.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="w-4 h-4 mr-2" /> Print Outstanding Report
            </Button>
          </div>
          <Card><RecordTable data={pendingRecords} /></Card>
        </TabsContent>

        <TabsContent value="paid">
          <Card><RecordTable data={paidRecords} /></Card>
        </TabsContent>
      </Tabs>

      {/* Payment Modal */}
      {paymentModalOpen && selectedRecord && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50">
          <Card className="w-[450px]">
            <form onSubmit={handlePayment}>
              <CardHeader>
                <h3 className="text-lg font-bold">Record Payment</h3>
                <p className="text-sm text-slate-500">For Job: {selectedRecord.job_reference}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Quick Select Line Item</label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-slate-600"
                    onChange={(e) => {
                      if(e.target.value) {
                        const item = selectedRecord.line_items.find(l => l.description === e.target.value);
                        if(item) {
                          setPaymentAmount(item.amount);
                          setPaymentNotes(`Payment for ${item.description}`);
                        }
                      }
                    }}
                  >
                    <option value="">-- Choose specific item to mark as paid --</option>
                    {selectedRecord.line_items.map((item, idx) => (
                      <option key={idx} value={item.description}>{item.description} ({selectedRecord.currency} {parseFloat(item.amount).toLocaleString()})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2 pt-2 border-t">
                  <label className="text-sm font-medium">Payment Amount ({selectedRecord.currency})</label>
                  <Input type="number" step="0.01" required value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Notes (Optional)</label>
                  <Input placeholder="e.g. Paid via Bank Transfer" value={paymentNotes} onChange={e => setPaymentNotes(e.target.value)} />
                </div>
                <div className="flex justify-end space-x-2 pt-4">
                  <Button variant="outline" type="button" onClick={() => setPaymentModalOpen(false)}>Cancel</Button>
                  <Button type="submit">Save Payment</Button>
                </div>
              </CardContent>
            </form>
          </Card>
        </div>
      )}

      {/* Edit Invoice Modal */}
      {editModalOpen && selectedRecord && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50">
          <Card className="w-[600px] max-w-[90vw] max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSaveEdit}>
              <CardHeader>
                <h3 className="text-lg font-bold">Edit Invoice</h3>
                <p className="text-sm text-slate-500">Ref: {selectedRecord.job_reference} | Total adjustments will affect outstanding balance.</p>
              </CardHeader>
              <CardContent className="space-y-4">
                {editLines.map((item, index) => (
                  <div key={item.id || index} className="flex gap-4 items-start">
                    <div className="flex-1 space-y-2">
                      <Input 
                        placeholder="Description" 
                        value={item.description}
                        onChange={(e) => setEditLines(editLines.map((l, i) => i === index ? { ...l, description: e.target.value } : l))}
                      />
                    </div>
                    <div className="w-40 space-y-2">
                      <Input 
                        type="number" step="0.01" placeholder="Amount" 
                        value={item.amount}
                        onChange={(e) => setEditLines(editLines.map((l, i) => i === index ? { ...l, amount: e.target.value } : l))}
                      />
                    </div>
                    <div className="flex items-center pt-2 space-x-2">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        checked={item.paid || false}
                        onChange={(e) => setEditLines(editLines.map((l, i) => i === index ? { ...l, paid: e.target.checked } : l))}
                      />
                      <label className="text-sm font-medium text-slate-700">Paid</label>
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="text-destructive mt-1" onClick={() => setEditLines(editLines.filter((_, i) => i !== index))}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                
                <Button type="button" variant="outline" className="w-full mt-2" onClick={() => setEditLines([...editLines, { id: Date.now(), description: '', amount: '' }])}>
                  <Plus className="w-4 h-4 mr-2" /> Add New Line Item
                </Button>
                
                <div className="flex justify-between items-center pt-6 border-t mt-6">
                  <div className="text-lg font-bold">
                    New Total: {selectedRecord.currency} {editLines.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0).toLocaleString()}
                  </div>
                  <div className="space-x-2">
                    <Button variant="outline" type="button" onClick={() => setEditModalOpen(false)}>Cancel</Button>
                    <Button type="submit">Save Invoice</Button>
                  </div>
                </div>
              </CardContent>
            </form>
          </Card>
        </div>
      )}

      {/* Invoice Generator Modal */}
      {invoiceModalOpen && selectedRecord && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50">
          <Card className="w-[600px] max-w-[90vw]">
            <CardHeader>
              <h3 className="text-lg font-bold">Email Invoice Generator</h3>
              <p className="text-sm text-slate-500">Copy this text into Outlook and attach your PDFs manually.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-md border text-sm font-mono whitespace-pre-wrap h-[300px] overflow-y-auto">
                {generateInvoiceText(selectedRecord)}
              </div>
              <div className="flex justify-between items-center pt-4">
                <Button variant="outline" onClick={() => setInvoiceModalOpen(false)}>Close</Button>
                <div className="space-x-2 flex">
                  <Button 
                    variant="default" 
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => {
                      const subject = encodeURIComponent(`Reimbursement Invoice - Ref: ${selectedRecord.job_reference}`);
                      window.open(`mailto:${selectedRecord.client_email}?subject=${subject}`);
                    }}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" /> Open Mail App
                  </Button>
                  <Button 
                    variant="default" 
                    onClick={() => copyToClipboard(generateInvoiceText(selectedRecord))}
                  >
                    <Copy className="w-4 h-4 mr-2" /> Copy Text
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* PRINT VIEW - Only visible when printing */}
      <div className="hidden print:block p-8 space-y-6">
        <div className="text-center pb-6 border-b-2 border-slate-900">
          <h1 className="text-3xl font-bold uppercase tracking-wider">{settings.company_name || 'COMPANY'}</h1>
          <h2 className="text-xl text-slate-600 mt-2">Outstanding Payments Report</h2>
          <p className="text-sm text-slate-500 mt-1">Generated: {format(new Date(), 'MMMM d, yyyy')}</p>
        </div>

        {groupedByClient.map(group => (
          <div key={group.clientName} className="mb-10 page-break-inside-avoid">
            <h3 className="text-xl font-bold bg-slate-200 p-2 mb-4 border border-slate-300">{group.clientName}</h3>
            
            {group.records.map(record => {
              const outstanding = parseFloat(record.total_amount) - parseFloat(record.amount_paid);
              const unpaidLines = record.line_items.filter(item => item.description && parseFloat(item.amount) > 0 && !item.paid);
              
              return (
                <div key={record.id} className="mb-6 ml-4 border-l-2 border-slate-300 pl-4">
                  <div className="flex justify-between items-center mb-2 pb-1 border-b border-slate-200">
                    <div className="font-bold text-lg">
                      <span className="text-slate-500 mr-2">{format(new Date(record.created_at), 'MMM d, yy')}</span>
                      {record.job_reference} {record.internal_reference && <span className="text-slate-500 font-normal ml-1">({record.internal_reference})</span>}
                    </div>
                    <div className="font-bold text-lg text-slate-800 bg-slate-100 px-3 py-1 rounded">
                      Outstanding: {record.currency} {outstanding.toLocaleString(undefined, {minimumFractionDigits: 2})}
                    </div>
                  </div>
                  
                  <div className="space-y-1 mt-2">
                    {unpaidLines.map((line, idx) => (
                      <div key={idx} className="flex items-end text-sm pl-2 pt-1">
                        <div className="flex items-center space-x-3">
                          <div className="w-4 h-4 border-2 border-slate-400 rounded-sm flex-shrink-0"></div>
                          <span className="font-medium text-slate-700 uppercase tracking-wide">{line.description}</span>
                        </div>
                        <div className="flex-1 border-b-2 border-dotted border-slate-300 mb-1 mx-4"></div>
                        <span className="font-medium text-slate-900 whitespace-nowrap text-right min-w-[120px]">
                          {record.currency} {parseFloat(line.amount).toLocaleString(undefined, {minimumFractionDigits: 2})}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        
        {groupedByClient.length === 0 && (
          <div className="py-8 text-center text-slate-500 italic">No outstanding payments to report.</div>
        )}

        <div className="mt-16 pt-8 border-t border-slate-300 flex justify-between text-sm">
          <div>
            <p className="font-bold">Total Outstanding Records: {pendingRecords.length}</p>
          </div>
          <div className="space-y-4">
            <p>Reviewed By: ___________________________</p>
            <p>Date: ___________________________</p>
          </div>
        </div>
      </div>

    </div>
  );
}
