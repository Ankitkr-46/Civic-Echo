'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { 
  Building2, Mic, MicOff, MapPin, Image, Video, 
  Sparkles, Send, RefreshCw, LogOut, CheckCircle2,
  AlertCircle, MessageSquare, ThumbsUp, Bell, Search, ShieldAlert,
  HelpCircle, Globe2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

// Dynamically import Leaflet Map to avoid SSR errors
const DynamicMap = dynamic(() => import('@/components/Map'), { 
  ssr: false,
  loading: () => (
    <div className="h-[260px] w-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center rounded-xl border border-dashed border-slate-300 dark:border-slate-800">
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

interface Complaint {
  id: string;
  citizen_id?: string | null;
  title: string;
  description: string;
  summary: string;
  category: string;
  status: string;
  priority: string;
  location_lat: number;
  location_lng: number;
  location_address: string;
  media_urls: string[];
  created_at: string;
  upvotesCount: number;
  commentsCount: number;
  citizenName: string;
  department?: string | null;
  assigned_to?: string | null;
  upvotesList?: string[]; // array of userIds
}

export default function CitizenDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<Profile | null>(null);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Submission Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [locationLat, setLocationLat] = useState(28.6139); // Default New Delhi
  const [locationLng, setLocationLng] = useState(77.2090);
  const [address, setAddress] = useState('New Delhi, India');
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [voiceUrl, setVoiceUrl] = useState<string | null>(null);
  
  // Voice Dictation
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);

  // AI Live Preview state
  const [aiPreview, setAiPreview] = useState<{
    category: string;
    priority: string;
    summary: string;
    duplicateDetected: boolean;
    confidence: number;
    detectedLanguage: string;
  } | null>(null);
  
  // Feed Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [activeTab, setActiveTab] = useState<'public' | 'my'>('public');

  // UI state variables
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [activeComplaintComments, setActiveComplaintComments] = useState<any[]>([]);
  const [submittingComment, setSubmittingComment] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 1. Auth Validation
  useEffect(() => {
    const session = localStorage.getItem('civic_user_session');
    if (!session) {
      router.push('/auth');
      return;
    }
    const parsedUser = JSON.parse(session);
    setUser(parsedUser);
    
    // Attempt Geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocationLat(position.coords.latitude);
          setLocationLng(position.coords.longitude);
          reverseGeocode(position.coords.latitude, position.coords.longitude);
        },
        (err) => console.log('Geolocation permission denied, defaulting to center.')
      );
    }

    fetchComplaints();
  }, []);

  // 2. Fetch Notifications
  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (data) setNotifications(data);
  };

  const markNotificationsRead = async () => {
    if (!user || !notifications.length) return;
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id);
    
    fetchNotifications();
  };

  // 3. Fetch complaints data
  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/complaints');
      const data = await res.json();
      if (data.complaints) {
        // Also fetch individual upvotes to map toggling
        const mapped = await Promise.all(data.complaints.map(async (comp: any) => {
          const { data: uv } = await supabase
            .from('upvotes')
            .select('user_id')
            .eq('complaint_id', comp.id);
          return {
            ...comp,
            upvotesList: uv?.map((u: any) => u.user_id) || [],
          };
        }));
        setComplaints(mapped);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // 4. Reverse Geocode (Nominatim)
  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await response.json();
      if (data && data.display_name) {
        setAddress(data.display_name);
      } else {
        setAddress(`Coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      }
    } catch (err) {
      setAddress(`Coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    }
  };

  const handleCoordsChange = (newLat: number, newLng: number) => {
    setLocationLat(newLat);
    setLocationLng(newLng);
    reverseGeocode(newLat, newLng);
  };

  // 5. Speech Recognition Setup
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recog = new SpeechRecognition();
        recog.continuous = true;
        recog.interimResults = true;
        recog.lang = 'en-US';

        recog.onresult = (event: any) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }

          if (finalTranscript) {
            setDescription(prev => prev + (prev ? ' ' : '') + finalTranscript);
          }
        };

        recog.onerror = (e: any) => {
          console.error('Speech recognition error:', e);
          setIsRecording(false);
        };

        setRecognition(recog);
      }
    }
  }, []);

  const toggleRecording = () => {
    if (!recognition) {
      // Simulate speech recognition if browser doesn't support it (e.g. Server/mock fallback)
      if (!isRecording) {
        setIsRecording(true);
        setSuccess('Voice engine loaded. Simulating transcription...');
        setTimeout(() => {
          setDescription(prev => prev + (prev ? ' ' : '') + "I want to report a broken water pipeline leaking on the main street near my house. It is flooding the entire block.");
          setIsRecording(false);
        }, 3000);
      } else {
        setIsRecording(false);
      }
      return;
    }

    if (isRecording) {
      recognition.stop();
      setIsRecording(false);
    } else {
      recognition.start();
      setIsRecording(true);
      setSuccess('Speech recognition active. Start speaking now...');
    }
  };

  // 6. Media Mock upload (Base64 conversion)
  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setMediaUrls(prev => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // 7. Debounced / Manual AI Preview Trigger
  const handleAIPreview = async () => {
    if (!title || !description) {
      setError('Provide a title and description first to trigger AI analysis.');
      return;
    }
    setAiLoading(true);
    setError('');
    try {
      // Direct call to local pattern pipeline
      const res = await fetch('/api/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          location_lat: locationLat,
          location_lng: locationLng,
          citizen_id: user?.id,
        })
      });
      // We don't save it yet, we just parse AI prediction
      const data = await res.json();
      if (data.success) {
        setAiPreview({
          category: data.complaint.category,
          priority: data.complaint.priority,
          summary: data.complaint.summary,
          duplicateDetected: data.ai.duplicateDetected,
          confidence: data.ai.confidence,
          detectedLanguage: data.ai.detectedLanguage,
        });
        
        // Clean up the dummy database insert since we only wanted a preview!
        await supabase.from('complaints').delete().eq('id', data.complaint.id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAiLoading(false);
    }
  };

  // 8. Submit Complaint
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError('Title and description are required.');
      return;
    }

    setFormLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          citizen_id: user?.id,
          title: title.trim(),
          description: description.trim(),
          location_lat: locationLat,
          location_lng: locationLng,
          location_address: address,
          media_urls: mediaUrls,
          voice_url: voiceUrl,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to submit complaint.');

      setSuccess('Complaint submitted successfully! AI has routed it to the correct department.');
      
      // Reset form
      setTitle('');
      setDescription('');
      setMediaUrls([]);
      setVoiceUrl(null);
      setAiPreview(null);

      // Refresh complaints and notifications
      fetchComplaints();
      fetchNotifications();
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setFormLoading(false);
    }
  };

  // 9. Upvote toggle handler
  const handleUpvote = async (complaintId: string) => {
    if (!user) return;
    try {
      const response = await fetch(`/api/complaints/${complaintId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upvote',
          userId: user.id,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setComplaints(prev => prev.map(c => {
          if (c.id === complaintId) {
            const list = c.upvotesList || [];
            const isUpvoted = list.includes(user.id);
            return {
              ...c,
              upvotesCount: isUpvoted ? c.upvotesCount - 1 : c.upvotesCount + 1,
              upvotesList: isUpvoted ? list.filter(id => id !== user.id) : [...list, user.id],
            };
          }
          return c;
        }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 10. Comment drawer fetch & post
  const openComments = async (complaintId: string) => {
    if (activeCommentId === complaintId) {
      setActiveCommentId(null);
      return;
    }
    setActiveCommentId(complaintId);
    setCommentText('');
    
    try {
      const res = await fetch(`/api/complaints/${complaintId}`);
      const data = await res.json();
      if (data.comments) {
        setActiveComplaintComments(data.comments);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePostComment = async (complaintId: string) => {
    if (!commentText.trim() || !user) return;
    setSubmittingComment(true);

    try {
      const res = await fetch(`/api/complaints/${complaintId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'comment',
          userId: user.id,
          content: commentText.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setActiveComplaintComments(prev => [...prev, data.comment]);
        setCommentText('');
        
        // Update comments count in list
        setComplaints(prev => prev.map(c => {
          if (c.id === complaintId) {
            return { ...c, commentsCount: c.commentsCount + 1 };
          }
          return c;
        }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('civic_user_session');
    router.push('/auth');
  };

  // Filtering Logic
  const filteredComplaints = complaints.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(search.toLowerCase()) || 
                          c.description.toLowerCase().includes(search.toLowerCase()) ||
                          c.location_address.toLowerCase().includes(search.toLowerCase());
    
    const matchesCategory = selectedCategory === 'All' || c.category === selectedCategory;
    const matchesStatus = selectedStatus === 'All' || c.status === selectedStatus;
    const matchesTab = activeTab === 'public' || (user && c.citizen_id === user.id);

    return matchesSearch && matchesCategory && matchesStatus && matchesTab;
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      
      {/* Top Navigation Panel */}
      <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white px-6 py-4 shadow-md flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-cyan-500 rounded-xl">
            <Building2 className="h-6 w-6 text-slate-900" />
          </div>
          <div>
            <h1 className="font-extrabold text-lg tracking-wide">CivicEcho</h1>
            <p className="text-xs text-slate-400">Citizen Response Portal</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Notifications Trigger */}
          <div className="relative">
            <button 
              onClick={() => {
                setShowNotifications(!showNotifications);
                if (!showNotifications) markNotificationsRead();
              }}
              className="p-2.5 bg-slate-800 border border-slate-700 hover:bg-slate-700 rounded-xl relative transition cursor-pointer"
            >
              <Bell className="h-5 w-5 text-slate-300" />
              {notifications.filter(n => !n.is_read).length > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 bg-rose-500 rounded-full flex items-center justify-center text-[10px] font-bold animate-bounce text-white">
                  {notifications.filter(n => !n.is_read).length}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-3 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-4 text-slate-900 dark:text-white z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3 mb-3">
                  <h3 className="font-bold text-sm">Notifications</h3>
                  <button onClick={() => setShowNotifications(false)} className="text-xs text-slate-400 hover:text-slate-900 dark:hover:text-white">Close</button>
                </div>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4">No notifications yet.</p>
                  ) : (
                    notifications.map(n => (
                      <div key={n.id} className={`p-2.5 rounded-lg text-xs border ${n.is_read ? 'bg-slate-50 dark:bg-slate-900/60 border-slate-100 dark:border-slate-800' : 'bg-cyan-50/50 dark:bg-cyan-950/20 border-cyan-100 dark:border-cyan-900'}`}>
                        <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{n.message}</p>
                        <span className="text-[10px] text-slate-400 block mt-1.5">{new Date(n.created_at).toLocaleDateString()}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="hidden sm:block text-right">
            <p className="font-semibold text-sm">{user?.full_name}</p>
            <p className="text-xs text-slate-400">{user?.phone}</p>
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

      {/* Main Grid View */}
      <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 grid lg:grid-cols-12 gap-8">
        
        {/* Left Column: Submission Panel */}
        <section className="lg:col-span-5 space-y-6">
          
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
            <div className="p-6 bg-slate-900 text-white flex justify-between items-center border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Sparkles className="h-5 w-5 text-cyan-400" />
                <h2 className="font-bold text-lg">Report An Issue</h2>
              </div>
              <span className="text-xs px-2.5 py-1 bg-cyan-500/20 text-cyan-400 rounded-full font-semibold">AI Audited</span>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              
              {/* Error and Success Banners */}
              {error && (
                <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl flex items-start space-x-3 text-sm text-rose-700 dark:text-rose-400">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-xl flex items-start space-x-3 text-sm text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="h-5 w-5 shrink-0" />
                  <span>{success}</span>
                </div>
              )}

              {/* Title input */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Complaint Title</label>
                <input
                  type="text"
                  placeholder="e.g. Sewage water backup in Sector 2"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500"
                  required
                />
              </div>

              {/* Description Input + Speech Dictate Button */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Detailed Description</label>
                  
                  <button
                    type="button"
                    onClick={toggleRecording}
                    className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer ${isRecording ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                  >
                    {isRecording ? (
                      <>
                        <MicOff className="h-3.5 w-3.5" />
                        <span>Recording...</span>
                      </>
                    ) : (
                      <>
                        <Mic className="h-3.5 w-3.5 text-cyan-500" />
                        <span>Dictate with AI</span>
                      </>
                    )}
                  </button>
                </div>
                
                <textarea
                  rows={4}
                  placeholder="Describe the issue. Feel free to speak or type in your native language (Hindi, Spanish, etc.) — our AI will automatically translate and route it!"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
                  required
                />
              </div>

              {/* Leaflet Map coordinates picker */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center space-x-1">
                  <MapPin className="h-4 w-4 text-rose-500" />
                  <span>Pinpoint Location (Drag Marker)</span>
                </label>
                <div className="h-[260px] w-full rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 relative z-10">
                  <DynamicMap lat={locationLat} lng={locationLng} onChange={handleCoordsChange} />
                </div>
                <div className="mt-2.5 p-3 bg-slate-50 dark:bg-slate-950 rounded-xl text-xs text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800 leading-relaxed">
                  <span className="font-bold text-slate-700 dark:text-slate-300">Resolved Address: </span>
                  {address}
                </div>
              </div>

              {/* Media Attachments Dropzone */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Attachments (Images/Videos)</label>
                <div className="grid grid-cols-4 gap-3">
                  <label className="aspect-square bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-xl flex flex-col items-center justify-center cursor-pointer transition">
                    <Image className="h-6 w-6 text-slate-400" />
                    <span className="text-[10px] text-slate-400 mt-1 font-semibold">Upload</span>
                    <input type="file" accept="image/*,video/*" multiple onChange={handleMediaUpload} className="hidden" />
                  </label>
                  
                  {mediaUrls.map((url, index) => (
                    <div key={index} className="aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 relative group">
                      <img src={url} alt="attachment" className="w-full h-full object-cover" />
                      <button 
                        type="button" 
                        onClick={() => setMediaUrls(prev => prev.filter((_, i) => i !== index))}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs font-bold text-white transition"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Preview Section */}
              {aiPreview && (
                <div className="p-4 bg-cyan-50/50 dark:bg-cyan-950/20 border border-cyan-200 dark:border-cyan-900/60 rounded-2xl animate-in zoom-in-95 duration-200 space-y-2 text-xs">
                  <h4 className="font-bold text-cyan-600 dark:text-cyan-400 flex items-center space-x-1.5 uppercase tracking-wider">
                    <Sparkles className="h-4 w-4" />
                    <span>Real-time AI Analysis Preview</span>
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <span className="text-slate-400">Detected Category:</span>
                      <p className="font-bold text-slate-800 dark:text-slate-200">{aiPreview.category}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Predicted Priority:</span>
                      <p className={`font-bold ${aiPreview.priority === 'High' ? 'text-rose-500' : aiPreview.priority === 'Medium' ? 'text-amber-500' : 'text-emerald-500'}`}>
                        {aiPreview.priority}
                      </p>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400">AI Generated Summary:</span>
                    <p className="italic text-slate-600 dark:text-slate-300 mt-0.5">"{aiPreview.summary}"</p>
                  </div>

                  <div className="flex items-center space-x-3 pt-1 border-t border-cyan-100 dark:border-cyan-900/60 text-[10px] text-slate-400">
                    <span className="flex items-center space-x-1">
                      <Globe2 className="h-3 w-3 text-cyan-500" />
                      <span>Language: {aiPreview.detectedLanguage}</span>
                    </span>
                    <span>• Confidence: {Math.round(aiPreview.confidence * 100)}%</span>
                    
                    {aiPreview.duplicateDetected && (
                      <span className="text-amber-500 font-bold flex items-center space-x-0.5 shrink-0 bg-amber-500/10 px-1.5 py-0.5 rounded ml-auto">
                        <ShieldAlert className="h-3 w-3" />
                        <span>Possible Duplicate nearby!</span>
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={handleAIPreview}
                  disabled={aiLoading || formLoading}
                  className="px-4 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-xl text-sm transition cursor-pointer disabled:opacity-50 flex items-center space-x-1.5"
                >
                  {aiLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-cyan-500" />}
                  <span>Test AI</span>
                </button>

                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 py-3 bg-slate-900 dark:bg-cyan-500 text-white dark:text-slate-950 hover:bg-slate-800 dark:hover:bg-cyan-400 font-extrabold rounded-xl shadow-lg transition duration-200 cursor-pointer disabled:opacity-50 flex items-center justify-center space-x-2 text-sm"
                >
                  {formLoading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <span>Submit Complaint</span>
                      <Send className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>

        </section>

        {/* Right Column: Public Feed and Tracking */}
        <section className="lg:col-span-7 space-y-6">
          
          {/* Feed Filter Panel */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 gap-4">
              <div>
                <h2 className="font-extrabold text-xl text-slate-900 dark:text-white">Complaint Feed</h2>
                <p className="text-xs text-slate-400">Track and upvote issues in your neighborhood</p>
              </div>

              {/* Feed Tabs */}
              <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200/50 dark:border-slate-800">
                <button
                  onClick={() => setActiveTab('public')}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${activeTab === 'public' ? 'bg-white dark:bg-slate-900 shadow text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}
                >
                  Public Feed
                </button>
                <button
                  onClick={() => setActiveTab('my')}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${activeTab === 'my' ? 'bg-white dark:bg-slate-900 shadow text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}
                >
                  My Submissions
                </button>
              </div>
            </div>

            {/* Filter controls */}
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search issues..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:ring-1 focus:ring-cyan-500 text-slate-900 dark:text-white"
                />
              </div>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-600 dark:text-slate-300 outline-none cursor-pointer focus:ring-1 focus:ring-cyan-500"
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
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-600 dark:text-slate-300 outline-none cursor-pointer focus:ring-1 focus:ring-cyan-500"
              >
                <option value="All">All Statuses</option>
                <option value="Submitted">Submitted</option>
                <option value="Under Review">Under Review</option>
                <option value="Assigned">Assigned</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
                <option value="Closed">Closed</option>
              </select>
            </div>

          </div>

          {/* Complaints list */}
          <div className="space-y-6">
            {loading ? (
              <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl">
                <RefreshCw className="h-8 w-8 animate-spin text-cyan-500 mx-auto" />
                <p className="text-slate-400 text-sm mt-3">Loading complaints...</p>
              </div>
            ) : filteredComplaints.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl">
                <HelpCircle className="h-10 w-10 text-slate-300 dark:text-slate-700 mx-auto" />
                <p className="text-slate-400 text-sm mt-3 font-semibold">No complaints found</p>
                <p className="text-xs text-slate-500 mt-1">Try resetting your filters or submit a new complaint.</p>
              </div>
            ) : (
              filteredComplaints.map(comp => {
                const isUserUpvoted = user && comp.upvotesList?.includes(user.id);
                return (
                  <article key={comp.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl overflow-hidden transition hover:shadow-2xl flex flex-col">
                    
                    {/* Header */}
                    <div className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800/60 flex justify-between items-start">
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full font-bold text-[10px] uppercase tracking-wider">{comp.category}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${comp.priority === 'High' ? 'bg-rose-500/10 text-rose-500' : comp.priority === 'Medium' ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'}`}>{comp.priority} Priority</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${comp.status === 'Resolved' || comp.status === 'Closed' ? 'bg-emerald-500/10 border-emerald-300 text-emerald-600 dark:text-emerald-400' : 'bg-cyan-500/10 border-cyan-300 text-cyan-600 dark:text-cyan-400'}`}>{comp.status}</span>
                        </div>
                        <h3 className="font-extrabold text-lg text-slate-900 dark:text-white leading-snug">{comp.title}</h3>
                        <p className="text-[10px] text-slate-400">Reported by {comp.citizenName} • {new Date(comp.created_at).toLocaleString()}</p>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 py-4 space-y-4">
                      
                      {/* AI Summary Banner */}
                      {comp.summary && (
                        <div className="p-3 bg-cyan-500/5 border border-cyan-500/15 rounded-xl text-xs italic text-slate-600 dark:text-slate-300 flex items-start space-x-2">
                          <Sparkles className="h-4 w-4 text-cyan-500 shrink-0 mt-0.5 animate-pulse" />
                          <span><strong>AI Summary:</strong> "{comp.summary}"</span>
                        </div>
                      )}

                      <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{comp.description}</p>
                      
                      {/* Attachments */}
                      {comp.media_urls && comp.media_urls.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {comp.media_urls.map((url, idx) => (
                            <div key={idx} className="h-20 w-20 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow">
                              <img src={url} alt="complaint media" className="h-full w-full object-cover cursor-pointer hover:scale-105 transition" onClick={() => window.open(url, '_blank')} />
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Location address mapping indicator */}
                      <div className="flex items-center space-x-1.5 text-xs text-slate-400 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200/50 dark:border-slate-800/80">
                        <MapPin className="h-4 w-4 text-rose-500 shrink-0" />
                        <span className="truncate">{comp.location_address}</span>
                      </div>

                    </div>

                    {/* Footer Actions */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-850 flex justify-between items-center text-xs">
                      
                      <div className="flex items-center space-x-4">
                        {/* Upvote Button ("I have the same issue") */}
                        <button
                          onClick={() => handleUpvote(comp.id)}
                          className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${isUserUpvoted ? 'bg-cyan-500 text-slate-950 shadow' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}
                        >
                          <ThumbsUp className="h-4 w-4 shrink-0" />
                          <span>{comp.upvotesCount}</span>
                          <span className="hidden sm:inline text-[10px] font-normal">{isUserUpvoted ? 'Supported!' : 'Same issue'}</span>
                        </button>

                        {/* Comments Count Trigger */}
                        <button
                          onClick={() => openComments(comp.id)}
                          className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white rounded-xl font-bold transition cursor-pointer"
                        >
                          <MessageSquare className="h-4 w-4 shrink-0" />
                          <span>{comp.commentsCount} Comments</span>
                        </button>
                      </div>

                      {/* Official Routing badge */}
                      {comp.department && (
                        <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-bold bg-cyan-500/10 px-2.5 py-1 rounded-lg">
                          Routed: {comp.department}
                        </span>
                      )}

                    </div>

                    {/* Expanded Comments section */}
                    {activeCommentId === comp.id && (
                      <div className="bg-slate-50 dark:bg-slate-950 border-t border-slate-150 dark:border-slate-850 p-6 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
                        <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400">Discussion Loop</h4>
                        
                        <div className="space-y-3.5 max-h-48 overflow-y-auto pr-1">
                          {activeComplaintComments.length === 0 ? (
                            <p className="text-xs text-slate-400 italic">No comments yet. Start the conversation!</p>
                          ) : (
                            activeComplaintComments.map(comm => (
                              <div key={comm.id} className="text-xs">
                                <div className="flex justify-between items-center">
                                  <span className="font-extrabold text-slate-700 dark:text-slate-300">
                                    {comm.user?.full_name} 
                                    {comm.user?.role === 'admin' && <span className="ml-1.5 bg-cyan-500/20 text-cyan-400 font-bold px-1.5 py-0.2 rounded text-[9px] uppercase">Admin</span>}
                                  </span>
                                  <span className="text-[9px] text-slate-400">{new Date(comm.created_at).toLocaleDateString()}</span>
                                </div>
                                <p className="text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">{comm.content}</p>
                              </div>
                            ))
                          )}
                        </div>

                        {/* New Comment Input */}
                        <div className="flex space-x-2 pt-2 border-t border-slate-200/50 dark:border-slate-800">
                          <input
                            type="text"
                            placeholder="Add your note or support comment..."
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            onKeyDown={(e) => { if(e.key === 'Enter') handlePostComment(comp.id); }}
                            className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-xl text-xs outline-none focus:ring-1 focus:ring-cyan-500 text-slate-900 dark:text-white"
                          />
                          <button
                            onClick={() => handlePostComment(comp.id)}
                            disabled={submittingComment || !commentText.trim()}
                            className="px-3.5 bg-slate-900 dark:bg-cyan-500 text-white dark:text-slate-950 font-bold text-xs rounded-xl hover:bg-slate-800 dark:hover:bg-cyan-400 transition cursor-pointer disabled:opacity-50"
                          >
                            Post
                          </button>
                        </div>

                      </div>
                    )}

                  </article>
                );
              })
            )}
          </div>

        </section>

      </main>

    </div>
  );
}
