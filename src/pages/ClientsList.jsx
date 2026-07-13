import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { recordsApi } from '../api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Search, Building2, UserPlus, ChevronRight } from 'lucide-react';

export default function ClientsList() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [newClientModal, setNewClientModal] = useState(false);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    default_currency: 'NGN'
  });

  const loadClients = async () => {
    setLoading(true);
    try {
      const data = await recordsApi.getClients();
      setClients(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  const filteredClients = useMemo(() => {
    return clients.filter(c => 
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      (c.company && c.company.toLowerCase().includes(search.toLowerCase()))
    );
  }, [clients, search]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await recordsApi.createClient(form);
      alert('Client created successfully');
      setNewClientModal(false);
      setForm({ name: '', email: '', company: '', phone: '', default_currency: 'NGN' });
      loadClients();
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Client Hub</h1>
          <p className="text-muted-foreground mt-1">Manage all your customers and their aggregate jobs.</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="relative w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search clients..." 
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button onClick={() => setNewClientModal(true)}>
            <UserPlus className="h-4 w-4 mr-2" /> Add Client
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client Details</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">Loading clients...</TableCell>
                </TableRow>
              ) : filteredClients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">No clients found.</TableCell>
                </TableRow>
              ) : (
                filteredClients.map((client) => (
                  <TableRow 
                    key={client.id} 
                    className="cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => navigate(`/clients/${client.id}`)}
                  >
                    <TableCell>
                      <div className="font-medium text-slate-900">{client.name}</div>
                      <div className="text-xs text-muted-foreground">{client.email} • {client.phone}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-sm">
                        <Building2 className="h-4 w-4 mr-2 text-slate-400" />
                        {client.company || 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                        {client.status || 'Active'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon">
                        <ChevronRight className="h-5 w-5 text-slate-400" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {newClientModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50">
          <Card className="w-[450px]">
            <form onSubmit={handleCreate}>
              <CardContent className="pt-6 space-y-4">
                <h3 className="text-lg font-bold">Add New Client</h3>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Primary Contact Name</label>
                  <Input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Company Name (Optional)</label>
                  <Input value={form.company} onChange={e => setForm({...form, company: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email Address</label>
                    <Input type="email" required value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Phone</label>
                    <Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                  </div>
                </div>
                <div className="flex justify-end space-x-2 pt-4">
                  <Button variant="outline" type="button" onClick={() => setNewClientModal(false)}>Cancel</Button>
                  <Button type="submit">Save Client</Button>
                </div>
              </CardContent>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
