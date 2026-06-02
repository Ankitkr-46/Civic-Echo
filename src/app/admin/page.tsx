'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { 
  Building2, RefreshCw, LogOut, CheckCircle2, AlertCircle, 
  MapPin, ShieldAlert, Sparkles, Filter, ChevronRight, BarChart3,
  Calendar, Check, User, ArrowUpRight, HelpCircle
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts';

const DynamicAdminMap = dynamic(() => import('@/components/AdminMap'), { 
  ssr: false,
  loading: () => (
    <div className="h-[340px] w-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center rounded-2xl border border-dashed border-slate-350 dark:border-slate-800">
      <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
    </div>
  )
});

interface Profile {
  id: string;
  phone: string;
  full_name: string;
  role: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [adminUser, setAdminUser] = useState<Profile | null>(null);
  
  // Data States
  const [analytics, setAnalytics] = useState<any>(null);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);
  const [selectedComplaintDetails, setSelectedComplaintDetails] = useState<any>(null);

  // Administrative Action Form
  const [updateStatus, setUpdateStatus] = useState('');
  const [updatePriority, setUpdatePriority] = useState('');
  const [updateDepartment, setUpdateDepartment] = useState('');
  const [updateAssignee, setUpdateAssignee] = useState('');
  const [adminReply, setAdminReply] = useState('');

  // Filtering Controls
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterPriority, setFilterPriority] = useState('All');

  // UI state variables
  const [loading, setLoading] = useState(true);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 1. Authenticate check
  useEffect(() => {
    const session = localStorage.getItem('civic_user_session');
    if (!session) {
      router.push('/auth');
      return;
    }
    const parsed = JSON.parse(session);
    if (parsed.role !== 'admin') {
      router.push('/citizen');
      return;
    }
    setAdminUser(parsed);
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Analytics
      const resAnal = await fetch('/api/analytics');
      const dataAnal = await resAnal.json();
      if (dataAnal.summary) {
        setAnalytics(dataAnal);
      }

      // Fetch Complaints List
      const resComp = await fetch('/api/complaints');
      const dataComp = await resComp.json();
      if (dataComp.complaints) {
        setComplaints(dataComp.complaints);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  // 2. Select Complaint & Open Drawer
  const handleSelectComplaint = async (id: string) => {
    setSelectedComplaintId(id);
    setDrawerLoading(true);
    setSuccess('');
    setError('');
    setAdminReply('');

    try {
      const res = await fetch(`/api/complaints/${id}`);
      const data = await res.json();
      if (data.complaint) {
        setSelectedComplaintDetails(data);
        
        // Populate Admin Actions state from values
        setUpdateStatus(data.complaint.status);
        setUpdatePriority(data.complaint.priority);
        setUpdateDepartment(data.complaint.department || '');
        setUpdateAssignee(data.complaint.assigned_to || '');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDrawerLoading(false);
    }
  };

  // 3. Submit Admin status routing updates
  const handleAdminUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaintId) return;

    setActionLoading(true);
    setError('');
    setSuccess('');

    try {
      // Perform PATCH update
      const response = await fetch(`/api/complaints/${selectedComplaintId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_status',
          status: updateStatus,
          priority: updatePriority,
          department: updateDepartment || null,
          assigned_to: updateAssignee || null,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update complaint.');

      // If admin reply comments are entered, insert it as well
      if (adminReply.trim() && adminUser) {
        await fetch(`/api/complaints/${selectedComplaintId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'comment',
            userId: adminUser.id,
            content: adminReply.trim(),
          }),
        });
      }

      setSuccess('Status and department routing updated successfully.');
      setAdminReply('');
      
      // Reload lists and refresh currently active drawer info
      fetchData();
      handleSelectComplaint(selectedComplaintId);
    } catch (err: any) {
      setError(err.message || 'An error occurred during update.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('civic_user_session');
    router.push('/auth');
  };

  // 4. Formatting Filter list
  const filteredComplaints = complaints.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(search.toLowerCase()) ||
                          c.description.toLowerCase().includes(search.toLowerCase()) ||
                          c.location_address.toLowerCase().includes(search.toLowerCase()) ||
                          c.citizenName.toLowerCase().includes(search.toLowerCase());

    const matchesCategory = filterCategory === 'All' || c.category === filterCategory;
    const matchesStatus = filterStatus === 'All' || c.status === filterStatus;
    const matchesPriority = filterPriority === 'All' || c.priority === filterPriority;

    return matchesSearch && matchesCategory && matchesStatus && matchesPriority;
  });

  // Recharts Colors
  const CHART_COLORS = ['#38bdf8', '#0ea5e9', '#f59e0b', '#f43f5e', '#10b981', '#6366f1', '#a855f7', '#64748b'];

  const categoryChartData = analytics ? Object.entries(analytics.categoryCounts).map(([name, value]) => ({ name, value })) : [];
  const statusChartData = analytics ? Object.entries(analytics.statusCounts).map(([name, value]) => ({ name, value })) : [];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      
      {/* Top Banner Navigation */}
      <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white px-6 py-4 shadow-md flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-cyan-500 rounded-xl">
            <Building2 className="h-6 w-6 text-slate-900" />
          </div>
          <div>
            <h1 className="font-extrabold text-lg tracking-wide">CivicEcho Admin</h1>
            <p className="text-xs text-slate-400">National Integrated Command Center</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="hidden sm:block text-right">
            <p className="font-semibold text-sm text-cyan-400">Director Portal</p>
            <p className="text-xs text-slate-400">{adminUser?.full_name}</p>
          </div>

          <button
            onClick={handleLogout}
            className="p-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl transition cursor-pointer"
            title="Log Out"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      {loading ? (
        <div className="min-h-[80vh] flex flex-col items-center justify-center">
          <RefreshCw className="h-10 w-10 animate-spin text-cyan-500" />
          <p className="text-slate-400 text-sm mt-3 font-semibold">Generating Analytics Dashboard...</p>
        </div>
      ) : (
        <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
          
          {/* Key metrics cards */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg relative overflow-hidden flex flex-col justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Registered</span>
              <h2 className="text-4xl font-extrabold mt-3 text-slate-950 dark:text-white">{analytics?.summary.total}</h2>
              <div className="text-[10px] text-slate-400 mt-2 flex items-center space-x-1">
                <ArrowUpRight className="h-3.5 w-3.5 text-cyan-500" />
                <span>100% active data</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg relative overflow-hidden flex flex-col justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Open Tickets</span>
              <h2 className="text-4xl font-extrabold mt-3 text-slate-950 dark:text-white">{analytics?.summary.open}</h2>
              <div className="text-[10px] text-amber-500 mt-2 flex items-center space-x-1">
                <RefreshCw className="h-3 w-3 animate-spin" />
                <span>Requires routing review</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg relative overflow-hidden flex flex-col justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Resolved & Closed</span>
              <h2 className="text-4xl font-extrabold mt-3 text-slate-950 dark:text-white">{analytics?.summary.resolved}</h2>
              <div className="text-[10px] text-emerald-500 mt-2 flex items-center space-x-1">
                <Check className="h-4 w-4" />
                <span>SLA complete</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg relative overflow-hidden flex flex-col justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Resolution Rate</span>
              <h2 className="text-4xl font-extrabold mt-3 text-slate-950 dark:text-white">{analytics?.summary.resolutionRate}%</h2>
              <div className="w-full bg-slate-100 dark:bg-slate-950 h-1.5 rounded-full mt-3 overflow-hidden">
                <div className="bg-cyan-500 h-full rounded-full" style={{ width: `${analytics?.summary.resolutionRate}%` }}></div>
              </div>
            </div>

          </section>

          {/* Visual Charts panel & Spatial Map */}
          <section className="grid lg:grid-cols-12 gap-8">
            
            {/* Live interactive map */}
            <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xl space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white">Spatial Heat Markers</h3>
                  <p className="text-xs text-slate-400">Live coordinates map of current disruptions</p>
                </div>
                <span className="text-xs px-2 py-0.5 bg-rose-500/10 text-rose-500 rounded font-bold uppercase">Real-time GPS</span>
              </div>
              
              <div className="h-[340px] w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 relative z-10">
                <DynamicAdminMap 
                  locations={filteredComplaints.map(c => ({
                    id: c.id,
                    title: c.title,
                    category: c.category,
                    status: c.status,
                    priority: c.priority,
                    lat: c.location_lat,
                    lng: c.location_lng,
                    address: c.location_address,
                  }))} 
                  onSelect={handleSelectComplaint} 
                />
              </div>
            </div>

            {/* Categorization Recharts Pie */}
            <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xl flex flex-col justify-between space-y-4">
              <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">Disruptions Share</h3>
                <p className="text-xs text-slate-400">Division of complaints by public category</p>
              </div>

              <div className="h-[240px] w-full flex items-center justify-center relative z-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryChartData}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {categoryChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Chart Legend */}
              <div className="grid grid-cols-2 gap-2 text-[10px] pt-3 border-t border-slate-100 dark:border-slate-800/80">
                {categoryChartData.slice(0, 4).map((entry: any, index: number) => (
                  <div key={entry.name} className="flex items-center space-x-1.5 truncate">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[index] }}></span>
                    <span className="text-slate-500 dark:text-slate-400 truncate">{entry.name}: <strong>{entry.value}</strong></span>
                  </div>
                ))}
              </div>
            </div>

          </section>

          {/* Complaints Table & Filters */}
          <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden flex flex-col">
            
            {/* Filter controls */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">Manage Complaints</h3>
                <p className="text-xs text-slate-400">Total matched: {filteredComplaints.length} records</p>
              </div>

              {/* Dynamic search filters */}
              <div className="grid grid-cols-2 md:flex items-center gap-3">
                <input
                  type="text"
                  placeholder="Keyword search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:ring-1 focus:ring-cyan-500 text-slate-900 dark:text-white"
                />

                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="px-2.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-600 dark:text-slate-300 outline-none cursor-pointer focus:ring-1 focus:ring-cyan-500"
                >
                  <option value="All">All Categories</option>
                  <option value="Road Issues">Road Issues</option>
                  <option value="Water Supply">Water Supply</option>
                  <option value="Electricity">Electricity</option>
                  <option value="Garbage & Sanitation">Garbage & Sanitation</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="Education">Education</option>
                  <option value="Public Safety">Public Safety</option>
                  <option value="Other">Other</option>
                </select>

                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-2.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-600 dark:text-slate-300 outline-none cursor-pointer focus:ring-1 focus:ring-cyan-500"
                >
                  <option value="All">All Statuses</option>
                  <option value="Submitted">Submitted</option>
                  <option value="Under Review">Under Review</option>
                  <option value="Assigned">Assigned</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                </select>

                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  className="px-2.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-600 dark:text-slate-300 outline-none cursor-pointer focus:ring-1 focus:ring-cyan-500 animate-in fade-in"
                >
                  <option value="All">All Priorities</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="p-4 pl-6">Complaint ID</th>
                    <th className="p-4">Citizen</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Subject</th>
                    <th className="p-4">Priority</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right pr-6">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredComplaints.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-slate-400 font-semibold">No complaints matched current filters.</td>
                    </tr>
                  ) : (
                    filteredComplaints.map((comp) => (
                      <tr 
                        key={comp.id} 
                        className={`hover:bg-slate-50 dark:hover:bg-slate-900/40 cursor-pointer transition ${selectedComplaintId === comp.id ? 'bg-slate-100 dark:bg-slate-900/60' : ''}`}
                        onClick={() => handleSelectComplaint(comp.id)}
                      >
                        <td className="p-4 pl-6 font-mono text-[10px] text-slate-400 truncate max-w-[80px]">#{comp.id.substring(0, 8)}</td>
                        <td className="p-4">
                          <p className="font-bold text-slate-800 dark:text-slate-200">{comp.citizenName}</p>
                          <p className="text-[10px] text-slate-400">{comp.citizenPhone}</p>
                        </td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded font-bold">{comp.category}</span>
                        </td>
                        <td className="p-4">
                          <p className="font-semibold text-slate-900 dark:text-white max-w-sm truncate">{comp.title}</p>
                          <p className="text-[10px] text-slate-400 truncate max-w-xs">{comp.location_address}</p>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded font-bold ${comp.priority === 'High' ? 'bg-rose-500/10 text-rose-500' : comp.priority === 'Medium' ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'}`}>{comp.priority}</span>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded font-bold border ${comp.status === 'Resolved' || comp.status === 'Closed' ? 'bg-emerald-500/10 border-emerald-300 text-emerald-600 dark:text-emerald-400' : 'bg-cyan-500/10 border-cyan-300 text-cyan-600 dark:text-cyan-400'}`}>{comp.status}</span>
                        </td>
                        <td className="p-4 text-right pr-6">
                          <button className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition text-slate-500 dark:text-slate-300">
                            <ChevronRight className="h-5 w-5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

          </section>

          {/* Admin action detail Drawer / Modal overlay */}
          {selectedComplaintId && selectedComplaintDetails && (
            <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
              
              <div className="w-full max-w-3xl bg-white dark:bg-slate-900 h-full p-6 sm:p-8 flex flex-col justify-between overflow-y-auto shadow-2xl relative animate-in slide-in-from-right duration-300 border-l border-slate-200 dark:border-slate-800">
                
                {/* Header */}
                <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800/80 pb-4">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-1">Incident File Details</span>
                    <h3 className="text-2xl font-extrabold text-slate-950 dark:text-white leading-tight">{selectedComplaintDetails.complaint.title}</h3>
                    <p className="text-[10px] text-slate-400 mt-1">Ticket reference: #{selectedComplaintDetails.complaint.id}</p>
                  </div>
                  <button 
                    onClick={() => { setSelectedComplaintId(null); setSelectedComplaintDetails(null); }}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                  >
                    Close Drawer
                  </button>
                </div>

                {drawerLoading ? (
                  <div className="flex-1 flex flex-col items-center justify-center">
                    <RefreshCw className="h-8 w-8 animate-spin text-cyan-500" />
                  </div>
                ) : (
                  <div className="flex-1 my-6 space-y-6">
                    
                    {/* Grid partition */}
                    <div className="grid md:grid-cols-12 gap-6">
                      
                      {/* Left: General complaint metadata */}
                      <div className="md:col-span-7 space-y-5">
                        
                        <div>
                          <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400">Citizen Report</span>
                          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap mt-2 bg-slate-50 dark:bg-slate-950 p-4 border border-slate-150 dark:border-slate-800/80 rounded-2xl">{selectedComplaintDetails.complaint.description}</p>
                        </div>

                        {/* Attachments slider */}
                        {selectedComplaintDetails.complaint.media_urls && selectedComplaintDetails.complaint.media_urls.length > 0 && (
                          <div>
                            <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 block mb-2">Image / Video Attachments</span>
                            <div className="flex gap-2">
                              {selectedComplaintDetails.complaint.media_urls.map((url: string, index: number) => (
                                <div key={index} className="h-20 w-20 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow">
                                  <img src={url} alt="media" className="h-full w-full object-cover cursor-pointer hover:opacity-80" onClick={() => window.open(url, '_blank')} />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Location maps details */}
                        <div className="space-y-2">
                          <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 block">Incident Coordinates</span>
                          <div className="flex items-center space-x-2 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200/50 dark:border-slate-800/80">
                            <MapPin className="h-4.5 w-4.5 text-rose-500 shrink-0" />
                            <span>{selectedComplaintDetails.complaint.location_address}</span>
                          </div>
                        </div>

                      </div>

                      {/* Right: AI routing support helper */}
                      <div className="md:col-span-5 space-y-5">
                        
                        <div className="p-4 bg-cyan-500/5 border border-cyan-500/15 rounded-2xl space-y-3.5 text-xs">
                          <h4 className="font-bold text-cyan-600 dark:text-cyan-400 flex items-center space-x-1.5 uppercase tracking-wider">
                            <Sparkles className="h-4 w-4" />
                            <span>AI Co-Pilot Helper</span>
                          </h4>

                          <div className="space-y-2">
                            <div>
                              <span className="text-slate-400 block">Recommended Action Group:</span>
                              <p className="font-bold text-slate-800 dark:text-slate-200 text-sm mt-0.5">
                                {selectedComplaintDetails.complaint.category === 'Road Issues' ? 'Public Works Department' :
                                 selectedComplaintDetails.complaint.category === 'Water Supply' ? 'Delhi Water Board' :
                                 selectedComplaintDetails.complaint.category === 'Garbage & Sanitation' ? 'Municipal Sanitation Division' :
                                 selectedComplaintDetails.complaint.category === 'Electricity' ? 'State Electricity Board' : 'General Administration'}
                              </p>
                            </div>
                            
                            <div>
                              <span className="text-slate-400 block">AI Summary Headline:</span>
                              <p className="italic text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">"{selectedComplaintDetails.complaint.summary}"</p>
                            </div>

                            <div className="flex justify-between items-center pt-2 border-t border-cyan-100 dark:border-cyan-900/60 text-[10px] text-slate-400">
                              <span>Confidence: 95%</span>
                              <span className="text-emerald-500 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">Check Complete</span>
                            </div>
                          </div>
                        </div>

                        {/* Citizen Details */}
                        <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded-2xl space-y-2.5 text-xs">
                          <h4 className="font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                            <User className="h-4 w-4 text-slate-500" />
                            <span>Reporting Citizen</span>
                          </h4>
                          <div>
                            <span className="text-slate-400">FullName:</span>
                            <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{selectedComplaintDetails.complaint.citizenName}</p>
                          </div>
                          <div>
                            <span className="text-slate-400">Mobile Phone:</span>
                            <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{selectedComplaintDetails.complaint.citizenPhone}</p>
                          </div>
                        </div>

                      </div>

                    </div>

                    {/* Comment feed timeline */}
                    <div className="border-t border-slate-100 dark:border-slate-800/80 pt-5 space-y-3.5">
                      <h4 className="text-xs uppercase font-extrabold tracking-wider text-slate-400">Incident Activity logs</h4>
                      <div className="space-y-3 max-h-40 overflow-y-auto pr-1">
                        {selectedComplaintDetails.comments.length === 0 ? (
                          <p className="text-xs text-slate-400 italic">No notes logged yet.</p>
                        ) : (
                          selectedComplaintDetails.comments.map((comm: any) => (
                            <div key={comm.id} className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl text-xs border border-slate-200/50 dark:border-slate-850">
                              <div className="flex justify-between items-center text-[10px] text-slate-400">
                                <span className="font-extrabold text-slate-700 dark:text-slate-300">
                                  {comm.user?.full_name} 
                                  {comm.user?.role === 'admin' && <span className="ml-1 px-1 bg-cyan-500/10 text-cyan-400 rounded font-bold">Staff</span>}
                                </span>
                                <span>{new Date(comm.created_at).toLocaleString()}</span>
                              </div>
                              <p className="text-slate-600 dark:text-slate-350 mt-1 leading-relaxed">{comm.content}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Error / Success feedback on submission */}
                    {error && (
                      <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-xs text-rose-700 dark:text-rose-400">
                        {error}
                      </div>
                    )}
                    {success && (
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-xl text-xs text-emerald-700 dark:text-emerald-400">
                        {success}
                      </div>
                    )}

                    {/* Updates routing form panel */}
                    <form onSubmit={handleAdminUpdate} className="p-5 bg-slate-900 border border-slate-800 rounded-3xl space-y-4 text-white text-xs">
                      <h4 className="font-bold flex items-center space-x-1.5 uppercase tracking-wider text-cyan-400">
                        <Calendar className="h-4 w-4" />
                        <span>Update Incident Dispatch Status</span>
                      </h4>

                      <div className="grid sm:grid-cols-2 gap-4">
                        
                        <div>
                          <label className="block text-slate-400 mb-1.5">Action Status</label>
                          <select
                            value={updateStatus}
                            onChange={(e) => setUpdateStatus(e.target.value)}
                            className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl outline-none focus:ring-1 focus:ring-cyan-500 cursor-pointer text-white"
                          >
                            <option value="Submitted">Submitted</option>
                            <option value="Under Review">Under Review</option>
                            <option value="Assigned">Assigned</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Resolved">Resolved</option>
                            <option value="Closed">Closed</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-slate-400 mb-1.5">Priority Rating</label>
                          <select
                            value={updatePriority}
                            onChange={(e) => setUpdatePriority(e.target.value)}
                            className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl outline-none focus:ring-1 focus:ring-cyan-500 cursor-pointer text-white"
                          >
                            <option value="Low">Low Priority</option>
                            <option value="Medium">Medium Priority</option>
                            <option value="High">High Priority</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-slate-400 mb-1.5">Route Department Agency</label>
                          <select
                            value={updateDepartment}
                            onChange={(e) => setUpdateDepartment(e.target.value)}
                            className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl outline-none focus:ring-1 focus:ring-cyan-500 cursor-pointer text-white"
                          >
                            <option value="">Unassigned</option>
                            <option value="Public Works Department (PWD)">Public Works Department (PWD)</option>
                            <option value="Delhi Water Board">Delhi Water Board</option>
                            <option value="State Electricity Board">State Electricity Board</option>
                            <option value="Municipal Corporation Sanitation Division">Municipal Corporation Sanitation Division</option>
                            <option value="Municipal Electrical Department">Municipal Electrical Department</option>
                            <option value="Police & Public Safety">Police & Public Safety</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-slate-400 mb-1.5">Assign Field Officer</label>
                          <input
                            type="text"
                            placeholder="e.g. Engineer S. K. Gupta"
                            value={updateAssignee}
                            onChange={(e) => setUpdateAssignee(e.target.value)}
                            className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl outline-none focus:ring-1 focus:ring-cyan-500 text-white"
                          />
                        </div>

                      </div>

                      <div>
                        <label className="block text-slate-400 mb-1.5">Official Response Note (Sent to Citizen)</label>
                        <textarea
                          rows={2}
                          placeholder="e.g. Service truck dispatched to fix leak, SLA complete within 24 hours."
                          value={adminReply}
                          onChange={(e) => setAdminReply(e.target.value)}
                          className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl outline-none focus:ring-1 focus:ring-cyan-500 resize-none text-white"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={actionLoading}
                        className="w-full py-3 bg-cyan-500 text-slate-950 hover:bg-cyan-400 font-extrabold rounded-xl transition cursor-pointer disabled:opacity-50 flex items-center justify-center space-x-1.5 text-xs uppercase"
                      >
                        {actionLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <span>Apply routing changes</span>}
                      </button>

                    </form>

                  </div>
                )}

              </div>

            </div>
          )}

        </main>
      )}

    </div>
  );
}
