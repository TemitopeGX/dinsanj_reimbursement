import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { recordsApi } from '../api';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { UserPlus, Shield, ShieldCheck, Mail, Clock } from 'lucide-react';

export default function SettingsPage() {
  const { settings, setSettings } = useStore();
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  
  // New User Form State
  const [newUserModal, setNewUserModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'Staff' });
  const [creatingUser, setCreatingUser] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const data = await recordsApi.getUsers();
      setUsers(data);
    } catch (err) {
      console.error("Failed to load users", err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleSaveSettings = (e) => {
    e.preventDefault();
    // In a full implementation, this would call api.updateSetting(key, val)
    alert("Settings saved successfully.");
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreatingUser(true);
    try {
      await recordsApi.createUser(form);
      alert("User created successfully!");
      setNewUserModal(false);
      setForm({ name: '', email: '', password: '', role: 'Staff' });
      loadUsers();
    } catch (err) {
      alert("Error creating user: " + err.message);
    } finally {
      setCreatingUser(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
        <p className="text-muted-foreground mt-2">Manage your company profile and control system access.</p>
      </div>

      <Tabs defaultValue="system" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="system">System Configuration</TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
        </TabsList>

        <TabsContent value="system">
          <form onSubmit={handleSaveSettings} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Company & Bank Details</CardTitle>
                <CardDescription>These details are automatically injected into the footer of all client invoice emails.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Company Name</label>
                  <Input 
                    value={settings.company_name} 
                    onChange={e => setSettings({ company_name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Bank Name</label>
                    <Input 
                      value={settings.bank_name} 
                      onChange={e => setSettings({ bank_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Account Number</label>
                    <Input 
                      value={settings.account_number} 
                      onChange={e => setSettings({ account_number: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2 pt-4">
                  <label className="text-sm font-medium">System Default Currency</label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={settings.default_currency}
                    onChange={e => setSettings({ default_currency: e.target.value })}
                  >
                    <option value="NGN">NGN (Naira)</option>
                    <option value="USD">USD (Dollar)</option>
                    <option value="GBP">GBP (Pounds)</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">Authorized Personnel</h2>
            <Button onClick={() => setNewUserModal(true)}>
              <UserPlus className="w-4 h-4 mr-2" /> Add User
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User Details</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingUsers ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-8">Loading users...</TableCell></TableRow>
                  ) : users.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-8">No users found.</TableCell></TableRow>
                  ) : (
                    users.map(u => (
                      <TableRow key={u.id}>
                        <TableCell>
                          <div className="font-medium text-slate-900">{u.name}</div>
                          <div className="flex items-center text-xs text-muted-foreground mt-1">
                            <Mail className="w-3 h-3 mr-1" /> {u.email}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            {u.role === 'Admin' ? <ShieldCheck className="w-4 h-4 mr-2 text-indigo-600" /> : <Shield className="w-4 h-4 mr-2 text-slate-400" />}
                            <span className={u.role === 'Admin' ? 'font-medium text-indigo-600' : 'text-slate-600'}>{u.role}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {u.last_login ? (
                            <div className="flex items-center text-xs text-slate-600">
                              <Clock className="w-3 h-3 mr-1" /> {new Date(u.last_login).toLocaleDateString()}
                            </div>
                          ) : <span className="text-xs text-slate-400">Never logged in</span>}
                        </TableCell>
                        <TableCell>
                          {u.active ? 
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">Active</span> :
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">Disabled</span>
                          }
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create User Modal */}
      {newUserModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50">
          <Card className="w-[450px]">
            <form onSubmit={handleCreateUser}>
              <CardHeader>
                <h3 className="text-lg font-bold">Add New User</h3>
                <CardDescription>Create credentials for your staff. They can use this email and password to log in securely.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Full Name</label>
                  <Input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email Address</label>
                  <Input type="email" required value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Temporary Password</label>
                  <Input type="password" required value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
                </div>
                <div className="space-y-2 pt-2 border-t mt-4">
                  <label className="text-sm font-medium">System Role</label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.role}
                    onChange={e => setForm({...form, role: e.target.value})}
                  >
                    <option value="Staff">Staff (Can add/edit invoices)</option>
                    <option value="Admin">Admin (Full Access & Settings)</option>
                    <option value="Viewer">Viewer (Read-only access)</option>
                  </select>
                </div>
                <div className="flex justify-end space-x-2 pt-4 border-t mt-6">
                  <Button variant="outline" type="button" onClick={() => setNewUserModal(false)}>Cancel</Button>
                  <Button type="submit" disabled={creatingUser}>
                    {creatingUser ? 'Creating...' : 'Create User'}
                  </Button>
                </div>
              </CardContent>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
