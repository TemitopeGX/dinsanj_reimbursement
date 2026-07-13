// =========================================================================
// CONFIGURATION & UTILITIES
// =========================================================================

// CHANGE THIS string to something secure for your specific deployment
const SCRIPT_SECRET = "DINSANJ_SECURE_SALT_2026"; 

function getSheet(sheetName) {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
}

function generateId() {
  return Utilities.getUuid();
}

function hashPassword(password) {
  const rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password + SCRIPT_SECRET);
  return rawHash.map(function(byte) {
    var v = (byte < 0) ? 256 + byte : byte;
    return ("0" + v.toString(16)).slice(-2);
  }).join("");
}

function generateToken(userId, role) {
  const payload = Utilities.base64Encode(JSON.stringify({ userId, role, exp: Date.now() + 86400000 })); // 24hr expiration
  const signature = hashPassword(payload);
  return payload + "." + signature;
}

function verifyToken(token) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  if (hashPassword(parts[0]) !== parts[1]) return null;
  
  const decodedBytes = Utilities.base64Decode(parts[0]);
  const decodedString = Utilities.newBlob(decodedBytes).getDataAsString();
  const payload = JSON.parse(decodedString);
  
  if (Date.now() > payload.exp) return null;
  return payload;
}

function requireRole(tokenPayload, allowedRoles) {
  if (!tokenPayload) throw new Error("Unauthorized");
  if (!allowedRoles.includes(tokenPayload.role)) throw new Error("Forbidden: Insufficient permissions");
}

function logAudit(userId, action, entityType, entityId, details) {
  const sheet = getSheet('AuditLog');
  if(sheet) {
    sheet.appendRow([
      generateId(), 
      userId, 
      action, 
      entityType, 
      entityId, 
      JSON.stringify(details || {}), 
      new Date().toISOString()
    ]);
  }
}

// =========================================================================
// INITIAL SETUP (Run this manually once from the editor)
// =========================================================================

function setupDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = [
    { name: 'Clients', headers: ['id', 'name', 'company', 'email', 'phone', 'default_currency', 'created_date', 'status'] },
    { name: 'Jobs', headers: ['id', 'client_id', 'job_reference', 'internal_reference', 'description', 'created_date', 'status'] },
    { name: 'Reimbursements', headers: ['id', 'job_id', 'client_id', 'line_items', 'total_amount', 'currency', 'date_incurred', 'notes', 'status', 'created_by', 'created_at', 'updated_at'] },
    { name: 'Payments', headers: ['id', 'reimbursement_id', 'amount_received', 'date_received', 'method', 'recorded_by', 'notes'] },
    { name: 'EmailLog', headers: ['id', 'related_record_id', 'recipient', 'subject', 'type', 'sent_at', 'status', 'triggered_by'] },
    { name: 'Users', headers: ['id', 'name', 'email', 'role', 'password_hash', 'active', 'last_login'] },
    { name: 'AuditLog', headers: ['id', 'user_id', 'action', 'entity_type', 'entity_id', 'details', 'timestamp'] },
    { name: 'Settings', headers: ['key', 'value'] }
  ];

  sheets.forEach(s => {
    let sheet = ss.getSheetByName(s.name);
    if (!sheet) {
      sheet = ss.insertSheet(s.name);
      sheet.appendRow(s.headers);
      sheet.getRange(1, 1, 1, s.headers.length).setFontWeight('bold');
    }
  });

  // Create default admin if missing
  const userSheet = ss.getSheetByName('Users');
  if (userSheet.getLastRow() <= 1) {
    const defaultPassword = "password123"; // CHANGE THIS LATER!
    userSheet.appendRow([generateId(), 'System Admin', 'admin@dinsanj.com', 'Admin', hashPassword(defaultPassword), 'TRUE', '']);
  }
  
  // Set default settings
  const settingsSheet = ss.getSheetByName('Settings');
  if (settingsSheet.getLastRow() <= 1) {
    const defaultSettings = [
      ['default_currency', 'NGN'],
      ['company_name', 'DINSANJ VENTURES LIMITED'],
      ['bank_name', 'UNION BANK PLC'],
      ['account_number', '0118921942']
    ];
    defaultSettings.forEach(row => settingsSheet.appendRow(row));
  }
}

// =========================================================================
// MAIN ROUTER / API ENDPOINT
// =========================================================================

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({ status: 'API is running successfully. Please use POST.' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  if (!e || !e.postData) {
    return ContentService.createTextOutput("Access denied. Direct editor execution is disabled.").setMimeType(ContentService.MimeType.TEXT);
  }

  try {
    const request = JSON.parse(e.postData.contents);
    const action = request.action;
    const payload = request.payload || {};
    const token = request.token;
    
    let result = null;
    let user = null;
    
    // PUBLIC ENDPOINTS
    if (action === 'login') {
      result = loginUser(payload.email, payload.password);
    } 
    // PROTECTED ENDPOINTS
    else {
      user = verifyToken(token);
      if (!user) throw new Error("Invalid or expired authentication token. Please log in again.");
      
      switch(action) {
        case 'getDashboardData':
          requireRole(user, ['Admin', 'Staff', 'Viewer']);
          result = getDashboardData();
          break;
        case 'getClients':
          requireRole(user, ['Admin', 'Staff', 'Viewer']);
          result = getTableData('Clients');
          break;
        case 'getJobs':
          requireRole(user, ['Admin', 'Staff', 'Viewer']);
          result = getTableData('Jobs');
          break;
        case 'getReimbursements':
          requireRole(user, ['Admin', 'Staff', 'Viewer']);
          result = getReimbursements();
          break;
        case 'createClient':
          requireRole(user, ['Admin', 'Staff']);
          result = createClient(user.userId, payload);
          break;
        case 'createJob':
          requireRole(user, ['Admin', 'Staff']);
          result = createJob(user.userId, payload);
          break;
        case 'updateJob':
          requireRole(user, ['Admin', 'Staff']);
          result = updateJob(user.userId, payload);
          break;
        case 'createReimbursement':
          requireRole(user, ['Admin', 'Staff']);
          result = createReimbursement(user.userId, payload);
          break;
        case 'updateClient':
          requireRole(user, ['Admin', 'Staff']);
          result = updateClient(user.userId, payload);
          break;
        case 'updateReimbursement':
          requireRole(user, ['Admin', 'Staff']);
          result = updateReimbursement(user.userId, payload);
          break;
        case 'addPayment':
          requireRole(user, ['Admin', 'Staff']);
          result = addPayment(user.userId, payload);
          break;
        case 'getUsers':
          requireRole(user, ['Admin']);
          result = getUsers(user.userId);
          break;
        case 'createUser':
          requireRole(user, ['Admin']);
          result = createUser(user.userId, payload);
          break;
        case 'sendReminder':
          requireRole(user, ['Admin', 'Staff']);
          result = sendReminder(user.userId, payload.reimbursementId);
          break;
        default:
          throw new Error("Unknown action: " + action);
      }
    }

    return ContentService.createTextOutput(JSON.stringify({ success: true, data: result }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// =========================================================================
// SERVICES
// =========================================================================

function loginUser(email, password) {
  const sheet = getSheet('Users');
  const data = sheet.getDataRange().getValues();
  
  const hashedInput = hashPassword(password);
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[2].toLowerCase() === email.toLowerCase() && row[4] === hashedInput && row[5] === true) { // active
      // Update last login
      sheet.getRange(i + 1, 7).setValue(new Date().toISOString());
      
      const token = generateToken(row[0], row[3]);
      return { 
        token, 
        user: { id: row[0], name: row[1], email: row[2], role: row[3] } 
      };
    }
  }
  throw new Error("Invalid email or password");
}

function getTableData(sheetName) {
  const sheet = getSheet(sheetName);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const results = [];
  
  for (let i = 1; i < data.length; i++) {
    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = data[i][j];
    }
    results.push(obj);
  }
  return results.reverse();
}

function getUsers(adminId) {
  const users = getTableData('Users');
  // Strip out password hashes for security
  return users.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    active: u.active,
    last_login: u.last_login
  }));
}

function createUser(adminId, payload) {
  if (!payload.name || !payload.email || !payload.password || !payload.role) {
    throw new Error("Name, Email, Password, and Role are required");
  }
  
  // Check for duplicates
  const users = getTableData('Users');
  if (users.some(u => u.email.toLowerCase() === payload.email.toLowerCase())) {
    throw new Error("A user with this email already exists.");
  }
  
  const id = generateId();
  const hashedPass = hashPassword(payload.password);
  
  getSheet('Users').appendRow([
    id, payload.name, payload.email, payload.role, hashedPass, 'TRUE', ''
  ]);
  
  logAudit(adminId, 'CREATE_USER', 'Users', id, null, { name: payload.name, role: payload.role });
  return { id, message: "User created successfully" };
}

function getReimbursements() {
  const reimbursements = getTableData('Reimbursements');
  const clients = getTableData('Clients');
  const jobs = getTableData('Jobs');
  const payments = getTableData('Payments');
  
  // Join data manually for the frontend
  return reimbursements.map(r => {
    const client = clients.find(c => c.id === r.client_id) || {};
    const job = jobs.find(j => j.id === r.job_id) || {};
    const relatedPayments = payments.filter(p => p.reimbursement_id === r.id);
    const amountPaid = relatedPayments.reduce((sum, p) => sum + parseFloat(p.amount_received || 0), 0);
    
    // Auto-derive status based on payments
    let derivedStatus = 'Pending';
    const total = parseFloat(r.total_amount);
    if (amountPaid >= total) {
      derivedStatus = 'Paid';
    } else if (amountPaid > 0) {
      derivedStatus = 'Partially Paid';
    }

    return {
      ...r,
      client_name: client.name || 'Unknown Client',
      client_email: client.email || '',
      job_reference: job.job_reference || 'Unknown Job',
      internal_reference: job.internal_reference || '',
      amount_paid: amountPaid,
      derived_status: derivedStatus,
      line_items: JSON.parse(r.line_items || '[]')
    };
  });
}

function getDashboardData() {
  const reimbursements = getReimbursements();
  
  let totalOutstanding = 0;
  let totalCollectedAllTime = 0;
  let activeJobs = new Set();
  
  reimbursements.forEach(r => {
    totalCollectedAllTime += r.amount_paid;
    if (r.derived_status !== 'Paid') {
      totalOutstanding += (parseFloat(r.total_amount) - r.amount_paid);
    }
    activeJobs.add(r.job_id);
  });
  
  return {
    totalOutstanding,
    totalCollectedAllTime,
    totalInvoicesSent: reimbursements.length,
    activeJobsCount: activeJobs.size
  };
}

function createClient(userId, payload) {
  if (!payload.name || !payload.email) throw new Error("Name and Email required");
  const id = generateId();
  getSheet('Clients').appendRow([
    id, payload.name, payload.company || '', payload.email, payload.phone || '', 
    payload.default_currency || 'NGN', new Date().toISOString(), 'Active'
  ]);
  logAudit(userId, 'CREATE_CLIENT', 'Clients', id, null, payload.name);
  return { id, message: "Client created successfully" };
}

function updateClient(userId, payload) {
  if (!payload.id) throw new Error("Client ID required");
  const sheet = getSheet('Clients');
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === payload.id) {
      if (payload.name) sheet.getRange(i + 1, 2).setValue(payload.name);
      if (payload.company !== undefined) sheet.getRange(i + 1, 3).setValue(payload.company);
      if (payload.email) sheet.getRange(i + 1, 4).setValue(payload.email);
      if (payload.phone !== undefined) sheet.getRange(i + 1, 5).setValue(payload.phone);
      logAudit(userId, 'UPDATE_CLIENT', 'Clients', payload.id, null, payload);
      return { id: payload.id, message: "Client updated successfully" };
    }
  }
  throw new Error("Client not found");
}

function createJob(userId, payload) {
  if (!payload.client_id || !payload.job_reference) throw new Error("Client and Job Reference required");
  
  // Check for duplicates
  const existing = getTableData('Jobs');
  if (existing.some(j => j.job_reference === payload.job_reference)) {
    throw new Error("Job Reference already exists");
  }

  const id = generateId();
  getSheet('Jobs').appendRow([
    id, payload.client_id, payload.job_reference, payload.internal_reference || '', 
    payload.description || '', new Date().toISOString(), 'Open'
  ]);
  logAudit(userId, 'CREATE_JOB', 'Jobs', id, null, payload.job_reference);
  return { id, message: "Job created successfully" };
}

function updateJob(userId, payload) {
  if (!payload.id) throw new Error("Job ID required");
  const sheet = getSheet('Jobs');
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === payload.id) {
      if (payload.job_reference !== undefined) sheet.getRange(i + 1, 3).setValue(payload.job_reference);
      if (payload.internal_reference !== undefined) sheet.getRange(i + 1, 4).setValue(payload.internal_reference);
      logAudit(userId, 'UPDATE_JOB', 'Jobs', payload.id, null, payload);
      return { id: payload.id, message: "Job updated successfully" };
    }
  }
  throw new Error("Job not found");
}

function createReimbursement(userId, payload) {
  if (!payload.job_id || !payload.client_id || !payload.line_items || payload.line_items.length === 0) {
    throw new Error("Job, Client, and at least one Line Item required");
  }

  const totalAmount = payload.line_items.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
  const id = generateId();
  const now = new Date().toISOString();
  
  getSheet('Reimbursements').appendRow([
    id, payload.job_id, payload.client_id, JSON.stringify(payload.line_items), 
    totalAmount, payload.currency || 'NGN', payload.date_incurred || now, 
    payload.notes || '', 'Pending', userId, now, now
  ]);

  logAudit(userId, 'CREATE_REIMBURSEMENT', 'Reimbursements', id, null, { totalAmount });
  
  return { id, message: "Reimbursement logged successfully" };
}

function updateReimbursement(userId, payload) {
  if (!payload.id || !payload.line_items) throw new Error("Reimbursement ID and Line Items required");
  
  const sheet = getSheet('Reimbursements');
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === payload.id) {
      const totalAmount = payload.line_items.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
      
      sheet.getRange(i + 1, 4).setValue(JSON.stringify(payload.line_items));
      sheet.getRange(i + 1, 5).setValue(totalAmount);
      sheet.getRange(i + 1, 12).setValue(new Date().toISOString()); // updated_at
      
      logAudit(userId, 'UPDATE_REIMBURSEMENT', 'Reimbursements', payload.id, null, { totalAmount });
      return { id: payload.id, message: "Reimbursement updated successfully" };
    }
  }
  throw new Error("Reimbursement not found");
}

function addPayment(userId, payload) {
  if (!payload.reimbursement_id || !payload.amount_received) throw new Error("Reimbursement ID and Amount required");
  
  const id = generateId();
  getSheet('Payments').appendRow([
    id, payload.reimbursement_id, payload.amount_received, payload.date_received || new Date().toISOString(), 
    payload.method || 'Bank Transfer', userId, payload.notes || ''
  ]);
  
  logAudit(userId, 'ADD_PAYMENT', 'Payments', id, null, { amount: payload.amount_received });
  return { id, message: "Payment recorded successfully" };
}

function getSettingsMap() {
  const data = getTableData('Settings');
  const map = {};
  data.forEach(row => { map[row.key] = row.value; });
  return map;
}

function sendReminder(userId, reimbursementId) {
  const reimbursements = getReimbursements();
  const r = reimbursements.find(x => x.id === reimbursementId);
  if (!r) throw new Error("Reimbursement not found");
  
  const outstanding = parseFloat(r.total_amount) - r.amount_paid;
  if (outstanding <= 0) throw new Error("This reimbursement is fully paid.");
  
  const settings = getSettingsMap();
  
  let body = `Hello ${r.client_name},\n\n`;
  body += `This is a gentle reminder regarding an outstanding balance of ${r.currency} ${outstanding.toLocaleString()} for Job Reference: ${r.job_reference}.\n\n`;
  body += `Payment Instructions:\n`;
  body += `Account Name: ${settings['company_name']}\n`;
  body += `Bank: ${settings['bank_name']}\n`;
  body += `Account Number: ${settings['account_number']}\n\n`;
  body += `Thank you for your attention to this matter.`;

  try {
    MailApp.sendEmail({
      to: r.client_email,
      subject: `Reminder: Outstanding Balance - Ref: ${r.job_reference}`,
      body: body
    });
    
    getSheet('EmailLog').appendRow([generateId(), reimbursementId, r.client_email, `Reminder - ${r.job_reference}`, 'Reminder', new Date().toISOString(), 'Success', userId]);
    logAudit(userId, 'SEND_REMINDER', 'Reimbursements', reimbursementId, null, { outstanding });
    return { message: "Reminder sent successfully" };
  } catch (e) {
    getSheet('EmailLog').appendRow([generateId(), reimbursementId, r.client_email, `Reminder - ${r.job_reference}`, 'Reminder', new Date().toISOString(), `Failed: ${e.message}`, userId]);
    throw new Error("Failed to send reminder: " + e.message);
  }
}
